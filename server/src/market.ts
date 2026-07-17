import { db } from './db'
import { credit, debit } from './ledger'
import { cosmeticById, isTradeable, SLOTS, RARITY, type Slot } from '../../shared/cosmetics'
import {
  priceBounds, sellerProceeds, MAX_LISTINGS_PER_DAY, MIN_OPENS_TO_TRADE, MARKET_FEE_PCT,
  type MarketView, type Listing, type Sellable,
} from '../../shared/market'

// Маркетплейс с эскроу: активный лот = предмет ИЗЪЯТ у продавца (нет строки во
// владении) до покупки/отмены. Атомарные транзакции, комиссия 10% сжигается.
// Имена столбцов слотов у users совпадают с названиями слотов (color/frame/…),
// а слот берём из проверенного каталога - SQL безопасен.

const SLOT_SET = new Set<string>(SLOTS)

export type ListResult = { ok: true; id: number } | { ok: false; reason: string }
export type TradeResult = { ok: true } | { ok: false; reason: string }

function opensOf(uid: number): number {
  return (db.prepare('SELECT opens FROM users WHERE id=?').get(uid) as { opens: number } | undefined)?.opens ?? 0
}
function owns(uid: number, itemId: string): boolean {
  return !!db.prepare('SELECT 1 FROM cosmetics_owned WHERE user_id=? AND item_id=?').get(uid, itemId)
}

/** Выставить свой торгуемый предмет на продажу (эскроу). */
export function listItem(uid: number, itemId: string, price: number): ListResult {
  const item = cosmeticById(itemId)
  if (!item || !isTradeable(item)) return { ok: false, reason: 'not_tradeable' }
  if (!Number.isInteger(price)) return { ok: false, reason: 'bad_price' }
  if (!owns(uid, itemId)) return { ok: false, reason: 'not_owned' }
  const { min, max } = priceBounds(item)
  if (price < min || price > max) return { ok: false, reason: 'bad_price' }
  if (opensOf(uid) < MIN_OPENS_TO_TRADE) return { ok: false, reason: 'trade_hold' }
  const today = (db.prepare(
    "SELECT COUNT(*) AS n FROM market_listings WHERE seller_id=? AND date(ts/1000,'unixepoch')=date('now')",
  ).get(uid) as { n: number }).n
  if (today >= MAX_LISTINGS_PER_DAY) return { ok: false, reason: 'rate_limit' }

  let id = 0
  db.transaction(() => {
    // Изъять из владения (эскроу). Снять с себя, если надето.
    db.prepare('DELETE FROM cosmetics_owned WHERE user_id=? AND item_id=?').run(uid, itemId)
    if (SLOT_SET.has(item.slot)) {
      db.prepare(`UPDATE users SET ${item.slot as Slot}=NULL WHERE id=? AND ${item.slot as Slot}=?`).run(uid, itemId)
    }
    const res = db.prepare('INSERT INTO market_listings (seller_id, item_id, price, ts) VALUES (?,?,?,?)').run(uid, itemId, price, Date.now())
    id = Number(res.lastInsertRowid)
  })()
  return { ok: true, id }
}

interface Row { id: number; seller_id: number; item_id: string; price: number; status: string }

/** Снять свой активный лот и вернуть предмет. */
export function cancelListing(uid: number, listingId: number): TradeResult {
  const l = db.prepare('SELECT id, seller_id, item_id, price, status FROM market_listings WHERE id=?').get(listingId) as Row | undefined
  if (!l || l.status !== 'active') return { ok: false, reason: 'gone' }
  if (l.seller_id !== uid) return { ok: false, reason: 'not_yours' }
  db.transaction(() => {
    const upd = db.prepare("UPDATE market_listings SET status='cancelled' WHERE id=? AND status='active'").run(listingId)
    if (upd.changes === 0) return
    db.prepare('INSERT OR IGNORE INTO cosmetics_owned (user_id, item_id) VALUES (?,?)').run(uid, l.item_id)
  })()
  return { ok: true }
}

/** Купить лот: атомарный обмен, комиссия сжигается. */
export function buyListing(uid: number, listingId: number): TradeResult {
  const l = db.prepare('SELECT id, seller_id, item_id, price, status FROM market_listings WHERE id=?').get(listingId) as Row | undefined
  if (!l || l.status !== 'active') return { ok: false, reason: 'gone' }
  if (l.seller_id === uid) return { ok: false, reason: 'own' }
  if (owns(uid, l.item_id)) return { ok: false, reason: 'already_owned' }
  let result: TradeResult = { ok: true }
  try {
    db.transaction(() => {
      // Захватываем лот атомарно: помечаем sold, только если ещё active.
      const upd = db.prepare("UPDATE market_listings SET status='sold', buyer_id=? WHERE id=? AND status='active'").run(uid, listingId)
      if (upd.changes === 0) { result = { ok: false, reason: 'gone' }; return }
      if (!debit(uid, l.price, 'market_buy', `l:${listingId}`)) {
        result = { ok: false, reason: 'too_poor' }
        throw new Error('rollback') // откатываем захват лота
      }
      // Продавец получает за вычетом сожжённой комиссии (10% исчезают).
      credit(l.seller_id, sellerProceeds(l.price), 'market_sell', `l:${listingId}`)
      db.prepare('INSERT OR IGNORE INTO cosmetics_owned (user_id, item_id) VALUES (?,?)').run(uid, l.item_id)
    })()
  } catch { /* откат: лот снова active, result уже = too_poor */ }
  return result
}

// ── Витрина ─────────────────────────────────────────────────────────────────
function nameOf(uid: number): string {
  return (db.prepare('SELECT name FROM users WHERE id=?').get(uid) as { name: string } | undefined)?.name ?? 'Игрок'
}
function toListing(r: { id: number; seller_id: number; item_id: string; price: number }, uid: number): Listing | null {
  const item = cosmeticById(r.item_id)
  if (!item) return null
  return {
    id: r.id, itemId: r.item_id, itemName: item.name, rarity: RARITY[item.rarity].label,
    price: r.price, sellerId: r.seller_id, sellerName: nameOf(r.seller_id), mine: r.seller_id === uid,
  }
}

export function marketView(uid: number): MarketView {
  const active = db.prepare("SELECT id, seller_id, item_id, price FROM market_listings WHERE status='active' ORDER BY id DESC LIMIT 60")
    .all() as { id: number; seller_id: number; item_id: string; price: number }[]
  const listings = active.map(r => toListing(r, uid)).filter((l): l is Listing => !!l)
  const mine = listings.filter(l => l.mine)
  // Что игрок может выставить: свои торгуемые вещи, которых нет в активных лотах.
  const owned = (db.prepare('SELECT item_id FROM cosmetics_owned WHERE user_id=?').all(uid) as { item_id: string }[]).map(r => r.item_id)
  const sellable: Sellable[] = owned
    .map(id => cosmeticById(id))
    .filter((c): c is NonNullable<typeof c> => !!c && isTradeable(c))
    .map(c => { const b = priceBounds(c); return { itemId: c.id, name: c.name, rarity: RARITY[c.rarity].label, floor: b.min, ceil: b.max } })
  const coins = (db.prepare('SELECT coins FROM users WHERE id=?').get(uid) as { coins: number } | undefined)?.coins ?? 0
  return { listings: listings.filter(l => !l.mine), mine, sellable, coins, feePct: MARKET_FEE_PCT }
}
