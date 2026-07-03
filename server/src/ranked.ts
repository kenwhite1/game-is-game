import { db } from './db'
import { GAMES } from '../../shared/games'
import { currentSeason } from '../../shared/season'
import {
  RANKED_GAMES, START_RATING, kFactor, expectedScore,
  divisionLabel, ladderContribution,
  type RankedView, type RankedGameView, type Boards, type BoardRow,
} from '../../shared/ranked'

// Рейтинговый движок: Elo-против-поля per-game/сезон + агрегат GG-лиги + доски.

const GAME_NAME = new Map(GAMES.map(g => [g.id, g.name]))

function seasonId(): string { return currentSeason(Date.now()).id }

const readRating = db.prepare('SELECT rating, games, peak FROM ranked_ratings WHERE user_id=? AND game_id=? AND season_id=?')
const ensureRating = db.prepare('INSERT OR IGNORE INTO ranked_ratings (user_id, game_id, season_id) VALUES (?,?,?)')

/** Обновить рейтинг игрока по результату рангового матча против людей. */
export function updateRating(uid: number, gameId: string, result: string, humanPlayers?: number): void {
  if (!RANKED_GAMES.has(gameId)) return
  if ((humanPlayers ?? 1) < 2) return // только против людей
  const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : result === 'loss' ? 0 : -1
  if (score < 0) return // 'finish' и прочее ранг не двигают
  const sid = seasonId()
  ensureRating.run(uid, gameId, sid)
  const cur = readRating.get(uid, gameId, sid) as { rating: number; games: number; peak: number }
  const next = cur.rating + kFactor(cur.games) * (score - expectedScore(cur.rating))
  const peak = Math.max(cur.peak, next)
  db.prepare('UPDATE ranked_ratings SET rating=?, games=games+1, peak=? WHERE user_id=? AND game_id=? AND season_id=?')
    .run(next, peak, uid, gameId, sid)
}

/** Ранги игрока по всем ранговым играм текущего сезона + агрегат GG-лиги. */
export function rankedOf(uid: number): RankedView {
  const sid = seasonId()
  const rows = db.prepare('SELECT game_id, rating, games, peak FROM ranked_ratings WHERE user_id=? AND season_id=? AND games>0 ORDER BY rating DESC')
    .all(uid, sid) as { game_id: string; rating: number; games: number; peak: number }[]
  const games: RankedGameView[] = rows.map(r => ({
    gameId: r.game_id,
    name: GAME_NAME.get(r.game_id) ?? r.game_id,
    rating: Math.round(r.rating),
    games: r.games,
    division: divisionLabel(r.rating),
    peakDivision: divisionLabel(r.peak),
  }))
  const ladder = rows.reduce((sum, r) => sum + ladderContribution(r.rating), 0)
  return { ladder, games }
}

/** GG-лига: агрегат вклада по ранговым играм, топ игроков сезона. */
function ggLadderTop(uid: number, limit = 20): BoardRow[] {
  const sid = seasonId()
  const rows = db.prepare(
    `SELECT r.user_id AS id, u.name AS name, r.rating AS rating
       FROM ranked_ratings r JOIN users u ON u.id=r.user_id
      WHERE r.season_id=? AND r.games>0`,
  ).all(sid) as { id: number; name: string; rating: number }[]
  const agg = new Map<number, { name: string; value: number }>()
  for (const r of rows) {
    const cur = agg.get(r.id) ?? { name: r.name, value: 0 }
    cur.value += ladderContribution(r.rating)
    agg.set(r.id, cur)
  }
  return [...agg.entries()]
    .map(([id, v]) => ({ id, name: v.name, value: v.value, isMe: id === uid }))
    .filter(r => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

/** Топ по GG Score (очки достижений). */
function ggScoreTop(uid: number, limit = 20): BoardRow[] {
  const rows = db.prepare(
    `SELECT p.user_id AS id, u.name AS name, p.value AS value
       FROM user_progress p JOIN users u ON u.id=p.user_id
      WHERE p.key='gg_score' AND p.value>0
      ORDER BY p.value DESC LIMIT ?`,
  ).all(limit) as { id: number; name: string; value: number }[]
  return rows.map(r => ({ id: r.id, name: r.name, value: r.value, isMe: r.id === uid }))
}

/** Топ по заработку монет за неделю (сумма положительных начислений). */
function weeklyCoinsTop(uid: number, limit = 20): BoardRow[] {
  const rows = db.prepare(
    `SELECT l.user_id AS id, u.name AS name, SUM(l.delta) AS value
       FROM coin_ledger l JOIN users u ON u.id=l.user_id
      WHERE l.delta>0 AND l.ts >= (strftime('%s','now','-7 days')*1000)
      GROUP BY l.user_id ORDER BY value DESC LIMIT ?`,
  ).all(limit) as { id: number; name: string; value: number }[]
  return rows.map(r => ({ id: r.id, name: r.name, value: r.value, isMe: r.id === uid }))
}

export function boards(uid: number): Boards {
  return { ggScore: ggScoreTop(uid), weeklyCoins: weeklyCoinsTop(uid), ggLadder: ggLadderTop(uid) }
}
