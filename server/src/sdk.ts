import { z } from 'zod'
import { db } from './db'
import { credit } from './ledger'
import { tickStreak } from './streak'
import { progressMatch, logEvent } from './events'
import { getProfile } from './profiles'
import { syncAchievements } from './achievements'
import { matchReward, MATCH_COIN_CAP, type CoinReason } from '../../shared/economy'
import type { MatchReport, ReportResponse } from '../../shared/sdk'

// Реализация /api/sdk/result (§2.2). Хаб — единственный, кто считает награды.
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

export interface SdkOutcome { status: number; body: ReportResponse }

export function handleResult(launchToken: string | undefined, rawBody: unknown, claims: { uid: number; gid: string }): SdkOutcome {
  const parsed = reportSchema.safeParse(rawBody)
  if (!parsed.success) return { status: 400, body: { ok: false, rewarded: false, coins: 0, error: 'bad_request' } }
  const rep: MatchReport = parsed.data
  const { uid, gid: gameId } = claims

  // Считаем «первая победа дня» ДО вставки строки этого матча.
  const firstWinToday = rep.result === 'win' && isFirstWinToday(uid, gameId)

  // Идемпотентность: вставка по уникальному ключу. Повтор — не платим снова.
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

  // Прогресс, лог события и серия (матч — это игра дня).
  progressMatch(uid, gameId, rep)
  logEvent(uid, 'match_result', { gameId, result: rep.result, players: rep.players, humanPlayers: rep.humanPlayers, mode: rep.mode })
  tickStreak(uid)
  // Победы двигают достижения (Центурион, мастера категорий, «люди»…).
  syncAchievements(uid)

  const p = getProfile(uid)
  return { status: 200, body: { ok: true, rewarded: reward.total > 0, coins: p?.coins ?? 0 } }
}
