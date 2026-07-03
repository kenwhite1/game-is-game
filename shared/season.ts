// Сезонный пропуск (§11 библии): D30/LTV-движок и главный ⭐-сток. ~8-недельные
// сезоны, 50 тиров по 600 Season XP. Два трека: бесплатный (все) и премиум
// (⭐). Уже заработанные премиум-награды остаются доступными после конца сезона
// (anti-FOMO). Единый источник правды: клиент и сервер считают сезон/тир одинаково.

export const SEASON_LENGTH_DAYS = 56
export const TIERS = 50
export const XP_PER_TIER = 600
export const FULL_PASS_XP = TIERS * XP_PER_TIER // 30 000

// Якорь первого сезона (понедельник, UTC). Номер сезона считается от него.
const EPOCH_MS = Date.parse('2026-06-01T00:00:00Z')
const SEASON_MS = SEASON_LENGTH_DAYS * 86_400_000

export interface SeasonInfo {
  id: string
  index: number
  name: string
  startMs: number
  endMs: number
}

export function currentSeason(nowMs: number): SeasonInfo {
  const idx = Math.max(0, Math.floor((nowMs - EPOCH_MS) / SEASON_MS))
  const startMs = EPOCH_MS + idx * SEASON_MS
  return { id: `s${idx + 1}`, index: idx, name: `Сезон ${idx + 1}`, startMs, endMs: startMs + SEASON_MS }
}

/** Достигнутый тир по опыту (0..50). */
export function tierOf(xp: number): number {
  return Math.max(0, Math.min(TIERS, Math.floor(xp / XP_PER_TIER)))
}

export type Reward =
  | { kind: 'coins'; amount: number }
  | { kind: 'item'; itemId: string }
  | { kind: 'freeze'; count: number }

export interface TierRow {
  tier: number // 1..50
  free: Reward | null
  premium: Reward | null
}

// Награды по тирам. Существующие косметики раздаём как призы (грант владения);
// большая часть — монеты и заморозки. Премиум щедрее и с «сезонными» вещами.
const PREMIUM_ITEMS: Record<number, string> = {
  5: 'frame_electric', 10: 'title_pro', 20: 'frame_amethyst',
  30: 'frame_diamond', 40: 'title_vip', 50: 'frame_glitch',
}
const FREE_ITEMS: Record<number, string> = { 25: 'c_candy', 50: 'title_mythic' }

function buildTrack(): TierRow[] {
  const rows: TierRow[] = []
  for (let t = 1; t <= TIERS; t++) {
    const free: Reward = FREE_ITEMS[t]
      ? { kind: 'item', itemId: FREE_ITEMS[t] }
      : t % 10 === 0
        ? { kind: 'freeze', count: 1 }
        : { kind: 'coins', amount: 50 + Math.floor(t / 10) * 20 }
    const premium: Reward = PREMIUM_ITEMS[t]
      ? { kind: 'item', itemId: PREMIUM_ITEMS[t] }
      : t % 5 === 0
        ? { kind: 'freeze', count: 1 }
        : { kind: 'coins', amount: 100 + Math.floor(t / 5) * 20 }
    rows.push({ tier: t, free, premium })
  }
  return rows
}

export const TRACK: TierRow[] = buildTrack()

// ── Модель витрины (общая для сервера и клиента) ──────────────────────────
export interface SeasonTierView {
  tier: number
  free: Reward | null
  premium: Reward | null
  freeClaimed: boolean
  premiumClaimed: boolean
  unlocked: boolean
}
export interface SeasonView {
  season: SeasonInfo
  xp: number
  tier: number
  tiers: number
  xpPerTier: number
  premium: boolean
  endsMs: number
  /** Сколько наград можно забрать прямо сейчас. */
  claimable: number
  rows: SeasonTierView[]
}

// ── Начисления Season XP (Appendix A) ──────────────────────────────────────
export const SEASON_XP = {
  launchBreadth: 15, // за первый за день запуск новой игры (пока нет SDK у всех)
  streakDay: 10,
  matchPlayed: 20,
  matchWon: 15,
  firstWinOfDay: 25,
  dailyQuest: 40,
  dailyBonus: 50,
  weeklyQuest: 150,
  weeklyBonus: 200,
}
