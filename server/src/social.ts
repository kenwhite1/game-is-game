import { db } from './db'
import type { Friend, ActivityItem, LeaderRow } from '../../shared/types'
import { xpFromOpens, levelInfo } from '../../shared/progression'
import { defaultColor } from '../../shared/avatars'
import { DEFAULT_EQUIP, type Look } from '../../shared/cosmetics'
import { getProfile } from './profiles'
import { invitedCount } from './referrals'
import { presenceOf } from './presence'
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
      `SELECT u.id, u.name, ${LOOK_COLS}, u.opens, u.last_seen,
              (SELECT game_id FROM opens o WHERE o.user_id=u.id ORDER BY o.id DESC LIMIT 1) AS last_game
         FROM friendships f
         JOIN users u ON u.id = f.friend_id
        WHERE f.user_id = ?
        ORDER BY u.last_seen DESC NULLS LAST, u.id DESC`,
    )
    .all(uid) as (LookRow & { id: number; name: string; opens: number; last_seen: string | null; last_game: string | null })[]
  const live = presenceOf(rows.map(r => r.id))
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    look: lookOf(r, r.id),
    level: levelInfo(xpFromOpens(r.opens)).level,
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
  return rows
    .filter(r => VALID_GAME_IDS.has(r.game_id))
    .map(r => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      look: lookOf(r, r.user_id),
      gameId: r.game_id,
      ts: r.ts,
    }))
}

/** Таблица лидеров: я и мои друзья по опыту, от большего к меньшему. */
export function leaderboard(uid: number, limit = 20): LeaderRow[] {
  const rows = db
    .prepare(
      `SELECT u.id, u.name, ${LOOK_COLS}, u.opens
         FROM users u
        WHERE u.id = ?
           OR u.id IN (SELECT friend_id FROM friendships WHERE user_id = ?)
        ORDER BY u.opens DESC, u.id ASC
        LIMIT ?`,
    )
    .all(uid, uid, limit) as (LookRow & { id: number; name: string; opens: number })[]
  return rows.map(r => {
    const xp = xpFromOpens(r.opens)
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
    // Списание с проверкой баланса одним UPDATE: без гонки двух запросов.
    const r = db.prepare('UPDATE users SET coins=coins-? WHERE id=? AND coins>=?').run(amount, uid, amount)
    if (r.changes === 0) {
      result = { ok: false, reason: 'too_poor' }
      return
    }
    db.prepare('UPDATE users SET coins=coins+? WHERE id=?').run(amount, friendId)
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
