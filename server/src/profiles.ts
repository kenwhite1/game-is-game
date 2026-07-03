import { db } from './db'
import type { Profile, GameStat, ProfileDetail } from '../../shared/types'
import { xpFromOpens, levelInfo, computeBadges } from '../../shared/progression'
import { invitedCount, settleReferral } from './referrals'
import { defaultColor } from '../../shared/avatars'
import { DEFAULT_EQUIP, type Slot } from '../../shared/cosmetics'
import { GAMES } from '../../shared/games'
import { validUsername, normalizeUsername } from '../../shared/username'
import { STARTER_COINS, LAUNCH_BREADTH_REWARD, LAUNCH_BREADTH_CAP } from '../../shared/economy'
import { credit } from './ledger'
import { tickStreak } from './streak'
import { syncAchievements, achievementsSummary } from './achievements'
import { grantSeasonXp } from './season'
import { SEASON_XP } from '../../shared/season'
import { grantAccountXp } from './xp'
import { tickCommunity, settleExpired } from './festival'

interface UserRow {
  id: number
  name: string
  username: string | null
  color: string | null
  face: string | null
  frame: string | null
  hat: string | null
  eyewear: string | null
  effect: string | null
  companion: string | null
  banner: string | null
  title: string | null
  coins: number
  streak_current: number
  streak_best: number
  streak_freezes: number
  account_xp: number
  prestige: number
  friend_code: string | null
  opens: number
  created_at: string
}

const VALID_GAME_IDS = new Set(GAMES.map(g => g.id))

/** true, если ник свободен (регистронезависимо), не считая самого игрока. */
function usernameFree(uname: string, selfId: number): boolean {
  return !db.prepare('SELECT 1 FROM users WHERE lower(username)=lower(?) AND id<>?').get(uname, selfId)
}

/** Занять ник за игроком, если он валиден и свободен. Молча пропускает, если
 *  занят или проигрывает гонку по UNIQUE-индексу — тогда ник останется пустым,
 *  и игрок выберет свой. */
function claimUsername(id: number, raw: string): void {
  const uname = normalizeUsername(raw)
  if (!validUsername(uname) || !usernameFree(uname, id)) return
  try {
    db.prepare('UPDATE users SET username=? WHERE id=?').run(uname, id)
  } catch {
    // столкновение по UNIQUE — оставляем пустым
  }
}

// ─── Код друга ───────────────────────────────────────────────────────────
// Без похожих символов (0/O, 1/I), чтобы код легко диктовать и набирать.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function randomCode(len = 6): string {
  let s = ''
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  return s
}

/** Гарантирует у пользователя уникальный код друга, создаёт при отсутствии. */
function ensureFriendCode(id: number, existing: string | null): string {
  if (existing) return existing
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = randomCode()
    try {
      db.prepare('UPDATE users SET friend_code=? WHERE id=? AND friend_code IS NULL').run(code, id)
      const row = db.prepare('SELECT friend_code FROM users WHERE id=?').get(id) as { friend_code: string | null }
      if (row?.friend_code) return row.friend_code
    } catch {
      // столкновение по UNIQUE — пробуем другой код
    }
  }
  // Крайне маловероятный фолбэк: код на основе id, всё ещё уникальный.
  const fallback = `GG${id.toString(36).toUpperCase()}`.slice(0, 10)
  db.prepare('UPDATE users SET friend_code=? WHERE id=?').run(fallback, id)
  return fallback
}

export function userExists(id: number): boolean {
  return !!db.prepare('SELECT 1 FROM users WHERE id=?').get(id)
}

export function getOrCreateUser(id: number, name: string, username?: string): UserRow {
  const existing = db.prepare('SELECT * FROM users WHERE id=?').get(id) as UserRow | undefined
  if (existing) {
    db.prepare("UPDATE users SET name=?, last_seen=datetime('now') WHERE id=?").run(name, id)
    existing.name = name
    existing.friend_code = ensureFriendCode(id, existing.friend_code)
    if (!existing.color) {
      const c = defaultColor(id)
      db.prepare('UPDATE users SET color=? WHERE id=?').run(c, id)
      existing.color = c
    }
    // Игрок мог завести @username в Telegram уже после регистрации — подхватим,
    // но только если он ещё не выбрал собственный ник (его не перетираем).
    if (!existing.username && username) {
      claimUsername(id, username)
      existing.username = (db.prepare('SELECT username FROM users WHERE id=?').get(id) as { username: string | null }).username
    }
    return existing
  }
  const color = defaultColor(id)
  // Вставляем без ника, затем пытаемся занять @username из Telegram — так
  // конфликт по UNIQUE не роняет регистрацию (ник просто останется пустым).
  // Вставляем с нулём монет, затем начисляем стартовый бонус через ledger,
  // чтобы даже регистрационные монеты были аудируемой строкой в coin_ledger.
  db.prepare(
    "INSERT INTO users (id, name, color, coins, last_seen) VALUES (?,?,?,0,datetime('now'))",
  ).run(id, name, color)
  ensureFriendCode(id, null)
  credit(id, STARTER_COINS, 'signup')
  if (username) claimUsername(id, username)
  return db.prepare('SELECT * FROM users WHERE id=?').get(id) as UserRow
}

