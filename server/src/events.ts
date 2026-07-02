import { db } from './db'
import { GAMES } from '../../shared/games'
import { isVsHumans } from '../../shared/economy'
import type { MatchReport } from '../../shared/sdk'

// Внутренняя шина событий + свёрнутые счётчики прогресса (§2.4, §2.5). Все
// системы (достижения/квесты/ранги) читают user_progress, а не гоняют тяжёлые
// запросы. event_log — append-only поток для реплея/аудита.

const GAME_CAT = new Map(GAMES.map(g => [g.id, g.category]))

const bumpStmt = db.prepare(
  `INSERT INTO user_progress (user_id, key, value) VALUES (?,?,?)
   ON CONFLICT(user_id, key) DO UPDATE SET value = value + excluded.value`,
)
const readStmt = db.prepare('SELECT value FROM user_progress WHERE user_id=? AND key=?')
const logStmt = db.prepare('INSERT INTO event_log (user_id, kind, payload_json, ts) VALUES (?,?,?,?)')

export function bumpProgress(uid: number, key: string, delta = 1): void {
  bumpStmt.run(uid, key, delta)
}
export function getProgress(uid: number, key: string): number {
  return (readStmt.get(uid, key) as { value: number } | undefined)?.value ?? 0
}
/** Все счётчики игрока одним объектом (для достижений/профиля). */
export function progressMap(uid: number): Record<string, number> {
  const rows = db.prepare('SELECT key, value FROM user_progress WHERE user_id=?').all(uid) as { key: string; value: number }[]
  const out: Record<string, number> = {}
  for (const r of rows) out[r.key] = r.value
  return out
}

export function logEvent(uid: number, kind: string, payload: Record<string, unknown>): void {
  logStmt.run(uid, kind, JSON.stringify(payload), Date.now())
}

/** Обновить свёрнутые счётчики по результату матча (пожизненные тоталы). */
export function progressMatch(uid: number, gameId: string, r: MatchReport): void {
  bumpProgress(uid, 'matches_played', 1)
  if (r.result === 'win') {
    // distinct_games_won растёт только при ПЕРВОЙ в жизни победе в этой игре.
    const firstEverWinHere = getProgress(uid, `wins_game_${gameId}`) === 0
    if (firstEverWinHere) bumpProgress(uid, 'distinct_games_won', 1)
    bumpProgress(uid, 'total_wins', 1)
    bumpProgress(uid, `wins_game_${gameId}`, 1)
    const cat = GAME_CAT.get(gameId)
    if (cat) bumpProgress(uid, `wins_cat_${cat}`, 1)
    if (isVsHumans(r.humanPlayers)) bumpProgress(uid, 'humans_beaten', Math.max(1, (r.humanPlayers ?? 2) - 1))
  }
}
