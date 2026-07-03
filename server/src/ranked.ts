import { db } from './db'
import { GAMES } from '../../shared/games'
import { currentSeason } from '../../shared/season'
import {
  RANKED_GAMES, START_RATING, START_RD, kFactor, expectedScore,
  glicko2Update, softResetSeed, decayedRating,
  divisionLabel, ladderContribution,
  type RankedView, type RankedGameView, type Boards, type BoardRow,
} from '../../shared/ranked'

// Рейтинговый движок: Elo-против-поля per-game/сезон + агрегат GG-лиги + доски.

const GAME_NAME = new Map(GAMES.map(g => [g.id, g.name]))

function seasonId(): string { return currentSeason(Date.now()).id }

const readRating = db.prepare('SELECT rating, games, peak, rd, vol FROM ranked_ratings WHERE user_id=? AND game_id=? AND season_id=?')
const ensureRating = db.prepare('INSERT OR IGNORE INTO ranked_ratings (user_id, game_id, season_id) VALUES (?,?,?)')
const readOppRating = db.prepare('SELECT rating, rd FROM ranked_ratings WHERE user_id=? AND game_id=? AND season_id=?')

interface RatingRow { rating: number; games: number; peak: number; rd: number; vol: number }

/** Обновить рейтинг игрока по результату рангового матча против людей.
 *  Если игра прислала id соперников — настоящий Glicko-2 против их рейтингов;
 *  иначе Elo-против-поля (§13.2). Первый матч сезона мягко сброшен из прошлого. */
export function updateRating(uid: number, gameId: string, result: string, humanPlayers?: number, opponents?: number[]): void {
  if (!RANKED_GAMES.has(gameId)) return
  if ((humanPlayers ?? 1) < 2) return // только против людей
  const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : result === 'loss' ? 0 : -1
  if (score < 0) return // 'finish' и прочее ранг не двигают
  const sid = seasonId()
  ensureRating.run(uid, gameId, sid)
  let cur = readRating.get(uid, gameId, sid) as RatingRow

  // Мягкий сброс сезона: первый матч сеет рейтинг из прошлого сезона к среднему.
  if (cur.games === 0) {
    const prev = db.prepare('SELECT rating FROM ranked_ratings WHERE user_id=? AND game_id=? AND season_id<>? ORDER BY rowid DESC LIMIT 1')
      .get(uid, gameId, sid) as { rating: number } | undefined
    if (prev) {
      const seed = softResetSeed(prev.rating)
      db.prepare('UPDATE ranked_ratings SET rating=?, rd=?, vol=? WHERE user_id=? AND game_id=? AND season_id=?')
        .run(seed.rating, seed.rd, seed.vol, uid, gameId, sid)
      cur = { ...cur, rating: seed.rating, rd: seed.rd, vol: seed.vol }
    }
  }

  const oppIds = (opponents ?? []).filter(id => id !== uid)
  let next: number, rd = cur.rd, vol = cur.vol
  if (oppIds.length > 0) {
    const opps = oppIds.map(oid => {
      const r = readOppRating.get(oid, gameId, sid) as { rating: number; rd: number } | undefined
      return r ? { rating: r.rating, rd: r.rd } : { rating: START_RATING, rd: START_RD }
    })
    const g2 = glicko2Update({ rating: cur.rating, rd: cur.rd, vol: cur.vol }, opps, score)
    next = g2.rating; rd = g2.rd; vol = g2.vol
  } else {
    next = cur.rating + kFactor(cur.games) * (score - expectedScore(cur.rating)) // Elo-фолбэк
  }
  const peak = Math.max(cur.peak, next)
  db.prepare('UPDATE ranked_ratings SET rating=?, rd=?, vol=?, games=games+1, peak=?, updated_ts=? WHERE user_id=? AND game_id=? AND season_id=?')
    .run(next, rd, vol, peak, Date.now(), uid, gameId, sid)
}

/** Ранги игрока по всем ранговым играм текущего сезона + агрегат GG-лиги. */
export function rankedOf(uid: number): RankedView {
  const sid = seasonId()
  const rows = db.prepare('SELECT game_id, rating, games, peak, updated_ts FROM ranked_ratings WHERE user_id=? AND season_id=? AND games>0 ORDER BY rating DESC')
    .all(uid, sid) as { game_id: string; rating: number; games: number; peak: number; updated_ts: number }[]
  // Распад на Мастер+ при простое (лениво: применяем и сохраняем при чтении).
  for (const r of rows) {
    if (r.updated_ts <= 0) continue
    const staleDays = (Date.now() - r.updated_ts) / 86400000
    const eff = decayedRating(r.rating, staleDays)
    if (eff < r.rating - 0.5) {
      db.prepare('UPDATE ranked_ratings SET rating=? WHERE user_id=? AND game_id=? AND season_id=?').run(eff, uid, r.game_id, sid)
      r.rating = eff
    }
  }
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
