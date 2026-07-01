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
]

export function packById(id: string): CoinPack | undefined {
  return PACKS.find(p => p.id === id)
}
