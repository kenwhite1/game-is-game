import { z } from 'zod'
import { db } from './db'
import { credit, debit } from './ledger'
import { tickStreak } from './streak'
import { progressMatch, logEvent, trackFrenemies } from './events'
import { getProfile } from './profiles'
import { syncAchievements } from './achievements'
import { updateDayPeaks } from './dayladders'
import { awardMatchTokens } from './festival'
import { tickCoop } from './coop'
import { grantSeasonXp } from './season'
import { SEASON_XP } from '../../shared/season'
import { grantAccountXp } from './xp'
import { updateRating } from './ranked'
import { screenMatch } from './anomaly'
import { matchReward, MATCH_COIN_CAP, GAME_EARN_CAP, type CoinReason } from '../../shared/economy'
import type { MatchReport, ReportResponse } from '../../shared/sdk'

// Реализация /api/sdk/result (§2.2). Хаб - единственный, кто считает награды.
// Игра присылает исход + токен запуска; хаб проверяет подпись, дедупит по
// idempotencyKey, начисляет по СВОИМ таблицам и тикает прогресс/серию.

const reportSchema = z.object({
  idempotencyKey: z.string().min(1).max(160),
  result: z.enum(['win', 'loss', 'draw', 'finish']),
  placement: z.number().int().min(1).max(1000).optional(),
  players: z.number().int().min(1).max(1000).optional(),
  humanPlayers: z.number().int().min(0).max(1000).optional(),
  score: z.number().int().min(-1_000_000).max(1_000_000).optional(),
  durationSec: z.number().int().min(0).max(86_400).optional(),
  mode: z.enum(['multi', 'solo', 'friends']).optional(),
  stats: z.record(z.union([z.number(), z.boolean(), z.string()])).optional(),
  opponents: z.array(z.number().int().positive()).max(64).optional(),
})

/** Монеты с матчей, уже начисленные сегодня (для дневного потолка). */
function matchCoinsToday(uid: number): number {
  const r = db.prepare(
    `SELECT COALESCE(SUM(delta),0) AS n FROM coin_ledger
     WHERE user_id=? AND reason IN ('match_played','match_won','match_firstwin')
       AND date(ts/1000,'unixepoch')=date('now')`,
  ).get(uid) as { n: number }
  return r.n
}

/** Первая ли это победа за СЕГОДНЯ в этой игре (для бонуса FIRST_WIN_OF_DAY). */
function isFirstWinToday(uid: number, gameId: string): boolean {
  const r = db.prepare(
    `SELECT COUNT(*) AS n FROM match_results
     WHERE user_id=? AND game_id=? AND result='win' AND date(ts/1000,'unixepoch')=date('now')`,
  ).get(uid, gameId) as { n: number }
  return r.n === 0
}

// ─── Единая валюта G: баланс и трата из игр (§Кошелёк) ────────────────────
// Игры не держат своей валюты - на весь проект один счёт G (users.coins).
// Игра читает баланс и тратит G по токену запуска; хаб - единственная точка
// изменения баланса (ledger), поэтому трата аудируема и идемпотентна.

/** Текущий баланс G игрока. */
export function sdkBalance(uid: number): { ok: true; coins: number } {
  return { ok: true, coins: getProfile(uid)?.coins ?? 0 }
}

const spendSchema = z.object({
  amount: z.number().int().min(1).max(1_000_000),
  reason: z.enum(['cosmetic', 'market_buy', 'purchase', 'challenge', 'collection']).optional(),
  ref: z.string().min(1).max(160).optional(),
  /** Дедуп: одна и та же трата не спишется дважды при повторе. */
  idempotencyKey: z.string().min(1).max(160).optional(),
})

export interface SpendOutcome { status: number; body: { ok: boolean; coins: number; error?: string } }

