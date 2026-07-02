// Экономика Game — единый источник правды по числам (Appendix A из
// «Achievements/Quests/Economy Bible»). Клиент и сервер импортируют отсюда,
// чтобы шкалы и награды нигде не расходились. Без Node/браузерных зависимостей.

/** Стартовый бонус за регистрацию (разовый). */
export const STARTER_COINS = 300

// ─── Фаусет запусков: награда за ШИРОТУ, а не за спам по одной игре ────────
/** Монет за первый за день запуск игры, которую сегодня ещё не открывали. */
export const LAUNCH_BREADTH_REWARD = 10
/** Сколько РАЗНЫХ игр в день оплачиваются широтой (дальше — 0). Итог ≤100🪙/день. */
export const LAUNCH_BREADTH_CAP = 10

// ─── Серия (streak) ───────────────────────────────────────────────────────
/** Максимум «заморозок» серии на руках. */
export const FREEZE_CAP = 5

/** Ежедневная награда за серию: 10🪙 в первый день, плавно до 40🪙. */
export function streakDailyReward(day: number): number {
  return Math.min(40, 10 + Math.max(0, day - 1) * 2)
}

export interface StreakMilestone {
  coins: number
  /** Сколько заморозок выдать (в пределах FREEZE_CAP). */
  freeze?: number
  /** Пополнить заморозки до потолка. */
  freezeToCap?: boolean
}

/** Награды за вехи серии (день => награда). Начисляются один раз при достижении. */
export const STREAK_MILESTONES: Record<number, StreakMilestone> = {
  3: { coins: 50, freeze: 1 },
  7: { coins: 150 },
  14: { coins: 300, freeze: 1 },
  30: { coins: 500, freezeToCap: true },
  50: { coins: 800 },
  100: { coins: 1500, freeze: 3 },
  200: { coins: 3000 },
  365: { coins: 6000 },
}

/** Причина изменения баланса — коды для аудита в coin_ledger (§16). */
export type CoinReason =
  | 'signup'
  | 'launch_breadth'
  | 'streak_daily'
  | 'streak_milestone'
  | 'quest'
  | 'gift_out'
  | 'gift_in'
  | 'referrer'
  | 'referred'
  | 'purchase'
  | 'refund'
  | 'cosmetic'
