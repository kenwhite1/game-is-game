import { db } from './db'
import { GAMES, CATEGORIES } from '../../shared/games'
import type { Quest } from '../../shared/types'
import { credit } from './ledger'
import { grantSeasonXp } from './season'
import { SEASON_XP } from '../../shared/season'
import { grantAccountXp } from './xp'

// ─── Квесты 2.0 (§8) ──────────────────────────────────────────────────────
// Персональная выдача: у каждого игрока свой набор из 3 дневных + 3 недельных
// заданий (детерминированно по uid+период), с бакетным разбросом типов, один
// бесплатный реролл в день и бонус за полный набор. Прогресс считается на лету
// из opens/match_results (окно — сегодня / с понедельника). Пока игры не
// рапортуют матчи через SDK, дневные квесты завязаны на ЗАПУСКИ/действия, чтобы
// оставаться выполнимыми уже сейчас; победные метрики копятся для будущего.

const GAME_CAT = new Map<string, string>(GAMES.map(g => [g.id, g.category]))
const GAMES_BY_CAT = new Map<string, string[]>(CATEGORIES.map(c => [c.id, GAMES.filter(g => g.category === c.id).map(g => g.id)]))

// Награды (§4.2 / Appendix A).
const DAILY_BONUS = 50
const WEEKLY_BONUS = 200
const REROLL_COST = 50

type Bucket = 'engage' | 'category' | 'meta'
interface QuestDef {
  id: string
  title: string
  emoji: string
  target: number
  reward: number
  bucket: Bucket
  /** since — нижняя граница окна (дата 'YYYY-MM-DD', включительно). */
  progress(uid: number, since: string): number
}

function scalar(sql: string): (uid: number, since: string, extra?: unknown[]) => number {
  const stmt = db.prepare(sql)
  return (uid, since, extra = []) => (stmt.get(uid, since, ...extra) as { n: number }).n
}

const opensCount = scalar("SELECT COUNT(*) AS n FROM opens WHERE user_id=? AND date(ts) >= ?")
const distinctGames = scalar("SELECT COUNT(DISTINCT game_id) AS n FROM opens WHERE user_id=? AND date(ts) >= ?")
const distinctDays = scalar("SELECT COUNT(DISTINCT date(ts)) AS n FROM opens WHERE user_id=? AND date(ts) >= ?")
const ratedCount = scalar("SELECT COUNT(*) AS n FROM ratings WHERE user_id=? AND date(updated_at) >= ?")
const favedCount = scalar("SELECT COUNT(*) AS n FROM favorites WHERE user_id=? AND date(created_at) >= ?")

/** Сколько запусков в жанре (за окно). */
function catPlayed(catId: string): (uid: number, since: string) => number {
  const ids = GAMES_BY_CAT.get(catId) ?? []
  const marks = ids.map(() => '?').join(',')
  const stmt = db.prepare(`SELECT COUNT(*) AS n FROM opens WHERE user_id=? AND date(ts) >= ? AND game_id IN (${marks})`)
  return (uid, since) => (stmt.get(uid, since, ...ids) as { n: number }).n
}

/** Сколько РАЗНЫХ жанров игрок открывал за окно. */
function distinctCatsPlayed(uid: number, since: string): number {
  const rows = db.prepare('SELECT DISTINCT game_id AS g FROM opens WHERE user_id=? AND date(ts) >= ?').all(uid, since) as { g: string }[]
  return new Set(rows.map(r => GAME_CAT.get(r.g)).filter(Boolean)).size
}

// ── Пулы заданий ──────────────────────────────────────────────────────────
const DAILY_POOL: QuestDef[] = [
  { id: 'd_play3', title: 'Сыграй в 3 игры', emoji: '🎮', target: 3, reward: 50, bucket: 'engage', progress: opensCount },
  { id: 'd_breadth2', title: 'Открой 2 разные игры', emoji: '🧭', target: 2, reward: 50, bucket: 'engage', progress: distinctGames },
  { id: 'd_breadth3', title: 'Открой 3 разные игры', emoji: '🗺️', target: 3, reward: 60, bucket: 'engage', progress: distinctGames },
  ...CATEGORIES.map(c => ({
    id: `d_cat_${c.id}`, title: `Сыграй в жанре «${c.ru}»`, emoji: c.emoji,
    target: 1, reward: 45, bucket: 'category' as Bucket, progress: catPlayed(c.id),
  })),
  { id: 'd_rate', title: 'Оцени любую игру', emoji: '👍', target: 1, reward: 40, bucket: 'meta', progress: ratedCount },
  { id: 'd_fav', title: 'Добавь игру в избранное', emoji: '⭐', target: 1, reward: 40, bucket: 'meta', progress: favedCount },
]
const DAILY_BUCKETS: Bucket[] = ['engage', 'category', 'meta']

