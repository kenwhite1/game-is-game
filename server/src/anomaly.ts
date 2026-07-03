import { db } from './db'
import type { MatchReport } from '../../shared/sdk'

// Анти-чит: скрининг матч-результатов (§16.2). Сервер решает, начислять ли
// награду. При срабатывании правила матч всё равно записан (аудит), но НЕ
// приносит монет/XP/прогресса/ранга — «тихое удержание» (shadow-hold), чтобы не
// плодить ложные баны. Правила ограничены тем, что мы реально знаем из отчёта;
// device/IP-фингерпринт и коллюзия alt-аккаунтов требуют инфраструктуры, которой
// пока нет (отмечено в дорожной карте).

/** Максимум наградных матчей в час по одной игре (глушит фарм-циклы). */
export const MATCHES_PER_HOUR_CAP = 40
/** «Победа» быстрее этого — физически невозможна для честной игры. */
export const MIN_WIN_SECONDS = 3

export interface AnomalyVerdict {
  /** Начислять ли награду/прогресс за этот матч. */
  rewardable: boolean
  /** Код правила, если удержано. */
  reason?: string
}

const flagStmt = db.prepare('INSERT INTO anomaly_flags (user_id, game_id, reason, ts) VALUES (?,?,?,?)')
function hold(uid: number, gameId: string, reason: string): AnomalyVerdict {
  flagStmt.run(uid, gameId, reason, Date.now())
  return { rewardable: false, reason }
}

/** Проверить матч ПЕРЕД начислением. Вызывается из /sdk/result после записи
 *  строки match_results (её наличие — часть проверки частоты). */
export function screenMatch(uid: number, gameId: string, r: MatchReport): AnomalyVerdict {
  // 1) Частота: слишком много матчей в час по одной игре → фарм-цикл.
  const hourAgo = Date.now() - 3600_000
  const lastHour = (db.prepare('SELECT COUNT(*) AS n FROM match_results WHERE user_id=? AND game_id=? AND ts>=?')
    .get(uid, gameId, hourAgo) as { n: number }).n
  if (lastHour > MATCHES_PER_HOUR_CAP) return hold(uid, gameId, 'rate_cap')

  // 2) Невозможная скорость победы.
  if (r.result === 'win' && r.durationSec != null && r.durationSec < MIN_WIN_SECONDS) {
    return hold(uid, gameId, 'too_fast')
  }
  return { rewardable: true }
}

export interface AnomalySummary {
  total: number
  byReason: Record<string, number>
  topUsers: { userId: number; flags: number }[]
}

/** Сводка аномалий за N дней для админ-дашборда (§16.3). */
export function anomalyReport(days = 7): AnomalySummary {
  const since = Date.now() - days * 86400_000
  const total = (db.prepare('SELECT COUNT(*) AS n FROM anomaly_flags WHERE ts>=?').get(since) as { n: number }).n
  const byReason: Record<string, number> = {}
  for (const row of db.prepare('SELECT reason, COUNT(*) AS n FROM anomaly_flags WHERE ts>=? GROUP BY reason').all(since) as { reason: string; n: number }[]) {
    byReason[row.reason] = row.n
  }
  const topUsers = (db.prepare('SELECT user_id AS userId, COUNT(*) AS flags FROM anomaly_flags WHERE ts>=? GROUP BY user_id ORDER BY flags DESC LIMIT 10')
    .all(since) as { userId: number; flags: number }[])
  return { total, byReason, topUsers }
}
