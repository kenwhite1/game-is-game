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
const setStmt = db.prepare(
  `INSERT INTO user_progress (user_id, key, value) VALUES (?,?,?)
   ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value`,
)
/** Абсолютная запись счётчика (для производных величин вроде gg_score). */
export function setProgress(uid: number, key: string, value: number): void {
  setStmt.run(uid, key, value)
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

// Публичная лента (§15.2): заметные мета-события для друзей. ts в формате opens
// (datetime), чтобы ленты сливались по времени.
const feedStmt = db.prepare("INSERT INTO feed_events (user_id, kind, text, ts) VALUES (?,?,?,datetime('now'))")
export function writeFeed(uid: number, kind: 'achievement' | 'streak' | 'level', text: string): void {
  feedStmt.run(uid, kind, text)
}

/** ⑱ Друзья-соперники: первая победа над ДРУГОМ в конкретной игре двигает
 *  distinct-счётчик `frenemies` (нужны id соперников из отчёта). */
export function trackFrenemies(uid: number, gameId: string, result: string, opponents?: number[]): void {
  if (result !== 'win' || !opponents?.length) return
  if (getProgress(uid, `bf_${gameId}`) > 0) return // друга в этой игре уже обыгрывали
  const beatFriend = opponents.some(oid =>
    oid !== uid && db.prepare('SELECT 1 FROM friendships WHERE user_id=? AND friend_id=?').get(uid, oid))
  if (beatFriend) { setProgress(uid, `bf_${gameId}`, 1); bumpProgress(uid, 'frenemies', 1) }
}

/** Санитайзер ключа игровой метрики из report.stats: строчные [a-z0-9_], ≤24 симв.,
 *  с буквы. Ограничивает поверхность (игра не может насорить произвольными строками). */
function statKey(raw: string): string | null {
  const k = raw.toLowerCase().replace(/[^a-z0-9_]/g, '')
  return /^[a-z][a-z0-9_]{0,23}$/.test(k) ? k : null
}

/** Обновить свёрнутые счётчики по результату матча (пожизненные тоталы). §2.5, §7B.
 *  Ключи уровня игры наполняются здесь; достижения (achievements.ts) их читают. */
export function progressMatch(uid: number, gameId: string, r: MatchReport): void {
  bumpProgress(uid, 'matches_played', 1)
  bumpProgress(uid, `matches_game_${gameId}`, 1)
  // Режим (для «Знатока режимов»): раздельные счётчики, из них считается distinct.
  bumpProgress(uid, `pm_${gameId}_${r.mode ?? 'solo'}`, 1)
  // «Успех» = победа ИЛИ финиш (раннеры/пасьянсы рапортуют finish) — для #1/#3/#10.
  const success = r.result === 'win' || r.result === 'finish'
  if (r.result === 'finish') bumpProgress(uid, `finishes_game_${gameId}`, 1)
  if (success) bumpProgress(uid, `successes_game_${gameId}`, 1)
  if (r.result === 'win') {
    // distinct_games_won растёт только при ПЕРВОЙ в жизни победе в этой игре.
    const firstEverWinHere = getProgress(uid, `wins_game_${gameId}`) === 0
    if (firstEverWinHere) bumpProgress(uid, 'distinct_games_won', 1)
    bumpProgress(uid, 'total_wins', 1)
    bumpProgress(uid, `wins_game_${gameId}`, 1)
    const cat = GAME_CAT.get(gameId)
    if (cat) bumpProgress(uid, `wins_cat_${cat}`, 1)
    if (isVsHumans(r.humanPlayers)) {
      bumpProgress(uid, 'humans_beaten', Math.max(1, (r.humanPlayers ?? 2) - 1))
      bumpProgress(uid, `winsvsh_game_${gameId}`, 1)
    }
  }
  // Свободные игровые метрики (§7B): булев true (не в проигрыше) = «фирменный»
  // момент → f_<id>_<flag>; число = накопление → s_<id>_<num>. Игре достаточно
  // прислать нужный ключ — код на хабе для новой игры не нужен.
  if (r.stats) {
    const notLoss = r.result !== 'loss'
    for (const [rawKey, v] of Object.entries(r.stats)) {
      const k = statKey(rawKey)
      if (!k) continue
      if (typeof v === 'boolean') {
        if (v && notLoss) bumpProgress(uid, `f_${gameId}_${k}`, 1)
      } else if (typeof v === 'number' && Number.isFinite(v)) {
        const n = Math.trunc(v)
        if (n > 0) bumpProgress(uid, `s_${gameId}_${k}`, n)
      }
    }
  }
}