export function toProfile(u: UserRow): Profile {
  // XP уровня аккаунта развязан от «запусков» (§5): читаем account_xp (бэкфилл
  // сохранил прежний уровень), а не opens*25.
  const xp = u.account_xp ?? 0
  return {
    id: u.id,
    name: u.name,
    username: u.username || '',
    color: u.color || defaultColor(u.id),
    face: u.face || DEFAULT_EQUIP.face,
    frame: u.frame || DEFAULT_EQUIP.frame,
    hat: u.hat || DEFAULT_EQUIP.hat,
    eyewear: u.eyewear || DEFAULT_EQUIP.eyewear,
    effect: u.effect || DEFAULT_EQUIP.effect,
    companion: u.companion || DEFAULT_EQUIP.companion,
    banner: u.banner || DEFAULT_EQUIP.banner,
    title: u.title || DEFAULT_EQUIP.title,
    coins: u.coins ?? 0,
    streak: u.streak_current ?? 0,
    streakBest: u.streak_best ?? 0,
    freezes: u.streak_freezes ?? 0,
    opens: u.opens,
    xp,
    level: levelInfo(xp).level,
    prestige: u.prestige ?? 0,
    friendCode: u.friend_code ?? '',
    joinedAt: u.created_at,
  }
}

/** Заработанные значки (id) игрока — для расчёта открытия косметики. */
export function badgeSet(id: number): Set<string> {
  const profile = getProfile(id)
  if (!profile) return new Set()
  const stats = gameStats(id)
  const distinctGames = stats.filter(s => s.opens > 0).length
  const friends = friendCount(id)
  const invited = invitedCount(id)
  const badges = computeBadges({ opens: profile.opens, distinctGames, friends, level: profile.level, invited })
  return new Set(badges.filter(b => b.earned).map(b => b.id))
}

/** Что надето сейчас, по всем слотам (с дефолтами для пустых). */
export function equippedOf(id: number): Record<Slot, string> {
  const u = db
    .prepare('SELECT color, face, frame, hat, eyewear, effect, companion, banner, title FROM users WHERE id=?')
    .get(id) as Record<string, string | null> | undefined
  return {
    color: u?.color || defaultColor(id),
    face: u?.face || DEFAULT_EQUIP.face,
    frame: u?.frame || DEFAULT_EQUIP.frame,
    hat: u?.hat || DEFAULT_EQUIP.hat,
    eyewear: u?.eyewear || DEFAULT_EQUIP.eyewear,
    effect: u?.effect || DEFAULT_EQUIP.effect,
    companion: u?.companion || DEFAULT_EQUIP.companion,
    banner: u?.banner || DEFAULT_EQUIP.banner,
    title: u?.title || DEFAULT_EQUIP.title,
  }
}

export function getProfile(id: number): Profile | null {
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(id) as UserRow | undefined
  if (!u) return null
  // Старые записи могли появиться до миграции хаба — донастроим на лету.
  if (!u.friend_code) u.friend_code = ensureFriendCode(id, null)
  if (!u.color) {
    u.color = defaultColor(id)
    db.prepare('UPDATE users SET color=? WHERE id=?').run(u.color, id)
  }
  return toProfile(u)
}

/** Выбрать ник — доступно, только пока у игрока ника нет (у кого есть @username
 *  из Telegram, ник фиксирован). Ник уникален (регистронезависимо). Аватар и
 *  прочая косметика — через equip (там проверяется владение). */
export function setUsername(id: number, raw: string): { profile: Profile } | { error: string } {
  const current = db.prepare('SELECT username FROM users WHERE id=?').get(id) as { username: string | null } | undefined
  if (!current) return { error: 'not_found' }
  if (current.username) return { error: 'username_locked' }
  const uname = normalizeUsername(raw)
  if (!validUsername(uname)) return { error: 'bad_username' }
  if (!usernameFree(uname, id)) return { error: 'username_taken' }
  try {
    db.prepare('UPDATE users SET username=? WHERE id=?').run(uname, id)
  } catch {
    return { error: 'username_taken' }
  }
  const profile = getProfile(id)
  return profile ? { profile } : { error: 'not_found' }
}

