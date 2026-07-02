// Ротационная витрина дня (§10.4): каждый день 4 товара из каталога, часть со
// скидкой, один — «уходит скоро». Детерминированно по дню, поэтому у всех
// одинаково и клиент/сервер считают цену одинаково. Это превращает статичный
// каталог в ежедневную причину заглянуть.

import { COSMETICS } from './cosmetics'

export interface DailyDeal {
  itemId: string
  /** Обычная цена. */
  base: number
  /** Цена сегодня (со скидкой), кратна 10. */
  price: number
  discountPct: number
  /** «Уходит скоро» — последний слот витрины. */
  leaving: boolean
}

const SHOP_ITEMS = COSMETICS.filter(c => c.unlock.kind === 'shop')
const DISCOUNTS = [0, 15, 30]

function seedFrom(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0) || 1
}

/** Ключ дня витрины (UTC), общий для всех игроков. */
export function shopDayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

/** 4 товара дня со скидками. */
export function dailyShop(dayKey: string): DailyDeal[] {
  if (SHOP_ITEMS.length === 0) return []
  const idx = SHOP_ITEMS.map((_, i) => i)
  let s = seedFrom(`shop:${dayKey}`)
  for (let i = idx.length - 1; i > 0; i--) { s = (Math.imul(s, 48271) + 11) >>> 0; const j = s % (i + 1);[idx[i], idx[j]] = [idx[j], idx[i]] }
  const n = Math.min(4, SHOP_ITEMS.length)
  return idx.slice(0, n).map((itemIdx, slot) => {
    const item = SHOP_ITEMS[itemIdx]
    const base = (item.unlock as { price: number }).price
    s = (Math.imul(s, 48271) + 7) >>> 0
    // Последний слот всегда со скидкой и помечен «уходит скоро».
    const discountPct = slot === n - 1 ? DISCOUNTS[1 + (s % 2)] : DISCOUNTS[s % DISCOUNTS.length]
    const price = Math.max(10, Math.round((base * (100 - discountPct)) / 100 / 10) * 10)
    return { itemId: item.id, base, price, discountPct, leaving: slot === n - 1 }
  })
}

/** Сделка дня для конкретного товара (или undefined). */
export function dealFor(dayKey: string, itemId: string): DailyDeal | undefined {
  return dailyShop(dayKey).find(d => d.itemId === itemId)
}