const WEEKLY_POOL: QuestDef[] = [
  { id: 'w_play20', title: 'Сыграй 20 партий за неделю', emoji: '🔥', target: 20, reward: 180, bucket: 'engage', progress: opensCount },
  { id: 'w_breadth7', title: 'Открой 7 разных игр', emoji: '🧭', target: 7, reward: 180, bucket: 'engage', progress: distinctGames },
  { id: 'w_days5', title: 'Заходи 5 дней из 7', emoji: '📅', target: 5, reward: 180, bucket: 'engage', progress: distinctDays },
  { id: 'w_cats3', title: 'Поиграй в 3 разных жанра', emoji: '🎲', target: 3, reward: 170, bucket: 'category', progress: distinctCatsPlayed },
  { id: 'w_rate5', title: 'Оцени 5 игр', emoji: '📝', target: 5, reward: 150, bucket: 'meta', progress: ratedCount },
]

const DEF_BY_ID = new Map<string, QuestDef>([...DAILY_POOL, ...WEEKLY_POOL].map(d => [d.id, d]))

// ── Периоды (UTC, как и прежняя система) ───────────────────────────────────
function dayKey(): string { return new Date().toISOString().slice(0, 10) }
function weekMonday(): string {
  const d = new Date()
  const shift = (d.getUTCDay() + 6) % 7 // 0 = понедельник
  d.setUTCDate(d.getUTCDate() - shift)
  return d.toISOString().slice(0, 10)
}

/** Детерминированный LCG-сид из строки. */
function seedFrom(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0) || 1
}
function pickSeeded<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]
}

// ── Выдача (ленивая, идемпотентная) ────────────────────────────────────────
const readAssign = db.prepare('SELECT slot, quest_id, claimed FROM quest_assignments WHERE user_id=? AND period=? AND period_key=? ORDER BY slot')
const insAssign = db.prepare('INSERT OR IGNORE INTO quest_assignments (user_id, period, period_key, slot, quest_id) VALUES (?,?,?,?,?)')

/** Гарантирует, что игроку выданы задания периода; создаёт при отсутствии. */
function ensureAssigned(uid: number, period: 'day' | 'week', key: string): { slot: number; quest_id: string; claimed: number }[] {
  let rows = readAssign.all(uid, period, key) as { slot: number; quest_id: string; claimed: number }[]
  if (rows.length > 0) return rows
  const picks: string[] = []
  if (period === 'day') {
    // По одному из каждого бакета — гарантированный разброс типов.
    DAILY_BUCKETS.forEach((b, i) => {
      const pool = DAILY_POOL.filter(d => d.bucket === b)
      picks.push(pickSeeded(pool, seedFrom(`${uid}:${key}:${i}`)).id)
    })
  } else {
    // 3 разных недельных задания.
    const pool = [...WEEKLY_POOL]
    let s = seedFrom(`${uid}:${key}`)
    for (let i = pool.length - 1; i > 0; i--) { s = (Math.imul(s, 48271) + 11) >>> 0; const j = s % (i + 1);[pool[i], pool[j]] = [pool[j], pool[i]] }
    picks.push(...pool.slice(0, 3).map(d => d.id))
  }
  const tx = db.transaction(() => picks.forEach((qid, slot) => insAssign.run(uid, period, key, slot, qid)))
  tx()
  rows = readAssign.all(uid, period, key) as { slot: number; quest_id: string; claimed: number }[]
  return rows
}

function toQuest(uid: number, since: string, quest_id: string, claimed: number): Quest | null {
  const def = DEF_BY_ID.get(quest_id)
  if (!def) return null
  const progress = Math.min(def.progress(uid, since), def.target)
  return { id: def.id, title: def.title, emoji: def.emoji, target: def.target, reward: def.reward, progress, done: progress >= def.target, claimed: claimed === 1 }
}

export function questsOf(uid: number): Quest[] {
  const key = dayKey()
  return ensureAssigned(uid, 'day', key).map(r => toQuest(uid, key, r.quest_id, r.claimed)).filter((q): q is Quest => !!q)
}
export function weeklyQuestsOf(uid: number): Quest[] {
  const mon = weekMonday()
  return ensureAssigned(uid, 'week', mon).map(r => toQuest(uid, mon, r.quest_id, r.claimed)).filter((q): q is Quest => !!q)
}

/** Сколько бесплатных рероллов осталось сегодня (1/день). */
function rerollsUsedToday(uid: number): number {
  const row = db.prepare("SELECT value AS n FROM user_progress WHERE user_id=? AND key=?").get(uid, `reroll:${dayKey()}`) as { n: number } | undefined
  return row?.n ?? 0
}
export function rerollsLeft(uid: number): number { return Math.max(0, 1 - rerollsUsedToday(uid)) }

// ── Реролл ─────────────────────────────────────────────────────────────────
export type RerollResult = { ok: true; quests: Quest[]; free: boolean } | { ok: false; reason: 'unknown' | 'claimed' | 'too_poor' }

