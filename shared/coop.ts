// Кооп-квесты (§8.3): общий недельный таргет с другом, награда обоим.

/** Вместе выиграть N матчей за неделю. */
export const COOP_TARGET = 30
/** Награда каждому при достижении цели. */
export const COOP_REWARD = 300
/** Косметика-награда за первый совместный клир (выдаётся один раз навсегда). */
export const COOP_ITEM = 'title_coop'

export interface CoopView {
  id: number
  partnerId: number
  partnerName: string
  target: number
  progress: number
  done: boolean
  /** Забрал ли награду ТЕКУЩИЙ игрок. */
  claimed: boolean
}
