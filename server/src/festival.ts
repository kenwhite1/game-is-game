import { db } from './db'
import { credit } from './ledger'
import { cosmeticById } from '../../shared/cosmetics'
import { GAMES } from '../../shared/games'
import {
  activeFestival, festivalById, TOKEN_TO_COIN,
  type Festival, type EventStat, type FestivalView,
} from '../../shared/festival'

const GAME_CAT = new Map(GAMES.map(g => [g.id, g.category]))

// Движок событий: токены, событийные квесты, магазин за 🎟 и общая цель.
// Грант предметов инлайном (без server/cosmetics) — чтобы не плодить цикл.

function startDate(f: Festival): string {
  return new Date(f.startMs).toISOString().slice(0, 10)
}

const readTokens = db.prepare('SELECT tokens FROM event_tokens WHERE user_id=? AND event_id=?')
const ensureTokens = db.prepare('INSERT OR IGNORE INTO event_tokens (user_id, event_id) VALUES (?,?)')
function tokensOf(uid: number, eventId: string): number {
  return (readTokens.get(uid, eventId) as { tokens: number } | undefined)?.tokens ?? 0
}
function addTokens(uid: number, eventId: string, delta: number): void {
  ensureTokens.run(uid, eventId)
  db.prepare('UPDATE event_tokens SET tokens = MAX(0, tokens + ?) WHERE user_id=? AND event_id=?').run(delta, uid, eventId)
}

function claimedSet(uid: number, eventId: string): Set<string> {
  return new Set(
    (db.prepare('SELECT claim_id FROM event_claims WHERE user_id=? AND event_id=?').all(uid, eventId) as { claim_id: string }[])
      .map(r => r.claim_id),
  )
}
function markClaimed(uid: number, eventId: string, claimId: string): boolean {
  return db.prepare('INSERT OR IGNORE INTO event_claims (user_id, event_id, claim_id) VALUES (?,?,?)').run(uid, eventId, claimId).changes > 0
}

function grantItem(uid: number, itemId: string): void {
  if (cosmeticById(itemId)) db.prepare('INSERT OR IGNORE INTO cosmetics_owned (user_id, item_id) VALUES (?,?)').run(uid, itemId)
}

// ── Прогресс событийных квестов (окно — с начала события) ──────────────────
function statValue(uid: number, stat: EventStat, since: string): number {
  const q: Record<EventStat, string> = {
    distinct_since: 'SELECT COUNT(DISTINCT game_id) AS n FROM opens WHERE user_id=? AND date(ts) >= ?',
    opens_since: 'SELECT COUNT(*) AS n FROM opens WHERE user_id=? AND date(ts) >= ?',
    rate_since: 'SELECT COUNT(*) AS n FROM ratings WHERE user_id=? AND date(updated_at) >= ?',
  }
  return (db.prepare(q[stat]).get(uid, since) as { n: number }).n
}

// ── Общий счётчик события ───────────────────────────────────────────────────
export function tickCommunity(amount = 1): void {
  const f = activeFestival(Date.now())
  if (!f) return
  db.prepare(`INSERT INTO event_community (event_id, value) VALUES (?, ?)
              ON CONFLICT(event_id) DO UPDATE SET value = value + excluded.value`).run(f.id, amount)
}
function communityValue(eventId: string): number {
  return (db.prepare('SELECT value FROM event_community WHERE event_id=?').get(eventId) as { value: number } | undefined)?.value ?? 0
}

/** §12.2 множитель-уикенд: победа в spotlight-жанре активного события даёт
 *  бонусные 🎟. Возвращает начисленные токены (0 — если не подошло). */
export function awardMatchTokens(uid: number, gameId: string, result: string): number {
  if (result !== 'win') return 0
  const f = activeFestival(Date.now())
  if (!f?.spotlight || GAME_CAT.get(gameId) !== f.spotlight.category) return 0
  addTokens(uid, f.id, f.spotlight.tokens)
  return f.spotlight.tokens
}

