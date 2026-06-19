import { db } from './db'
import type { Profile, GameStat, ProfileDetail } from '../../shared/types'
import { xpFromOpens, levelInfo, computeBadges } from '../../shared/progression'
import { defaultAvatar, avatarOf } from '../../shared/avatars'
import { DEFAULT_EQUIP, type Slot } from '../../shared/cosmetics'
import { GAMES } from '../../shared/games'

interface UserRow {
  id: number
  name: string
  username: string | null
  avatar: string | null
  frame: string | null
  hat: string | null
  eyewear: string | null
  effect: string | null
  companion: string | null
  banner: string | null
  title: string | null
  coins: number
  friend_code: string | null
  opens: number
  created_at: string
}

const VALID_GAME_IDS = new Set(GAMES.map(g => g.id))

/** Экономика Game: бонус за регистрацию и заработок за запуск игры. */
export const STARTER_COINS = 300
export const COINS_PER_OPEN = 25

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

export function getOrCreateUser(id: number, name: string, username?: string): UserRow {
  const existing = db.prepare('SELECT * FROM users WHERE id=?').get(id) as UserRow | undefined
  if (existing) {
    db.prepare("UPDATE users SET name=?, last_seen=datetime('now') WHERE id=?").run(name, id)
    existing.name = name
    existing.friend_code = ensureFriendCode(id, existing.friend_code)
    if (!existing.avatar) {
      const a = defaultAvatar(id)
      db.prepare('UPDATE users SET avatar=? WHERE id=?').run(a, id)
      existing.avatar = a
    }
    return existing
  }
  const avatar = defaultAvatar(id)
  db.prepare(
    "INSERT INTO users (id, name, username, avatar, coins, last_seen) VALUES (?,?,?,?,?,datetime('now'))",
  ).run(id, name, username ?? null, avatar, STARTER_COINS)
  ensureFriendCode(id, null)
  return db.prepare('SELECT * FROM users WHERE id=?').get(id) as UserRow
}

export function toProfile(u: UserRow): Profile {
  const xp = xpFromOpens(u.opens)
  return {
    id: u.id,
    name: u.name,
    avatar: avatarOf(u.avatar, u.id).id,
    frame: u.frame || DEFAULT_EQUIP.frame,
    hat: u.hat || DEFAULT_EQUIP.hat,
    eyewear: u.eyewear || DEFAULT_EQUIP.eyewear,
    effect: u.effect || DEFAULT_EQUIP.effect,
    companion: u.companion || DEFAULT_EQUIP.companion,
    banner: u.banner || DEFAULT_EQUIP.banner,
    title: u.title || DEFAULT_EQUIP.title,
    coins: u.coins ?? 0,
    opens: u.opens,
    xp,
    level: levelInfo(xp).level,
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
  const badges = computeBadges({ opens: profile.opens, distinctGames, friends, level: profile.level })
  return new Set(badges.filter(b => b.earned).map(b => b.id))
}

/** Что надето сейчас, по всем слотам (с дефолтами для пустых). */
export function equippedOf(id: number): Record<Slot, string> {
  const u = db
    .prepare('SELECT avatar, frame, hat, eyewear, effect, companion, banner, title FROM users WHERE id=?')
    .get(id) as Record<string, string | null> | undefined
  return {
    avatar: avatarOf(u?.avatar, id).id,
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
  if (!u.avatar) {
    u.avatar = defaultAvatar(id)
    db.prepare('UPDATE users SET avatar=? WHERE id=?').run(u.avatar, id)
  }
  return toProfile(u)
}

/** Сменить отображаемое имя. Аватар и прочая косметика — через equip (там
 *  проверяется владение), чтобы нельзя было надеть запертый предмет в обход. */
export function updateProfile(id: number, patch: { name?: string }): Profile | null {
  const name = patch.name?.trim().slice(0, 40)
  if (name) db.prepare('UPDATE users SET name=? WHERE id=?').run(name, id)
  return getProfile(id)
}

// Record that a player launched a game and return their updated profile.
export function recordOpen(id: number, gameId: string): Profile {
  // Если игрок впервые появляется через /open (а не /auth), всё равно даём
  // стартовый баланс — чтобы экономика была одинаковой на любом пути входа.
  db.prepare("INSERT OR IGNORE INTO users (id, name, coins) VALUES (?, 'Игрок', ?)").run(id, STARTER_COINS)
  db.prepare('INSERT INTO opens (user_id, game_id) VALUES (?,?)').run(id, gameId)
  // last_seen must advance on every launch (friends ordering + «в сети»),
  // and each launch pays out Game coins to feed the cosmetics economy.
  db.prepare("UPDATE users SET opens=opens+1, coins=coins+?, last_seen=datetime('now') WHERE id=?").run(COINS_PER_OPEN, id)
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
  const distinctGames = stats.filter(s => s.opens > 0).length
  const badges = computeBadges({ opens: profile.opens, distinctGames, friends, level: profile.level })
  return { profile, stats, badges, friendCount: friends }
}
