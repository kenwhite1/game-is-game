import { db } from './db'
import { credit } from './ledger'
import { bumpProgress } from './events'
import { FREEZE_CAP } from '../../shared/economy'
import { PASS_PLUS_TIERS, TIER_BOOST_TIERS } from '../../shared/wallet'
import { cosmeticById } from '../../shared/cosmetics'
import {
  currentSeason, tierOf, TRACK, TIERS, XP_PER_TIER, FULL_PASS_XP,
  type Reward, type SeasonView, type SeasonTierView,
} from '../../shared/season'

// Движок сезонного пропуска. Грант предметов делаем инлайном (INSERT в
// cosmetics_owned), чтобы не тянуть server/cosmetics и не создавать цикл
// импортов (cosmetics -> profiles -> season).

const readRow = db.prepare('SELECT xp, premium, claimed FROM season_progress WHERE user_id=? AND season_id=?')
const ensureRow = db.prepare('INSERT OR IGNORE INTO season_progress (user_id, season_id) VALUES (?,?)')

interface Row { xp: number; premium: number; claimed: string }
function row(uid: number, seasonId: string): Row {
  ensureRow.run(uid, seasonId)
  return readRow.get(uid, seasonId) as Row
}
function claimedSet(r: Row): Set<string> {
  try { return new Set(JSON.parse(r.claimed) as string[]) } catch { return new Set() }
}

/** Начислить Season XP в текущий сезон игрока. */
/** Сколько первых финишеров пропуска получают «Первопроходца сезона» (§7A⑲). */
const SEASON_PIONEER_LIMIT = 100

export function grantSeasonXp(uid: number, amount: number): void {
  if (amount <= 0) return
  const s = currentSeason(Date.now())
  ensureRow.run(uid, s.id)
  const before = (db.prepare('SELECT xp FROM season_progress WHERE user_id=? AND season_id=?').get(uid, s.id) as { xp: number } | undefined)?.xp ?? 0
  db.prepare('UPDATE season_progress SET xp = MIN(?, xp + ?) WHERE user_id=? AND season_id=?')
    .run(FULL_PASS_XP, amount, uid, s.id)
  // Первопроходец сезона: впервые добил пропуск до конца и оказался в числе первых.
  if (before < FULL_PASS_XP && before + amount >= FULL_PASS_XP) {
    const finishers = (db.prepare('SELECT COUNT(*) AS n FROM season_progress WHERE season_id=? AND xp>=?').get(s.id, FULL_PASS_XP) as { n: number }).n
    if (finishers <= SEASON_PIONEER_LIMIT) bumpProgress(uid, 'season_pioneer', 1)
  }
}

function payReward(uid: number, reward: Reward, ref: string): void {
  if (reward.kind === 'coins') {
    credit(uid, reward.amount, 'season', ref)
  } else if (reward.kind === 'item') {
    if (cosmeticById(reward.itemId)) {
      db.prepare('INSERT OR IGNORE INTO cosmetics_owned (user_id, item_id) VALUES (?,?)').run(uid, reward.itemId)
    }
  } else {
    db.prepare('UPDATE users SET streak_freezes = MIN(?, streak_freezes + ?) WHERE id=?').run(FREEZE_CAP, reward.count, uid)
  }
}

export type ClaimResult = { ok: true; reward: Reward } | { ok: false; reason: 'locked' | 'claimed' | 'no_premium' | 'bad' }

/** Забрать награду тира по треку ('free' | 'premium'). Идемпотентно по ключу. */
export function claimTier(uid: number, tier: number, track: 'free' | 'premium'): ClaimResult {
  const def = TRACK.find(r => r.tier === tier)
  if (!def) return { ok: false, reason: 'bad' }
  const reward = track === 'free' ? def.free : def.premium
  if (!reward) return { ok: false, reason: 'bad' }
  const s = currentSeason(Date.now())
  const r = row(uid, s.id)
  if (tierOf(r.xp) < tier) return { ok: false, reason: 'locked' }
  if (track === 'premium' && r.premium !== 1) return { ok: false, reason: 'no_premium' }
  const key = `${track === 'free' ? 'f' : 'p'}${tier}`
  const claimed = claimedSet(r)
  if (claimed.has(key)) return { ok: false, reason: 'claimed' }
  const out = db.transaction((): ClaimResult => {
    // Перечитываем под транзакцией, чтобы не задвоить награду при гонке.
    const fresh = readRow.get(uid, s.id) as Row
    const cs = claimedSet(fresh)
    if (cs.has(key)) return { ok: false, reason: 'claimed' }
    cs.add(key)
    db.prepare('UPDATE season_progress SET claimed=? WHERE user_id=? AND season_id=?').run(JSON.stringify([...cs]), uid, s.id)
    payReward(uid, reward, `${s.id}:${key}`)
    return { ok: true, reward }
  })()
  return out
}

/** Открыть премиум-трек текущего сезона (после оплаты ⭐). Идемпотентно. */
export function unlockPremium(uid: number): boolean {
  const s = currentSeason(Date.now())
  ensureRow.run(uid, s.id)
  const r = readRow.get(uid, s.id) as Row
  if (r.premium === 1) return false
  db.prepare('UPDATE season_progress SET premium=1 WHERE user_id=? AND season_id=?').run(uid, s.id)
  return true
}

/** «Пропуск+» (§11.1): открыть премиум И сразу выдать +10 тиров (Season XP). */
export function unlockPremiumPlus(uid: number): void {
  unlockPremium(uid)
  grantSeasonXp(uid, PASS_PLUS_TIERS * XP_PER_TIER)
}

/** «Буст тиров»: разовая покупка за ⭐ — мгновенно продвинуть по пропуску. */
export function boostTiers(uid: number): void {
  grantSeasonXp(uid, TIER_BOOST_TIERS * XP_PER_TIER)
}

export function seasonView(uid: number): SeasonView {
  const s = currentSeason(Date.now())
  const r = row(uid, s.id)
  const tier = tierOf(r.xp)
  const claimed = claimedSet(r)
  let claimable = 0
  const rows: SeasonTierView[] = TRACK.map(t => {
    const unlocked = tier >= t.tier
    const freeClaimed = claimed.has(`f${t.tier}`)
    const premiumClaimed = claimed.has(`p${t.tier}`)
    if (unlocked && t.free && !freeClaimed) claimable++
    if (unlocked && r.premium === 1 && t.premium && !premiumClaimed) claimable++
    return { tier: t.tier, free: t.free, premium: t.premium, freeClaimed, premiumClaimed, unlocked }
  })
  return {
    season: s, xp: r.xp, tier, tiers: TIERS, xpPerTier: XP_PER_TIER,
    premium: r.premium === 1, endsMs: s.endMs, claimable, rows,
  }
}
