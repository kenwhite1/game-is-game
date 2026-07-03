import { db } from './db'
import type { Friend, ActivityItem, LeaderRow } from '../../shared/types'
import { levelInfo } from '../../shared/progression'
import { defaultColor } from '../../shared/avatars'
import { DEFAULT_EQUIP, type Look } from '../../shared/cosmetics'
import { getProfile } from './profiles'
import { invitedCount } from './referrals'
import { presenceOf } from './presence'
import { credit, debit } from './ledger'
import { GAMES } from '../../shared/games'

const VALID_GAME_IDS = new Set(GAMES.map(g => g.id))

// Колонки образа, которые тянем во всех соц-выборках.
const LOOK_COLS = 'u.color, u.face, u.frame, u.hat, u.eyewear, u.effect, u.companion'
interface LookRow {
  color: string | null; face: string | null; frame: string | null; hat: string | null
  eyewear: string | null; effect: string | null; companion: string | null
}
function lookOf(r: LookRow, seed: number): Look {
  return {
    color: r.color || defaultColor(seed),
    face: r.face || DEFAULT_EQUIP.face,
    frame: r.frame || DEFAULT_EQUIP.frame,
    hat: r.hat || DEFAULT_EQUIP.hat,
    eyewear: r.eyewear || DEFAULT_EQUIP.eyewear,
    effect: r.effect || DEFAULT_EQUIP.effect,
    companion: r.companion || DEFAULT_EQUIP.companion,
  }
}

export type AddFriendResult =
  | { ok: true; friend: Friend }
  | { ok: false; reason: 'not_found' | 'self' | 'already' }

/** Добавить друга по коду. Дружба взаимная: пишем обе стороны в транзакции. */
export function addFriendByCode(uid: number, rawCode: string): AddFriendResult {
  const code = rawCode.trim().toUpperCase()
  if (!code) return { ok: false, reason: 'not_found' }
  const target = db.prepare('SELECT id FROM users WHERE friend_code=?').get(code) as { id: number } | undefined
  if (!target) return { ok: false, reason: 'not_found' }
  if (target.id === uid) return { ok: false, reason: 'self' }
  const existing = db
    .prepare('SELECT 1 FROM friendships WHERE user_id=? AND friend_id=?')
    .get(uid, target.id)
  if (existing) return { ok: false, reason: 'already' }

  db.transaction(() => {
    const ins = db.prepare('INSERT OR IGNORE INTO friendships (user_id, friend_id) VALUES (?,?)')
    ins.run(uid, target.id)
    ins.run(target.id, uid)
  })()

  const friend = friendsOf(uid).find(f => f.id === target.id)
  return friend ? { ok: true, friend } : { ok: false, reason: 'not_found' }
}

export function removeFriend(uid: number, friendId: number): void {
  db.transaction(() => {
    const del = db.prepare('DELETE FROM friendships WHERE user_id=? AND friend_id=?')
    del.run(uid, friendId)
    del.run(friendId, uid)
  })()
}

/** Список друзей с образом, уровнем и последней игрой, недавно активные выше. */
export function friendsOf(uid: number): Friend[] {
  const rows = db
    .prepare(
      `SELECT u.id, u.name, ${LOOK_COLS}, u.account_xp, u.last_seen,
              (SELECT game_id FROM opens o WHERE o.user_id=u.id ORDER BY o.id DESC LIMIT 1) AS last_game
         FROM friendships f
         JOIN users u ON u.id = f.friend_id
        WHERE f.user_id = ?
        ORDER BY u.last_seen DESC NULLS LAST, u.id DESC`,
    )
    .all(uid) as (LookRow & { id: number; name: string; account_xp: number; last_seen: string | null; last_game: string | null })[]
  const live = presenceOf(rows.map(r => r.id))
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    look: lookOf(r, r.id),
    level: levelInfo(r.account_xp).level,
    lastGame: r.last_game && VALID_GAME_IDS.has(r.last_game) ? r.last_game : null,
    lastSeen: r.last_seen,
    playing: live.get(r.id) ?? null,
  }))
}

/** Лента: последние запуски игр у меня и моих друзей, свежие первыми. */
export function activityFeed(uid: number, limit = 30): ActivityItem[] {
  const rows = db
    .prepare(
      `SELECT o.id, o.user_id, o.game_id, o.ts, u.name, ${LOOK_COLS}
         FROM opens o
         JOIN users u ON u.id = o.user_id
        WHERE o.user_id = ?
           OR o.user_id IN (SELECT friend_id FROM friendships WHERE user_id = ?)
        ORDER BY o.id DESC
        LIMIT ?`,
    )
    .all(uid, uid, limit) as (LookRow & { id: number; user_id: number; game_id: string; ts: string; name: string })[]
  const launches: ActivityItem[] = rows
    .filter(r => VALID_GAME_IDS.has(r.game_id))
    .map(r => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      look: lookOf(r, r.user_id),
      gameId: r.game_id,
      ts: r.ts,
    }))

  // Мета-события (достижения/серии) друзей и свои — «лучшая реклама» мета-слоя.
  const meta = db
    .prepare(
      `SELECT f.id, f.user_id, f.kind, f.text, f.ts, u.name, ${LOOK_COLS}
         FROM feed_events f JOIN users u ON u.id=f.user_id
        WHERE f.user_id = ?
           OR f.user_id IN (SELECT friend_id FROM friendships WHERE user_id = ?)
        ORDER BY f.id DESC LIMIT ?`,
    )
    .all(uid, uid, limit) as (LookRow & { id: number; user_id: number; kind: string; text: string; ts: string; name: string })[]
  const metaItems: ActivityItem[] = meta.map(r => ({
    id: r.id + 1_000_000_000, // отдельное id-пространство, чтобы не пересекалось с opens
    userId: r.user_id,
    name: r.name,
    look: lookOf(r, r.user_id),
    gameId: '',
    ts: r.ts,
    kind: r.kind,
    text: r.text,
  }))

  return [...launches, ...metaItems]
    .sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0))
    .slice(0, limit)
}

