import { db } from './db'
import { GAMES } from '../../shared/games'
import { getProgress, setProgress } from './events'

// Дневные ладдеры (§7A ⑤⑥⑦): считаем «в один день» и «разные игры по дням».
// Пиковые значения кладём в user_progress как обычные счётчики, чтобы достижения
// читали их так же, как остальное. Достижение «в один день» остаётся открытым
// навсегда, потому что храним МАКСИМУМ за любой день.

const GAME_CAT = new Map(GAMES.map(g => [g.id, g.category]))

/** Записать значение только если оно больше уже сохранённого (пик). */
function setMax(uid: number, key: string, value: number): void {
  if (value > getProgress(uid, key)) setProgress(uid, key, value)
}

function mskDay(ts = Date.now()): string {
  return new Date(ts + 3 * 3600 * 1000).toISOString().slice(0, 10)
}
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000)
}

/** Пики «за сегодня»: разных игр сыграно (⑦) и разных жанров выиграно (⑥). */
export function updateDayPeaks(uid: number): void {
  const gamesToday = (db.prepare(
    "SELECT COUNT(DISTINCT game_id) AS n FROM opens WHERE user_id=? AND date(ts,'+3 hours')=date('now','+3 hours')",
  ).get(uid) as { n: number }).n
  setMax(uid, 'day_games', gamesToday)

  const wonGames = db.prepare(
    "SELECT DISTINCT game_id FROM match_results WHERE user_id=? AND result='win' AND date(ts/1000,'unixepoch','+3 hours')=date('now','+3 hours')",
  ).all(uid) as { game_id: string }[]
  const cats = new Set<string>()
  for (const r of wonGames) { const c = GAME_CAT.get(r.game_id); if (c) cats.add(c) }
  setMax(uid, 'day_cats', cats.size)
}

/** ⑤ Марафон разнообразия: серия дней, где первая игра дня ≠ игре прошлого дня. */
export function varietyTick(uid: number, gameId: string): void {
  const today = mskDay()
  const u = db.prepare('SELECT variety_last_day AS d, variety_last_game AS g, variety_streak AS s FROM users WHERE id=?')
    .get(uid) as { d: string | null; g: string | null; s: number } | undefined
  if (!u || u.d === today) return // считаем только первый заход за день
  const consecutive = u.d != null && daysBetween(u.d, today) === 1
  const streak = consecutive && u.g && u.g !== gameId ? u.s + 1 : 1
  db.prepare('UPDATE users SET variety_last_day=?, variety_last_game=?, variety_streak=? WHERE id=?').run(today, gameId, streak, uid)
  setMax(uid, 'variety_best', streak)
}