// Record that a player launched a game and return their updated profile.
export function recordOpen(id: number, gameId: string): Profile {
  // Если игрок впервые появляется через /open (а не /auth), заводим запись и
  // начисляем стартовый бонус через ledger.
  const created = db.prepare("INSERT OR IGNORE INTO users (id, name, coins) VALUES (?, 'Игрок', 0)").run(id)
  if (created.changes > 0) credit(id, STARTER_COINS, 'signup')

  // Награда за ШИРОТУ (§4.2 библии): монеты даём за первый за день запуск игры,
  // которую сегодня ещё не открывали, и только пока не набрано LAUNCH_BREADTH_CAP
  // РАЗНЫХ игр за день. Повторные запуски той же игры и запуск-спам не платят.
  const openedThisGameToday = db
    .prepare("SELECT 1 FROM opens WHERE user_id=? AND game_id=? AND date(ts)=date('now')")
    .get(id, gameId)
  const distinctToday = (db
    .prepare("SELECT COUNT(DISTINCT game_id) AS n FROM opens WHERE user_id=? AND date(ts)=date('now')")
    .get(id) as { n: number }).n

  db.prepare('INSERT INTO opens (user_id, game_id) VALUES (?,?)').run(id, gameId)
  // last_seen must advance on every launch (friends ordering + «в сети»).
  db.prepare("UPDATE users SET opens=opens+1, last_seen=datetime('now') WHERE id=?").run(id)

  if (!openedThisGameToday && distinctToday < LAUNCH_BREADTH_CAP) {
    credit(id, LAUNCH_BREADTH_REWARD, 'launch_breadth', gameId)
    grantSeasonXp(id, SEASON_XP.launchBreadth)
    grantAccountXp(id, SEASON_XP.launchBreadth)
  }
  // Серия дня: первый заход за день продвигает streak и платит награду/вехи.
  const st = tickStreak(id)
  if (st.ticked) { grantSeasonXp(id, SEASON_XP.streakDay); grantAccountXp(id, SEASON_XP.streakDay) }
  // Достижения широты/коллекции могли продвинуться — синкаем (идемпотентно).
  syncAchievements(id)
  // События: тикаем общую цель и конвертируем токены завершившихся событий.
  tickCommunity(1)
  settleExpired(id)
  // Отложенная реферальная награда — выплачиваем, если новичок наиграл минимум.
  settleReferral(id)

  return getProfile(id)!
}

// Distinct game ids, most recently opened first (for the "Недавнее" highlight).
export function recentGames(id: number, limit = 4): string[] {
  const rows = db
    .prepare('SELECT game_id, MAX(id) AS last FROM opens WHERE user_id=? GROUP BY game_id ORDER BY last DESC LIMIT ?')
    .all(id, limit) as { game_id: string; last: number }[]
  return rows.map(r => r.game_id).filter(g => VALID_GAME_IDS.has(g))
}

/** Запуски по каждой игре (для статистики профиля), от частых к редким. */
export function gameStats(id: number): GameStat[] {
  const rows = db
    .prepare('SELECT game_id AS id, COUNT(*) AS opens FROM opens WHERE user_id=? GROUP BY game_id')
    .all(id) as { id: string; opens: number }[]
  const byId = new Map(rows.filter(r => VALID_GAME_IDS.has(r.id)).map(r => [r.id, r.opens]))
  // Все игры в стабильном порядке каталога, даже с нулём запусков.
  return GAMES.map(g => ({ id: g.id, opens: byId.get(g.id) ?? 0 })).sort((a, b) => b.opens - a.opens)
}

export function friendCount(id: number): number {
  const r = db.prepare('SELECT COUNT(*) AS n FROM friendships WHERE user_id=?').get(id) as { n: number }
  return r.n
}

/** Профиль + статистика + значки для экрана «Профиль». */
export function profileDetail(id: number): ProfileDetail | null {
  const profile = getProfile(id)
  if (!profile) return null
  const stats = gameStats(id)
  const friends = friendCount(id)
  const invited = invitedCount(id)
  const distinctGames = stats.filter(s => s.opens > 0).length
  const badges = computeBadges({ opens: profile.opens, distinctGames, friends, level: profile.level, invited })
  return { profile, stats, badges, friendCount: friends, invited, achievements: achievementsSummary(id) }
}
