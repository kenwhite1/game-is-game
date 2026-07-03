import { db } from './db'
import { credit } from './ledger'
import { progressMap, setProgress, getProgress, writeFeed } from './events'
import { invitedCount } from './referrals'
import { grantAccountXp } from './xp'
import { CATEGORIES } from '../../shared/games'
import {
  ACHIEVEMENTS, META_STATS, TIER_META, reachedIndex, pointsUpTo, achievementById, isMasterStat,
  ACH_CATEGORY_RU, type Achievement, type Tier, type AchView, type AchievementsPayload,
} from '../../shared/achievements'

// Достижения уровня игры, сгруппированные по игре (для «Мастеров»), и список
// самих «Мастеров» — считаются один раз при загрузке модуля.
const PER_GAME_MEMBERS = new Map<string, Achievement[]>()
const MASTER_LIST: Achievement[] = []
for (const a of ACHIEVEMENTS) {
  if (!a.gameId) continue
  if (isMasterStat(a.stat)) MASTER_LIST.push(a)
  else {
    const list = PER_GAME_MEMBERS.get(a.gameId) ?? []
    list.push(a)
    PER_GAME_MEMBERS.set(a.gameId, list)
  }
}

/** master_<id> = 1, если все прочие достижения игры взяты на максимум. */
function computeMasterStats(snap: Record<string, number>, reached: Map<string, number>): void {
  for (const [gid, members] of PER_GAME_MEMBERS) {
    const all = members.every(m => (reached.has(m.id) ? (reached.get(m.id) as number) : -1) >= m.rungs.length - 1)
    snap[`master_${gid}`] = all ? 1 : 0
  }
}
/** Сколько «Мастеров» уже открыто (для «Полимата»). */
function countMastered(reached: Map<string, number>): number {
  let n = 0
  for (const a of MASTER_LIST) if ((reached.has(a.id) ? (reached.get(a.id) as number) : -1) >= 0) n++
  return n
}

// Движок достижений: собирает снимок прогресса, открывает взятые «лесенки»
// (идемпотентно), платит монеты за каждый новый тир через ledger и считает
// GG Score. Мета-величины (gg_score, achievements_unlocked) — вторым проходом.

function scalar(sql: string, uid: number): number {
  return (db.prepare(sql).get(uid) as { n: number } | undefined)?.n ?? 0
}

/** Снимок всех величин, на которые смотрят достижения. */
function buildSnapshot(uid: number): Record<string, number> {
  const snap: Record<string, number> = { ...progressMap(uid) }
  snap.distinct_games_played = scalar('SELECT COUNT(DISTINCT game_id) AS n FROM opens WHERE user_id=?', uid)
  snap.categories_won = CATEGORIES.filter(c => (snap[`wins_cat_${c.id}`] ?? 0) > 0).length
  snap.cosmetics_owned = scalar('SELECT COUNT(*) AS n FROM cosmetics_owned WHERE user_id=?', uid)
  snap.coins_spent = -scalar("SELECT COALESCE(SUM(delta),0) AS n FROM coin_ledger WHERE user_id=? AND reason='cosmetic'", uid)
  snap.coins_gifted = -scalar("SELECT COALESCE(SUM(delta),0) AS n FROM coin_ledger WHERE user_id=? AND reason='gift_out'", uid)
  snap.friends = scalar('SELECT COUNT(*) AS n FROM friendships WHERE user_id=?', uid)
  snap.referrals = invitedCount(uid)
  snap.streak_best = scalar('SELECT streak_best AS n FROM users WHERE id=?', uid)
  // Разные сыгранные режимы по каждой игре (для «Знатока режимов»): pm_<gid>_<mode>.
  const modes = new Map<string, Set<string>>()
  for (const key in snap) {
    if (snap[key] <= 0) continue
    const m = /^pm_(.+)_(solo|multi|friends)$/.exec(key)
    if (!m) continue
    let set = modes.get(m[1])
    if (!set) { set = new Set(); modes.set(m[1], set) }
    set.add(m[2])
  }
  for (const [gid, set] of modes) snap[`modes_game_${gid}`] = set.size
  return snap
}

const readUnlocks = db.prepare('SELECT ach_id, tier_reached FROM user_achievements WHERE user_id=?')
const upsertUnlock = db.prepare(
  `INSERT INTO user_achievements (user_id, ach_id, tier_reached, unlocked_at) VALUES (?,?,?,?)
   ON CONFLICT(user_id, ach_id) DO UPDATE SET tier_reached=excluded.tier_reached, unlocked_at=excluded.unlocked_at`,
)

export interface UnlockedRung { id: string; title: string; tier: Tier; name: string; coins: number }

function scoreAndCount(reached: Map<string, number>): { score: number; count: number } {
  let score = 0, count = 0
  for (const [id, tr] of reached) {
    const a = achievementById(id)
    if (!a) continue
    score += pointsUpTo(a, tr)
    count += tr + 1
  }
  return { score, count }
}