/** Сгоревшие токены завершившихся событий -> 10% монетами (лениво, идемпотентно). */
export function settleExpired(uid: number): void {
  const rows = db.prepare('SELECT event_id, tokens, settled FROM event_tokens WHERE user_id=? AND settled=0').all(uid) as { event_id: string; tokens: number; settled: number }[]
  const now = Date.now()
  for (const r of rows) {
    const f = festivalById(r.event_id)
    if (!f || now < f.endMs) continue // ещё идёт
    const coins = Math.floor(r.tokens * TOKEN_TO_COIN)
    db.prepare('UPDATE event_tokens SET tokens=0, settled=1 WHERE user_id=? AND event_id=?').run(uid, r.event_id)
    if (coins > 0) credit(uid, coins, 'season', `${r.event_id}:tokens_expire`)
  }
}

export function festivalView(uid: number): FestivalView | null {
  const f = activeFestival(Date.now())
  if (!f) return null
  const since = startDate(f)
  const claimed = claimedSet(uid, f.id)
  const owned = new Set((db.prepare('SELECT item_id FROM cosmetics_owned WHERE user_id=?').all(uid) as { item_id: string }[]).map(r => r.item_id))
  const cval = communityValue(f.id)
  return {
    id: f.id, name: f.name, emoji: f.emoji, endsMs: f.endMs, tokens: tokensOf(uid, f.id),
    quests: f.quests.map(q => {
      const progress = Math.min(statValue(uid, q.stat, since), q.target)
      return { id: q.id, title: q.title, emoji: q.emoji, target: q.target, tokens: q.tokens, progress, done: progress >= q.target, claimed: claimed.has(q.id) }
    }),
    shop: f.shop.map(s => ({ itemId: s.itemId, name: cosmeticById(s.itemId)?.name ?? s.itemId, tokens: s.tokens, owned: owned.has(s.itemId) })),
    community: {
      title: f.community.title, value: cval, target: f.community.target,
      reached: cval >= f.community.target, claimed: claimed.has('_community'),
      rewardName: cosmeticById(f.community.rewardItemId)?.name ?? f.community.rewardItemId,
    },
  }
}

// ── Действия ────────────────────────────────────────────────────────────────
export type EventClaimResult = { ok: true; tokens: number } | { ok: false; reason: 'unknown' | 'not_done' | 'claimed' | 'no_event' }

export function claimEventQuest(uid: number, questId: string): EventClaimResult {
  const f = activeFestival(Date.now())
  if (!f) return { ok: false, reason: 'no_event' }
  const q = f.quests.find(x => x.id === questId)
  if (!q) return { ok: false, reason: 'unknown' }
  if (statValue(uid, q.stat, startDate(f)) < q.target) return { ok: false, reason: 'not_done' }
  if (!markClaimed(uid, f.id, q.id)) return { ok: false, reason: 'claimed' }
  addTokens(uid, f.id, q.tokens)
  return { ok: true, tokens: q.tokens }
}

export function claimCommunity(uid: number): EventClaimResult {
  const f = activeFestival(Date.now())
  if (!f) return { ok: false, reason: 'no_event' }
  if (communityValue(f.id) < f.community.target) return { ok: false, reason: 'not_done' }
  if (!markClaimed(uid, f.id, '_community')) return { ok: false, reason: 'claimed' }
  grantItem(uid, f.community.rewardItemId)
  return { ok: true, tokens: 0 }
}

export type BuyResult = { ok: true } | { ok: false; reason: 'unknown' | 'owned' | 'too_poor' | 'no_event' }

export function buyEventItem(uid: number, itemId: string): BuyResult {
  const f = activeFestival(Date.now())
  if (!f) return { ok: false, reason: 'no_event' }
  const item = f.shop.find(s => s.itemId === itemId)
  if (!item) return { ok: false, reason: 'unknown' }
  const already = db.prepare('SELECT 1 FROM cosmetics_owned WHERE user_id=? AND item_id=?').get(uid, itemId)
  if (already) return { ok: false, reason: 'owned' }
  const out = db.transaction((): BuyResult => {
    if (tokensOf(uid, f.id) < item.tokens) return { ok: false, reason: 'too_poor' }
    addTokens(uid, f.id, -item.tokens)
    grantItem(uid, itemId)
    return { ok: true }
  })()
  return out
}
