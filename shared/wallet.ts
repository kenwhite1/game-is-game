// Пакеты пополнения Game за Telegram Stars. Единый источник правды для
// витрины в приложении и счетов в боте. Только цифровые товары, только
// Stars (правила Telegram для Mini Apps), игрокам монеты не выводятся.

export interface CoinPack {
  id: string
  /** Сколько Game приходит на баланс. */
  coins: number
  /** Цена в Telegram Stars (XTR). */
  stars: number
  title: string
  emoji: string
  /** Подпись выгоды на витрине. */
  tag?: string
}

export const PACKS: CoinPack[] = [
  { id: 'pack_s', coins: 1000, stars: 25, title: 'Горсть Game', emoji: '🪙' },
  { id: 'pack_m', coins: 2600, stars: 60, title: 'Мешочек Game', emoji: '💰', tag: 'выгоднее на 8%' },
  { id: 'pack_l', coins: 6000, stars: 125, title: 'Сундук Game', emoji: '🧰', tag: 'выгоднее на 20%' },
  { id: 'pack_xl', coins: 15000, stars: 300, title: 'Клад Game', emoji: '💎', tag: 'выгоднее на 25%' },
]

export const PASS_PREMIUM_STARS = 350
/** «Пропуск+» (§11.1): премиум + сразу +10 тиров. */
export const PASS_PLUS_STARS = 700
/** Сколько тиров даёт «Пропуск+» мгновенно. */
export const PASS_PLUS_TIERS = 10

/** «Буст тиров»: разовая покупка за ⭐ — мгновенно прыгнуть вперёд по пропуску.
 * Доступна в любой момент (и без премиума), помогает добить сезон под конец. */
export const TIER_BOOST_TIERS = 5
export const TIER_BOOST_STARS = 150

export function packById(id: string): CoinPack | undefined {
  return PACKS.find(p => p.id === id)
}