export function rerollQuest(uid: number, questId: string): RerollResult {
  const key = dayKey()
  const rows = ensureAssigned(uid, 'day', key)
  const target = rows.find(r => r.quest_id === questId)
  if (!target) return { ok: false, reason: 'unknown' }
  if (target.claimed === 1) return { ok: false, reason: 'claimed' }
  const def = DEF_BY_ID.get(questId)
  if (!def) return { ok: false, reason: 'unknown' }

  // Замена в пределах того же бакета, из тех, что сейчас не выданы.
  const active = new Set(rows.map(r => r.quest_id))
  const candidates = DAILY_POOL.filter(d => d.bucket === def.bucket && !active.has(d.id))
  const replacement = candidates.length > 0
    ? pickSeeded(candidates, seedFrom(`${uid}:${key}:reroll:${questId}:${rerollsUsedToday(uid)}`))
    : def // нечем заменить — оставляем как есть, но реролл всё равно «потрачен» только если списали
  if (candidates.length === 0) return { ok: true, quests: questsOf(uid), free: rerollsLeft(uid) > 0 }

  const free = rerollsLeft(uid) > 0
  const out = db.transaction((): RerollResult => {
    if (!free) {
      if (!debitReroll(uid)) return { ok: false, reason: 'too_poor' }
    }
    db.prepare('UPDATE quest_assignments SET quest_id=?, claimed=0 WHERE user_id=? AND period=? AND period_key=? AND slot=?')
      .run(replacement.id, uid, 'day', key, target.slot)
    db.prepare(`INSERT INTO user_progress (user_id, key, value) VALUES (?,?,1)
                ON CONFLICT(user_id, key) DO UPDATE SET value=value+1`).run(uid, `reroll:${key}`)
    return { ok: true, quests: [], free }
  })()
  if (!out.ok) return out
  return { ok: true, quests: questsOf(uid), free }
}

function debitReroll(uid: number): boolean {
  const res = db.prepare('UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?').run(REROLL_COST, uid, REROLL_COST)
  if (res.changes === 0) return false
  const bal = (db.prepare('SELECT coins FROM users WHERE id=?').get(uid) as { coins: number }).coins
  db.prepare('INSERT INTO coin_ledger (user_id, delta, reason, ref, balance_after, ts) VALUES (?,?,?,?,?,?)')
    .run(uid, -REROLL_COST, 'quest', 'reroll', bal, Date.now())
  return true
}

// ── Клейм награды + бонус за полный набор ──────────────────────────────────
export type ClaimResult = { ok: true; reward: number } | { ok: false; reason: 'unknown' | 'not_done' | 'claimed' }

function claimIn(uid: number, period: 'day' | 'week', questId: string): ClaimResult {
  const key = period === 'day' ? dayKey() : weekMonday()
  const rows = ensureAssigned(uid, period, key)
  const row = rows.find(r => r.quest_id === questId)
  if (!row) return { ok: false, reason: 'unknown' }
  const def = DEF_BY_ID.get(questId)!
  if (row.claimed === 1) return { ok: false, reason: 'claimed' }
  const since = key
  if (def.progress(uid, since) < def.target) return { ok: false, reason: 'not_done' }

  let result: ClaimResult = { ok: true, reward: def.reward }
  db.transaction(() => {
    const upd = db.prepare('UPDATE quest_assignments SET claimed=1 WHERE user_id=? AND period=? AND period_key=? AND slot=? AND claimed=0')
      .run(uid, period, key, row.slot)
    if (upd.changes === 0) { result = { ok: false, reason: 'claimed' }; return }
    credit(uid, def.reward, 'quest', questId)
    const qxp = period === 'day' ? SEASON_XP.dailyQuest : SEASON_XP.weeklyQuest
    grantSeasonXp(uid, qxp); grantAccountXp(uid, qxp)
    // Бонус за полный набор: когда ВСЕ слоты периода получены.
    const remaining = (db.prepare('SELECT COUNT(*) AS n FROM quest_assignments WHERE user_id=? AND period=? AND period_key=? AND claimed=0').get(uid, period, key) as { n: number }).n
    if (remaining === 0) {
      const bonusSlot = 99
      const ins = db.prepare('INSERT OR IGNORE INTO quest_assignments (user_id, period, period_key, slot, quest_id, claimed) VALUES (?,?,?,?,?,1)')
        .run(uid, period, key, bonusSlot, '_bonus')
      if (ins.changes > 0) {
        credit(uid, period === 'day' ? DAILY_BONUS : WEEKLY_BONUS, 'quest', `${period}_bonus`)
        grantSeasonXp(uid, period === 'day' ? SEASON_XP.dailyBonus : SEASON_XP.weeklyBonus)
      }
    }
  })()
  return result
}

/** Клейм по id: ищет в дневных, затем в недельных. */
export function claimQuest(uid: number, questId: string): ClaimResult {
  const daily = ensureAssigned(uid, 'day', dayKey())
  if (daily.some(r => r.quest_id === questId)) return claimIn(uid, 'day', questId)
  const weekly = ensureAssigned(uid, 'week', weekMonday())
  if (weekly.some(r => r.quest_id === questId)) return claimIn(uid, 'week', questId)
  return { ok: false, reason: 'unknown' }
}
