import { db } from './db'
import { credit, debit } from './ledger'
import { writeFeed, bumpProgress, getProgress } from './events'
import { FREEZE_CAP, STREAK_MILESTONES, streakDailyReward, STREAK_REPAIR, STREAK_REPAIR_HOURS, STREAK_REPAIR_PLAYS } from '../../shared/economy'

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

interface StreakRow { c: number; b: number; l: string | null; f: number; p: number; bv: number; ru: number }

export interface StreakTick {
  current: number
  best: number
  freezes: number
  /** Продвинулась ли серия в этом вызове (первый заход за день). */
  ticked: boolean
  /** Достигнута ли веха на этом тике (номер дня-вехи), иначе undefined. */
  milestone?: number
  /** Серия ни разу не спасена заморозкой (§9.6, «золотое пламя»). */
  perfect: boolean
}

/** Скрытое достижение «Сова» (§7A ⑲): игра ночью 03:00–05:00 МСК. */
function markNightOwl(uid: number): void {
  const hourMsk = new Date(Date.now() + 3 * 3600 * 1000).getUTCHours()
  if (hourMsk >= 3 && hourMsk < 5 && getProgress(uid, 'nightowl') === 0) bumpProgress(uid, 'nightowl', 1)
}

/** Отметить активность дня: продлить/сбросить серию и начислить награды.
 *  Идемпотентно в рамках календарного дня (повторные заходы ничего не дают). */
export function tickStreak(uid: number): StreakTick {
  markNightOwl(uid) // считаем всегда, даже на повторном ночном заходе
  const u = db
    .prepare('SELECT streak_current AS c, streak_best AS b, streak_last AS l, streak_freezes AS f, streak_perfect AS p, streak_broke_value AS bv, streak_repair_until AS ru FROM users WHERE id=?')
    .get(uid) as StreakRow | undefined
  if (!u) return { current: 0, best: 0, freezes: 0, ticked: false, perfect: true }

  const today = mskDay()
  if (u.l === today) return { current: u.c, best: u.b, freezes: u.f, ticked: false, perfect: u.p === 1 }

  let current: number
  let freezesUsed = 0
  let perfect = u.p === 1
  let brokeValue = u.bv
  let repairUntil = u.ru
  if (!u.l) {
    current = 1
    perfect = true
  } else {
    const gap = daysBetween(u.l, today)
    if (gap <= 1) {
      current = u.c + 1 // подряд
    } else {
      const missed = gap - 1
      if (u.f >= missed) { freezesUsed = missed; current = u.c + 1; perfect = false } // заморозки спасли — уже не идеальна
      else {
        // Серия прервалась — новая. Если было что терять (≥2 дня), открываем окно ремонта (§9.3).
        current = 1
        perfect = true
        if (u.c >= 2) { brokeValue = u.c; repairUntil = Date.now() + STREAK_REPAIR_HOURS * 3600_000 }
      }
    }
  }
  // Здоровый тик закрывает любое открытое окно ремонта.
  if (current > 1) { brokeValue = 0; repairUntil = 0 }

  const best = Math.max(u.b, current)
  const milestone = STREAK_MILESTONES[current]
  let freezes = u.f - freezesUsed
  if (milestone?.freeze) freezes = Math.min(FREEZE_CAP, freezes + milestone.freeze)
  if (milestone?.freezeToCap) freezes = FREEZE_CAP

  db.prepare('UPDATE users SET streak_current=?, streak_best=?, streak_last=?, streak_freezes=?, streak_perfect=?, streak_broke_value=?, streak_repair_until=? WHERE id=?')
    .run(current, best, today, freezes, perfect ? 1 : 0, brokeValue, repairUntil, uid)

  credit(uid, streakDailyReward(current), 'streak_daily', today)
  if (milestone?.coins) {
    credit(uid, milestone.coins, 'streak_milestone', `d${current}`)
    writeFeed(uid, 'streak', `держит серию ${current} дней подряд 🔥`)
  }

  return { current, best, freezes, ticked: true, milestone: milestone ? current : undefined, perfect }
}

export interface StreakRepairInfo {
  /** Длина серии, которую можно восстановить. */
  value: number
  /** До какого времени (ms) открыто окно. */
  until: number
  /** Сколько матчей сыграно в окне (для бесплатного ремонта за 3 игры). */
  plays: number
  /** Хватает ли сыгранных матчей на бесплатный ремонт. */
  canPlayFree: boolean
  cost: number
  playsNeeded: number
}

/** Открыт ли ремонт серии и на каких условиях (для профиля/UI). */
export function streakRepairInfo(uid: number): StreakRepairInfo | null {
  const u = db.prepare('SELECT streak_broke_value AS bv, streak_repair_until AS ru FROM users WHERE id=?').get(uid) as { bv: number; ru: number } | undefined
  if (!u || u.bv < 2 || u.ru <= Date.now()) return null
  const windowOpen = u.ru - STREAK_REPAIR_HOURS * 3600_000
  const plays = (db.prepare('SELECT COUNT(*) AS n FROM match_results WHERE user_id=? AND ts>=?').get(uid, windowOpen) as { n: number }).n
  return { value: u.bv, until: u.ru, plays, canPlayFree: plays >= STREAK_REPAIR_PLAYS, cost: STREAK_REPAIR, playsNeeded: STREAK_REPAIR_PLAYS }
}

export type RepairResult = { ok: true; current: number } | { ok: false; reason: 'no_window' | 'too_poor' | 'need_plays' }

/** Починить серию: бесплатно если сыграно ≥3 матча в окне, иначе за 100🪙 (§9.3). */
export function repairStreak(uid: number, method: 'pay' | 'play'): RepairResult {
  const info = streakRepairInfo(uid)
  if (!info) return { ok: false, reason: 'no_window' }
  if (method === 'play') {
    if (!info.canPlayFree) return { ok: false, reason: 'need_plays' }
  } else {
    if (!debit(uid, STREAK_REPAIR, 'streak_repair', `d${info.value}`)) return { ok: false, reason: 'too_poor' }
  }
  const restored = info.value + 1 // прощаем пропуск + сегодняшняя игра
  const best = restored // не меньше прежнего рекорда — max в SQL
  db.prepare('UPDATE users SET streak_current=?, streak_best=MAX(streak_best,?), streak_broke_value=0, streak_repair_until=0, streak_perfect=0 WHERE id=?')
    .run(restored, best, uid)
  writeFeed(uid, 'streak', `восстановил(а) серию ${restored} дней 🔧🔥`)
  return { ok: true, current: restored }
}