/** Таблица лидеров: я и мои друзья по опыту, от большего к меньшему. */
export function leaderboard(uid: number, limit = 20): LeaderRow[] {
  const rows = db
    .prepare(
      `SELECT u.id, u.name, ${LOOK_COLS}, u.account_xp
         FROM users u
        WHERE u.id = ?
           OR u.id IN (SELECT friend_id FROM friendships WHERE user_id = ?)
        ORDER BY u.account_xp DESC, u.id ASC
        LIMIT ?`,
    )
    .all(uid, uid, limit) as (LookRow & { id: number; name: string; account_xp: number })[]
  return rows.map(r => {
    const xp = r.account_xp
    return {
      id: r.id,
      name: r.name,
      look: lookOf(r, r.id),
      level: levelInfo(xp).level,
      xp,
      isMe: r.id === uid,
    }
  })
}

// ─── Подарки ─────────────────────────────────────────────────────────────

export const GIFT_MIN = 10
export const GIFT_MAX = 1000
export const GIFTS_PER_DAY = 5

export type GiftResult =
  | { ok: true; amount: number }
  | { ok: false; reason: 'bad_amount' | 'not_friends' | 'too_poor' | 'limit' }

/** Подарить Game другу. Перевод, а не эмиссия: монеты списываются у дарителя. */
export function giftCoins(uid: number, friendId: number, amount: number): GiftResult {
  if (!Number.isInteger(amount) || amount < GIFT_MIN || amount > GIFT_MAX) {
    return { ok: false, reason: 'bad_amount' }
  }
  const isFriend = db.prepare('SELECT 1 FROM friendships WHERE user_id=? AND friend_id=?').get(uid, friendId)
  if (!isFriend) return { ok: false, reason: 'not_friends' }
  const sentToday = (db
    .prepare("SELECT COUNT(*) AS n FROM gifts WHERE from_id=? AND date(ts)=date('now')")
    .get(uid) as { n: number }).n
  if (sentToday >= GIFTS_PER_DAY) return { ok: false, reason: 'limit' }

  let result: GiftResult = { ok: true, amount }
  db.transaction(() => {
    // Списание с проверкой баланса через ledger: атомарно и с записью причины.
    if (!debit(uid, amount, 'gift_out', `to:${friendId}`)) {
      result = { ok: false, reason: 'too_poor' }
      return
    }
    credit(friendId, amount, 'gift_in', `from:${uid}`)
    db.prepare('INSERT INTO gifts (from_id, to_id, amount) VALUES (?,?,?)').run(uid, friendId, amount)
  })()
  return result
}

/** Сводка для соц-вкладок одним запросом. */
export function socialSnapshot(uid: number) {
  getProfile(uid) // гарантируем код друга и аватар у текущего игрока
  return {
    friends: friendsOf(uid),
    activity: activityFeed(uid),
    leaderboard: leaderboard(uid),
    invited: invitedCount(uid),
  }
}

// ─── Вызов другу (§15.2) ─────────────────────────────────────────────────
export const CHALLENGE_REWARD = 40

/** Принять вызов: наградить обоих (один раз за пару+игру+день). */
export function acceptChallenge(uid: number, fromId: number, gameId: string): { ok: boolean; reward?: number; reason?: string } {
  if (!Number.isInteger(fromId) || fromId === uid) return { ok: false, reason: 'bad' }
  if (!VALID_GAME_IDS.has(gameId)) return { ok: false, reason: 'bad' }
  if (!db.prepare('SELECT 1 FROM users WHERE id=?').get(fromId)) return { ok: false, reason: 'bad' }
  const day = new Date().toISOString().slice(0, 10)
  let ok = false
  db.transaction(() => {
    const ins = db.prepare('INSERT OR IGNORE INTO challenges (from_id, to_id, game_id, day, ts) VALUES (?,?,?,?,?)')
      .run(fromId, uid, gameId, day, Date.now())
    if (ins.changes === 0) return // уже награждали сегодня — не фармим
    credit(uid, CHALLENGE_REWARD, 'challenge', `from:${fromId}`)
    credit(fromId, CHALLENGE_REWARD, 'challenge', `to:${uid}`)
    ok = true
  })()
  return ok ? { ok: true, reward: CHALLENGE_REWARD } : { ok: false, reason: 'done' }
}
