import { db } from './db'
import { credit } from './ledger'
import { progressMap, setProgress, getProgress, writeFeed } from './events'
import { invitedCount } from './referrals'
import { CATEGORIES } from '../../shared/games'
import {
  ACHIEVEMENTS, META_STATS, TIER_META, reachedIndex, pointsUpTo, achievementById,
  ACH_CATEGORY_RU, type Achievement, type Tier, type AchView, type AchievementsPayload,
} from '../../shared/achievements'

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
      newly.push({ id: a.id, title: a.title, tier: rung.tier, name: rung.name, coins })
    }
    upsertUnlock.run(uid, a.id, idx, Date.now())
    reached.set(a.id, idx)
  }

  // Проход 1: обычные достижения.
  for (const a of ACHIEVEMENTS) if (!META_STATS.has(a.stat)) evalOne(a)
  // Мета-величины зависят от результата прохода 1.
  const s1 = scoreAndCount(reached)
  snap.gg_score = s1.score
  snap.achievements_unlocked = s1.count
  // Проход 2: мета-достижения (могут добавить очков).
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