/** Списать G из игры. Идемпотентно по idempotencyKey (если задан). */
export function handleSpend(rawBody: unknown, claims: { uid: number; gid: string }): SpendOutcome {
  const parsed = spendSchema.safeParse(rawBody)
  if (!parsed.success) return { status: 400, body: { ok: false, coins: 0, error: 'bad_request' } }
  const { uid, gid } = claims
  const { amount, reason, idempotencyKey } = parsed.data
  const ref = idempotencyKey ?? parsed.data.ref ?? gid
  // Дедуп: если по этому ключу уже была трата - вернуть текущий баланс, не списывая.
  if (idempotencyKey) {
    const dup = db.prepare("SELECT 1 FROM coin_ledger WHERE ref=? AND delta<0 LIMIT 1").get(ref)
    if (dup) return { status: 200, body: { ok: true, coins: getProfile(uid)?.coins ?? 0, error: 'duplicate' } }
  }
  const okSpend = debit(uid, amount, reason ?? 'cosmetic', ref)
  if (!okSpend) return { status: 402, body: { ok: false, coins: getProfile(uid)?.coins ?? 0, error: 'too_poor' } }
  return { status: 200, body: { ok: true, coins: getProfile(uid)?.coins ?? 0 } }
}

// ─── Заработок G из игр (§Кошелёк, /api/sdk/earn) ─────────────────────────
// Игра начисляет G за игровые события (килл, собранный ресурс…). Хаб - единая
// точка изменения баланса: идемпотентно по ключу, с общим дневным потолком,
// чтобы скомпрометированная игра не печатала валюту без предела.
const earnSchema = z.object({
  amount: z.number().int().min(1).max(100_000),
  reason: z.string().min(1).max(48).optional(),
  ref: z.string().min(1).max(160).optional(),
  idempotencyKey: z.string().min(1).max(160).optional(),
})

/** G, уже заработанные из игр сегодня (для дневного потолка). */
function gameEarnToday(uid: number): number {
  const r = db.prepare(
    `SELECT COALESCE(SUM(delta),0) AS n FROM coin_ledger
     WHERE user_id=? AND reason='game_earn' AND delta>0
       AND date(ts/1000,'unixepoch')=date('now')`,
  ).get(uid) as { n: number }
  return r.n
}

export interface EarnOutcome { status: number; body: { ok: boolean; coins: number; credited?: number; capped?: boolean; error?: string } }

/** Начислить G из игры. Идемпотентно; применяется общий дневной потолок. */
export function handleEarn(rawBody: unknown, claims: { uid: number; gid: string }): EarnOutcome {
  const parsed = earnSchema.safeParse(rawBody)
  if (!parsed.success) return { status: 400, body: { ok: false, coins: 0, error: 'bad_request' } }
  const { uid, gid } = claims
  const { amount, reason, idempotencyKey } = parsed.data
  const ref = idempotencyKey ?? parsed.data.ref ?? `${gid}:earn`
  // Дедуп: тот же ключ не начислит дважды при повторе (сетевой ретрай).
  if (idempotencyKey) {
    const dup = db.prepare("SELECT 1 FROM coin_ledger WHERE ref=? AND delta>0 LIMIT 1").get(ref)
    if (dup) return { status: 200, body: { ok: true, coins: getProfile(uid)?.coins ?? 0, credited: 0, error: 'duplicate' } }
  }
  // Дневной потолок заработка из игр (анти-инфляция). reason игры - для аудита,
  // в ledger всё пишется как 'game_earn' (единый код для потолка).
  const remaining = Math.max(0, GAME_EARN_CAP - gameEarnToday(uid))
  const give = Math.min(amount, remaining)
  if (give <= 0) return { status: 200, body: { ok: true, coins: getProfile(uid)?.coins ?? 0, credited: 0, capped: true } }
  const auditRef = reason ? `${gid}:${reason}:${ref}`.slice(0, 160) : ref
  const coins = credit(uid, give, 'game_earn', auditRef)
  return { status: 200, body: { ok: true, coins, credited: give, capped: give < amount } }
}

export interface SdkOutcome { status: number; body: ReportResponse }

