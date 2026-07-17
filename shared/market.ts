// Маркетплейс (§14 библии) - «намеренно сдержанный» слой. Только за монеты, с
// эскроу на сервере, комиссией 10% в СЖИГАНИЕ (истинный сток), ценовыми
// границами и торговым холдом на новых аккаунтах. Торгуются только вещи с
// isTradeable - заслуги (достижения/серия/сезон/ранг/событие/престиж/уровень)
// остаются несменяемыми, поэтому флекс нельзя купить.

import { PRICE, type Cosmetic } from './cosmetics'

/** Комиссия сделки, сжигается (уходит из оборота). */
export const MARKET_FEE_PCT = 10
/** Сколько лотов игрок может выставить в день (анти-спам/вош-трейд). */
export const MAX_LISTINGS_PER_DAY = 10
/** Торговый холд: продавать можно, наиграв хотя бы столько запусков. */
export const MIN_OPENS_TO_TRADE = 10

/** Границы цены лота по редкости (гасят вош-трейд и отмывание между альтами). */
export function priceBounds(item: Cosmetic): { min: number; max: number } {
  const base = PRICE[item.rarity]
  return { min: Math.max(10, Math.round((base * 0.2) / 10) * 10), max: base * 3 }
}

/** Сколько получит продавец после сжигания комиссии. */
export function sellerProceeds(price: number): number {
  return price - Math.floor((price * MARKET_FEE_PCT) / 100)
}

export interface Listing {
  id: number
  itemId: string
  itemName: string
  rarity: string
  price: number
  sellerId: number
  sellerName: string
  mine: boolean
}
export interface Sellable {
  itemId: string
  name: string
  rarity: string
  floor: number
  ceil: number
}
export interface MarketView {
  listings: Listing[]
  mine: Listing[]
  sellable: Sellable[]
  coins: number
  feePct: number
}
