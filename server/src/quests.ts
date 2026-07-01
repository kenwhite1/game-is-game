import { db } from './db'
import { GAMES, CATEGORIES } from '../../shared/games'
import type { Quest } from '../../shared/types'

// ─── Задания дня ─────────────────────────────────────────────────────────
// Набор из трёх заданий, одинаковый для всех игроков, меняется раз в сутки
// (UTC). Прогресс считается на лету из существующих таблиц, награда
// выдаётся один раз (quest_claims).

interface QuestDef {
  id: string
  title: string
  emoji: string
  target: number
  reward: number
  progress(uid: number): number
}

function count(sql: string, ...args: unknown[]): (uid: number) => number {
  const stmt = db.prepare(sql)
  return uid => (stmt.get(uid, ...args) as { n: number }).n
}

const distinctToday = count(
  "SELECT COUNT(DISTINCT game_id) AS n FROM opens WHERE user_id=? AND date(ts)=date('now')",
)
const opensToday = count(
  "SELECT COUNT(*) AS n FROM opens WHERE user_id=? AND date(ts)=date('now')",
)
const ratedToday = count(
  "SELECT COUNT(*) AS n FROM ratings WHERE user_id=? AND date(updated_at)=date('now')",
)
const favedToday = count(
  "SELECT COUNT(*) AS n FROM favorites WHERE user_id=? AND date(created_at)=date('now')",
)

function catToday(catIds: string[]): (uid: number) => number {
  const marks = catIds.map(() => '?').join(',')
  const stmt = db.prepare(
    `SELECT COUNT(*) AS n FROM opens WHERE user_id=? AND date(ts)=date('now') AND game_id IN (${marks})`,
  )
  return uid => (stmt.get(uid, ...catIds) as { n: number }).n
}

const POOL: QuestDef[] = [
  { id: 'q_two_games', title: 'Запусти 2 разные игры', emoji: '🎮', target: 2, reward: 60, progress: distinctToday },
  { id: 'q_three_opens', title: 'Сыграй 3 раза', emoji: '🚀', target: 3, reward: 70, progress: opensToday },
  { id: 'q_rate', title: 'Оцени любую игру', emoji: '👍', target: 1, reward: 40, progress: ratedToday },
  { id: 'q_fav', title: 'Добавь игру в избранное', emoji: '⭐', target: 1, reward: 30, progress: favedToday },
  ...CATEGORIES.map(c => ({
    id: `q_cat_${c.id}`,
    title: `Сыграй в игру из «${c.ru}»`,
    emoji: c.emoji,
    target: 1,
    reward: 45,
    progress: catToday(GAMES.filter(g => g.category === c.id).map(g => g.id)),
  })),
]

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Три задания на сегодня: детерминированный выбор по номеру дня (UTC). */
function dailySet(): QuestDef[] {
  const day = Math.floor(Date.now() / 86_400_000)
  const idx = POOL.map((_, i) => i)
  // Простой LCG-шаффл с сидом дня: у всех игроков один и тот же набор.
  let s = day
  for (let i = idx.length - 1; i > 0; i--) {
    s = (s * 48271 + 11) % 2147483647
    const j = s % (i + 1)
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx.slice(0, 3).map(i => POOL[i])
}

export function questsOf(uid: number): Quest[] {
  const day = todayUtc()
  const claimed = new Set(
    (db.prepare('SELECT quest_id FROM quest_claims WHERE user_id=? AND day=?').all(uid, day) as { quest_id: string }[])
      .map(r => r.quest_id),
  )
  return dailySet().map(q => {
    const progress = Math.min(q.progress(uid), q.target)
    return {
      id: q.id,
      title: q.title,
      emoji: q.emoji,
      target: q.target,
      reward: q.reward,
      progress,
      done: progress >= q.target,
      claimed: claimed.has(q.id),
    }
  })
}

export type ClaimResult = { ok: true; reward: number } | { ok: false; reason: 'unknown' | 'not_done' | 'claimed' }

export function claimQuest(uid: number, questId: string): ClaimResult {
  const q = dailySet().find(x => x.id === questId)
  if (!q) return { ok: false, reason: 'unknown' }
  if (q.progress(uid) < q.target) return { ok: false, reason: 'not_done' }
  const day = todayUtc()
  let result: ClaimResult = { ok: true, reward: q.reward }
  db.transaction(() => {
    const ins = db
      .prepare('INSERT OR IGNORE INTO quest_claims (user_id, quest_id, day) VALUES (?,?,?)')
      .run(uid, questId, day)
    if (ins.changes === 0) {
      result = { ok: false, reason: 'claimed' }
      return
    }
    db.prepare('UPDATE users SET coins=coins+? WHERE id=?').run(q.reward, uid)
  })()
  return result
}