export function handleResult(launchToken: string | undefined, rawBody: unknown, claims: { uid: number; gid: string }): SdkOutcome {
  const parsed = reportSchema.safeParse(rawBody)
  if (!parsed.success) return { status: 400, body: { ok: false, rewarded: false, coins: 0, error: 'bad_request' } }
  const rep: MatchReport = parsed.data
  const { uid, gid: gameId } = claims

  // Считаем «первая победа дня» ДО вставки строки этого матча.
  const firstWinToday = rep.result === 'win' && isFirstWinToday(uid, gameId)

  // Идемпотентность: вставка по уникальному ключу. Повтор - не платим снова.
  const ins = db.prepare(
    `INSERT OR IGNORE INTO match_results
       (user_id, game_id, result, placement, players, human_players, score, duration_sec, mode, idempotency_key, ts)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    uid, gameId, rep.result, rep.placement ?? null, rep.players ?? null, rep.humanPlayers ?? null,
    rep.score ?? null, rep.durationSec ?? null, rep.mode ?? null, rep.idempotencyKey, Date.now(),
  )
  if (ins.changes === 0) {
    const p = getProfile(uid)
    return { status: 200, body: { ok: true, rewarded: false, coins: p?.coins ?? 0, error: 'duplicate' } }
  }

  // Анти-чит (§16.2): скрининг ПЕРЕД начислением. Матч уже записан (аудит), но
  // при аномалии не приносит наград/прогресса/ранга - тихое удержание, не бан.
  const verdict = screenMatch(uid, gameId, rep)
  if (!verdict.rewardable) {
    logEvent(uid, 'match_held', { gameId, reason: verdict.reason })
    const p = getProfile(uid)
    return { status: 200, body: { ok: true, rewarded: false, coins: p?.coins ?? 0, error: verdict.reason } }
  }

  // Награды считает хаб; применяем дневной потолок покомпонентно.
  const reward = matchReward({ result: rep.result, humanPlayers: rep.humanPlayers, firstWinToday })
  let remaining = Math.max(0, MATCH_COIN_CAP - matchCoinsToday(uid))
  const pay = (amount: number, reason: CoinReason) => {
    const give = Math.min(amount, remaining)
    if (give > 0) { credit(uid, give, reason, gameId); remaining -= give }
  }
  pay(reward.played, 'match_played')
  pay(reward.won, 'match_won')
  pay(reward.firstWin, 'match_firstwin')

  // Season + Account XP за матч (§5, §11), не зависят от дневного кап-а монет.
  const mxp = SEASON_XP.matchPlayed + (rep.result === 'win' ? SEASON_XP.matchWon : 0) + (firstWinToday ? SEASON_XP.firstWinOfDay : 0)
  grantSeasonXp(uid, mxp); grantAccountXp(uid, mxp)

  // Прогресс, лог события и серия (матч - это игра дня).
  progressMatch(uid, gameId, rep)
  logEvent(uid, 'match_result', { gameId, result: rep.result, players: rep.players, humanPlayers: rep.humanPlayers, mode: rep.mode })
  tickStreak(uid)
  updateDayPeaks(uid) // §7A ⑥: пик выигранных жанров за день (для «Семь на семь»)
  awardMatchTokens(uid, gameId, rep.result) // §12.2: бонусные 🎟 в spotlight-жанре
  if (rep.result === 'win') tickCoop(uid) // §8.3: победа двигает общий кооп-таргет
  // Победы двигают достижения (Центурион, мастера категорий, «люди»…).
  syncAchievements(uid)
  // Ранговый рейтинг (только скилл-игры против людей; Glicko-2 при наличии id).
  updateRating(uid, gameId, rep.result, rep.humanPlayers, rep.opponents)
  trackFrenemies(uid, gameId, rep.result, rep.opponents) // §7A ⑱: победа над другом

  const p = getProfile(uid)
  return { status: 200, body: { ok: true, rewarded: reward.total > 0, coins: p?.coins ?? 0 } }
}
