import { db } from './db'
import { GAMES } from '../../shared/games'

const VALID_GAME_IDS = new Set(GAMES.map(g => g.id))

/** Свежесть присутствия: без пинга дольше этого игрок считается вышедшим. */
export const PRESENCE_TTL_SEC = 180

/** Отметить «игрок сейчас в игре». Вызывается хабом при запуске и играми по пингу. */
export function touchPresence(uid: number, gameId: string): void {
  if (!VALID_GAME_IDS.has(gameId)) return
  db.prepare(
    `INSERT INTO presence (user_id, game_id, updated_at) VALUES (?,?,datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET game_id=excluded.game_id, updated_at=datetime('now')`,
  ).run(uid, gameId)
}

/** Игрок закончил сессию (event=end от сервера игры). */
export function clearPresence(uid: number): void {
  db.prepare('DELETE FROM presence WHERE user_id=?').run(uid)
}

/** Сколько игроков сейчас в каждой игре (свежие записи). */
export function playingCounts(): Record<string, number> {
  const rows = db
    .prepare(
      `SELECT game_id AS id, COUNT(*) AS n FROM presence
        WHERE updated_at > datetime('now', ?) GROUP BY game_id`,
    )
    .all(`-${PRESENCE_TTL_SEC} seconds`) as { id: string; n: number }[]
  const out: Record<string, number> = {}
  for (const r of rows) if (VALID_GAME_IDS.has(r.id)) out[r.id] = r.n
  return out
}

/** В какой игре сейчас каждый из перечисленных игроков (для списка друзей). */
export function presenceOf(userIds: number[]): Map<number, string> {
  if (userIds.length === 0) return new Map()
  const marks = userIds.map(() => '?').join(',')
  const rows = db
    .prepare(
      `SELECT user_id, game_id FROM presence
        WHERE user_id IN (${marks}) AND updated_at > datetime('now', '-${PRESENCE_TTL_SEC} seconds')`,
    )
    .all(...userIds) as { user_id: number; game_id: string }[]
  return new Map(rows.filter(r => VALID_GAME_IDS.has(r.game_id)).map(r => [r.user_id, r.game_id]))
}
