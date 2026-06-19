import { db } from './db'
import type { Wardrobe, CosmeticState } from '../../shared/types'
import {
  COSMETICS, cosmeticById, isOwned, unlockLabel, shopPrice, DEFAULT_EQUIP, RARITY_ORDER,
  type Slot, type OwnerCtx,
} from '../../shared/cosmetics'
import { BADGES } from '../../shared/progression'
import { getProfile, badgeSet, equippedOf } from './profiles'

const badgeName = (id: string) => BADGES.find(b => b.id === id)?.name ?? id

function ownedSet(uid: number): Set<string> {
  return new Set(
    (db.prepare('SELECT item_id FROM cosmetics_owned WHERE user_id=?').all(uid) as { item_id: string }[]).map(r => r.item_id),
  )
}

/** Контекст владения: уровень, заработанные значки и явные покупки/гранты. */
function ownerCtx(uid: number, level: number): OwnerCtx {
  return { level, badges: badgeSet(uid), owned: ownedSet(uid) }
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
  const price = shopPrice(item)
  if (price == null) return { ok: false, reason: 'not_for_sale' }

  const profile = getProfile(uid)
  if (!profile) return { ok: false, reason: 'not_found' }
  if (isOwned(item, ownerCtx(uid, profile.level))) return { ok: false, reason: 'already_owned' }
  if (profile.coins < price) return { ok: false, reason: 'too_poor' }

  // Условное списание: WHERE coins>=price защищает от гонки/двойной покупки.
  const tx = db.transaction(() => {
    const res = db.prepare('UPDATE users SET coins=coins-? WHERE id=? AND coins>=?').run(price, uid, price)
    if (res.changes === 0) return false
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
