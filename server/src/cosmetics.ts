import { db } from './db'
import type { Wardrobe, CosmeticState } from '../../shared/types'
import {
  COSMETICS, cosmeticById, isOwned, unlockLabel, shopPrice, DEFAULT_EQUIP, RARITY_ORDER,
  type Slot, type OwnerCtx,
} from '../../shared/cosmetics'
import { BADGES } from '../../shared/progression'
import { getProfile, badgeSet, equippedOf } from './profiles'
import { debit } from './ledger'
import { dailyShop, dealFor, shopDayKey } from '../../shared/shop'

const badgeName = (id: string) => BADGES.find(b => b.id === id)?.name ?? id

function ownedSet(uid: number): Set<string> {
  return new Set(
    (db.prepare('SELECT item_id FROM cosmetics_owned WHERE user_id=?').all(uid) as { item_id: string }[]).map(r => r.item_id),
  )
}

function achTiersOf(uid: number): Map<string, number> {
  return new Map(
    (db.prepare('SELECT ach_id, tier_reached FROM user_achievements WHERE user_id=?').all(uid) as { ach_id: string; tier_reached: number }[])
      .map(r => [r.ach_id, r.tier_reached]),
  )
}

/** Контекст владения: уровень, значки, достижения, серия и явные покупки/гранты. */
function ownerCtx(uid: number, level: number): OwnerCtx {
  const streakBest = (db.prepare('SELECT streak_best AS n FROM users WHERE id=?').get(uid) as { n: number } | undefined)?.n ?? 0
  return { level, badges: badgeSet(uid), owned: ownedSet(uid), achTiers: achTiersOf(uid), streakBest }
}

/** Гардероб игрока: весь каталог со статусом владения/надетости/цены. */
export function wardrobeOf(uid: number): Wardrobe | null {
  const profile = getProfile(uid)
  if (!profile) return null
  const ctx = ownerCtx(uid, profile.level)
  const equipped = equippedOf(uid)

  const items: CosmeticState[] = COSMETICS.map(item => {
    const owned = isOwned(item, ctx)
    return {
      item,
      owned,
      equipped: equipped[item.slot] === item.id,
      price: owned ? null : shopPrice(item),
      lockLabel: owned ? '' : unlockLabel(item, badgeName),
    }
  }).sort((a, b) => {
    if (a.equipped !== b.equipped) return a.equipped ? -1 : 1
    if (a.owned !== b.owned) return a.owned ? -1 : 1
    // внутри непокупленных: сначала покупаемые (есть цена), потом по редкости
    if (a.item.rarity !== b.item.rarity) return RARITY_ORDER[a.item.rarity] - RARITY_ORDER[b.item.rarity]
    return a.item.name.localeCompare(b.item.name)
  })

  return {
    equipped,
    items,
    ownedCount: items.filter(i => i.owned).length,
    totalCount: items.length,
    coins: profile.coins,
    daily: dailyShop(shopDayKey()),
  }
}

const SLOT_COLUMN: Record<Slot, string> = {
  color: 'color', face: 'face', frame: 'frame', hat: 'hat', eyewear: 'eyewear',
  effect: 'effect', companion: 'companion', banner: 'banner', title: 'title',
}

export type EquipResult = { ok: true } | { ok: false; reason: 'not_found' | 'wrong_slot' | 'locked' }

/** Надеть предмет, если он открыт игроку. */
export function equip(uid: number, slot: Slot, itemId: string): EquipResult {
  const item = cosmeticById(itemId)
  if (!item) return { ok: false, reason: 'not_found' }
  if (item.slot !== slot) return { ok: false, reason: 'wrong_slot' }
  const profile = getProfile(uid)
  if (!profile) return { ok: false, reason: 'not_found' }
  if (!isOwned(item, ownerCtx(uid, profile.level))) return { ok: false, reason: 'locked' }
  db.prepare(`UPDATE users SET ${SLOT_COLUMN[slot]}=? WHERE id=?`).run(itemId, uid)
  return { ok: true }
}

export type BuyResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'not_for_sale' | 'already_owned' | 'too_poor' }

/** Купить товар магазина за Game. Списывает монеты и выдаёт предмет (атомарно). */
export function buy(uid: number, itemId: string): BuyResult {
  const item = cosmeticById(itemId)
  if (!item) return { ok: false, reason: 'not_found' }
  const base = shopPrice(item)
  if (base == null) return { ok: false, reason: 'not_for_sale' }
  // Если товар сегодня на витрине со скидкой — берём цену дня.
  const price = dealFor(shopDayKey(), itemId)?.price ?? base

  const profile = getProfile(uid)
  if (!profile) return { ok: false, reason: 'not_found' }
  if (isOwned(item, ownerCtx(uid, profile.level))) return { ok: false, reason: 'already_owned' }
  if (profile.coins < price) return { ok: false, reason: 'too_poor' }

  // Условное списание через ledger: debit проверяет баланс атомарно и пишет
  // строку в coin_ledger. Владение выдаём в той же транзакции.
  const tx = db.transaction(() => {
    if (!debit(uid, price, 'cosmetic', itemId)) return false
    db.prepare('INSERT OR IGNORE INTO cosmetics_owned (user_id, item_id) VALUES (?,?)').run(uid, itemId)
    return true
  })
  return tx() ? { ok: true } : { ok: false, reason: 'too_poor' }
}

/** Выдать предмет напрямую (награда/грант). Идемпотентно. */
export function grant(uid: number, itemId: string): boolean {
  if (!cosmeticById(itemId)) return false
  db.prepare('INSERT OR IGNORE INTO cosmetics_owned (user_id, item_id) VALUES (?,?)').run(uid, itemId)
  return true
}

export { DEFAULT_EQUIP }
