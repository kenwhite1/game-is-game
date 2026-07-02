import { db } from './db'
import { credit } from './ledger'
import { FREEZE_CAP, STREAK_MILESTONES, streakDailyReward } from '../../shared/economy'

// Серия («streak») — сильнейший рычаг ежедневного возврата (§9 библии).
// Пока игры не рапортуют матчи через SDK, серию продвигает первый ЗАПУСК игры
// за день (единственный доступный сигнал). Когда появится Results SDK — сюда же
// подключится match_result без изменения витрины.

/** День в МСК (UTC+3) как YYYY-MM-DD — общая граница «дня» для серии. */
function mskDay(ts = Date.now()): string {
  return new Date(ts + 3 * 3600 * 1000).toISOString().slice(0, 10)
}
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000)
}

interface StreakRow { c: number; b: number; l: string | null; f: number }

export interface StreakTick {
  current: number
  best: number
  freezes: number
  /** Продвинулась ли серия в этом вызове (первый заход за день). */
  ticked: boolean
  /** Достигнута ли веха на этом тике (номер дня-вехи), иначе undefined. */
  milestone?: number
}

/** Отметить активность дня: продлить/сбросить серию и начислить награды.
 *  Идемпотентно в рамках календарного дня (повторные заходы ничего не дают). */
export function tickStreak(uid: number): StreakTick {
  const u = db
    .prepare('SELECT streak_current AS c, streak_best AS b, streak_last AS l, streak_freezes AS f FROM users WHERE id=?')
    .get(uid) as StreakRow | undefined
  if (!u) return { current: 0, best: 0, freezes: 0, ticked: false }

  const today = mskDay()
  if (u.l === today) return { current: u.c, best: u.b, freezes: u.f, ticked: false }

  let current: number
  let freezesUsed = 0
  if (!u.l) {
    current = 1
  } else {
    const gap = daysBetween(u.l, today)
    if (gap <= 1) {
      current = u.c + 1 // подряд
    } else {
      const missed = gap - 1
      if (u.f >= missed) { freezesUsed = missed; current = u.c + 1 } // заморозки спасли серию
      else current = 1 // серия прервалась
    }
  }

  const best = Math.max(u.b, current)
  const milestone = STREAK_MILESTONES[current]
  let freezes = u.f - freezesUsed
  if (milestone?.freeze) freezes = Math.min(FREEZE_CAP, freezes + milestone.freeze)
  if (milestone?.freezeToCap) freezes = FREEZE_CAP

  db.prepare('UPDATE users SET streak_current=?, streak_best=?, streak_last=?, streak_freezes=? WHERE id=?')
    .run(current, best, today, freezes, uid)

  credit(uid, streakDailyReward(current), 'streak_daily', today)
  if (milestone?.coins) credit(uid, milestone.coins, 'streak_milestone', `d${current}`)

  return { current, best, freezes, ticked: true, milestone: milestone ? current : undefined }
}
