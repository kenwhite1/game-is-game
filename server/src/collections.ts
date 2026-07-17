import { db } from './db'
import { credit } from './ledger'
import { writeFeed } from './events'
import { ownerCtxOf } from './cosmetics'
import { COLLECTIONS, cosmeticById, isOwned, type CollectionView } from '../../shared/cosmetics'

// Бонусы коллекций (§10.5): собрал все предметы коллекции - забери бонус (раз).

function claimedSet(uid: number): Set<string> {
  return new Set((db.prepare('SELECT collection FROM collection_claims WHERE user_id=?').all(uid) as { collection: string }[]).map(r => r.collection))
}

export function collectionsOf(uid: number): CollectionView[] {
  const ctx = ownerCtxOf(uid)
  const claimed = claimedSet(uid)
  return COLLECTIONS.map(col => {
    const owned = col.itemIds.filter(id => { const it = cosmeticById(id); return it && isOwned(it, ctx) }).length
    return { name: col.name, owned, total: col.total, bonus: col.bonus, complete: owned >= col.total, claimed: claimed.has(col.name) }
  }).sort((a, b) => (b.complete && !b.claimed ? 1 : 0) - (a.complete && !a.claimed ? 1 : 0) || b.owned / b.total - a.owned / a.total)
}

export type ClaimResult = { ok: true; bonus: number } | { ok: false; reason: string }

export function claimCollection(uid: number, name: string): ClaimResult {
  const col = COLLECTIONS.find(c => c.name === name)
  if (!col) return { ok: false, reason: 'unknown' }
  const ctx = ownerCtxOf(uid)
  const complete = col.itemIds.every(id => { const it = cosmeticById(id); return it && isOwned(it, ctx) })
  if (!complete) return { ok: false, reason: 'incomplete' }
  const ins = db.prepare('INSERT OR IGNORE INTO collection_claims (user_id, collection) VALUES (?,?)').run(uid, name)
  if (ins.changes === 0) return { ok: false, reason: 'claimed' }
  credit(uid, col.bonus, 'collection', name)
  writeFeed(uid, 'achievement', `собрал(а) коллекцию «${name}»`)
  return { ok: true, bonus: col.bonus }
}