/** Открыть все взятые тиры, заплатить за новые, записать gg_score. Идемпотентно. */
export function syncAchievements(uid: number): { newly: UnlockedRung[]; score: number } {
  const snap = buildSnapshot(uid)
  const reached = new Map<string, number>((readUnlocks.all(uid) as { ach_id: string; tier_reached: number }[]).map(r => [r.ach_id, r.tier_reached]))
  const newly: UnlockedRung[] = []

  const evalOne = (a: Achievement) => {
    const idx = reachedIndex(a, snap[a.stat] ?? 0)
    const prev = reached.has(a.id) ? (reached.get(a.id) as number) : -1
    if (idx <= prev) return
    for (let i = prev + 1; i <= idx; i++) {
      const rung = a.rungs[i]
      const coins = TIER_META[rung.tier].coins
      credit(uid, coins, 'achievement', `${a.id}:${rung.tier}`)
      grantAccountXp(uid, TIER_META[rung.tier].points) // §5.2: достижение даёт XP уровня
      newly.push({ id: a.id, title: a.title, tier: rung.tier, name: rung.name, coins })
    }
    upsertUnlock.run(uid, a.id, idx, Date.now())
    reached.set(a.id, idx)
  }

  // Проход 1: обычные достижения (в т.ч. уровня игры), кроме «Мастеров»/мета.
  for (const a of ACHIEVEMENTS) if (!META_STATS.has(a.stat) && !isMasterStat(a.stat)) evalOne(a)
  // Проход 1.5: «Мастера» игр — зависят от того, взяты ли все достижения игры.
  computeMasterStats(snap, reached)
  for (const a of ACHIEVEMENTS) if (isMasterStat(a.stat)) evalOne(a)
  // Мета-величины зависят от результата предыдущих проходов (вкл. «Мастеров»).
  const s1 = scoreAndCount(reached)
  snap.gg_score = s1.score
  snap.achievements_unlocked = s1.count
  snap.games_mastered = countMastered(reached)
  // Проход 2: мета-достижения (GG Score, трофеи, Полимат) — могут добавить очков.
  for (const a of ACHIEVEMENTS) if (META_STATS.has(a.stat)) evalOne(a)

  const final = scoreAndCount(reached)
  setProgress(uid, 'gg_score', final.score)
  // В ленту публикуем только заметные ранги (золото+), чтобы не спамить.
  const notable = new Set<Tier>(['gold', 'platinum', 'diamond'])
  for (const n of newly) if (notable.has(n.tier)) writeFeed(uid, 'achievement', `открыл(а) достижение «${n.name}»`)
  return { newly, score: final.score }
}

/** Полная витрина достижений игрока (со свежей синхронизацией и редкостью). */
export function achievementsView(uid: number): AchievementsPayload {
  syncAchievements(uid)
  const snap = buildSnapshot(uid)
  const reached = new Map<string, number>((readUnlocks.all(uid) as { ach_id: string; tier_reached: number }[]).map(r => [r.ach_id, r.tier_reached]))
  const s = scoreAndCount(reached)
  snap.gg_score = s.score
  snap.achievements_unlocked = s.count
  // Производные величины для отображения карточек «Мастер»/«Полимат».
  computeMasterStats(snap, reached)
  snap.games_mastered = countMastered(reached)

  const totalUsers = Math.max(1, (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n)
  const ownerCounts = new Map<string, number>(
    (db.prepare('SELECT ach_id, COUNT(*) AS n FROM user_achievements GROUP BY ach_id').all() as { ach_id: string; n: number }[])
      .map(r => [r.ach_id, r.n]),
  )

  const items: AchView[] = ACHIEVEMENTS.map(a => ({
    id: a.id,
    title: a.title,
    desc: a.desc,
    category: ACH_CATEGORY_RU[a.category],
    gameId: a.gameId,
    hidden: !!a.hidden,
    tierReached: reached.has(a.id) ? (reached.get(a.id) as number) : -1,
    value: snap[a.stat] ?? 0,
    rungs: a.rungs.map(rg => ({ tier: rg.tier, target: rg.target, name: rg.name })),
    rarity: (ownerCounts.get(a.id) ?? 0) / totalUsers,
  }))

  return { items, score: s.score, unlocked: s.count, total: ACHIEVEMENTS.reduce((n, a) => n + a.rungs.length, 0) }
}

const ACH_TOTAL = ACHIEVEMENTS.reduce((n, a) => n + a.rungs.length, 0)

/** Дешёвая сводка для экрана профиля — читает уже посчитанное, без синка/выплат. */
export function achievementsSummary(uid: number): { score: number; unlocked: number; total: number } {
  const unlocked = (db.prepare('SELECT COALESCE(SUM(tier_reached+1),0) AS n FROM user_achievements WHERE user_id=?').get(uid) as { n: number }).n
  return { score: getProgress(uid, 'gg_score'), unlocked, total: ACH_TOTAL }
}
