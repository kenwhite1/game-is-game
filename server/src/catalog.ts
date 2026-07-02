import { db } from './db'
import type { GameMeta, RatingValue } from '../../shared/types'
import { GAMES } from '../../shared/games'
import { playingCounts } from './presence'

const VALID_GAME_IDS = new Set(GAMES.map(g => g.id))

/** Глобальные агрегаты по играм: запуски, оценки, подписчики. */
export function gameMeta(): Record<string, GameMeta> {
  const opens = db
    .prepare('SELECT game_id AS id, COUNT(*) AS n FROM opens GROUP BY game_id')
    .all() as { id: string; n: number }[]
  const votes = db
    .prepare(`SELECT game_id AS id,
                     SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END) AS likes,
                     SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END) AS dislikes
              FROM ratings GROUP BY game_id`)
    .all() as { id: string; likes: number; dislikes: number }[]
  const fans = db
    .prepare('SELECT game_id AS id, COUNT(*) AS n FROM follows GROUP BY game_id')
    .all() as { id: string; n: number }[]
  const playing = playingCounts()
  const meta: Record<string, GameMeta> = {}
  for (const g of GAMES) meta[g.id] = { opens: 0, likes: 0, dislikes: 0, followers: 0, playing: playing[g.id] ?? 0 }
  for (const r of opens) if (meta[r.id]) meta[r.id].opens = r.n
  for (const r of votes) if (meta[r.id]) { meta[r.id].likes = r.likes ?? 0; meta[r.id].dislikes = r.dislikes ?? 0 }
  for (const r of fans) if (meta[r.id]) meta[r.id].followers = r.n
  return meta
}

// ─── Подписки на игры ────────────────────────────────────────────────────

export function followsOf(uid: number): string[] {
  const rows = db
    .prepare('SELECT game_id FROM follows WHERE user_id=? ORDER BY created_at DESC')
    .all(uid) as { game_id: string }[]
  return rows.map(r => r.game_id).filter(id => VALID_GAME_IDS.has(id))
}

export function toggleFollow(uid: number, gameId: string): { following: boolean; follows: string[] } {
  if (!VALID_GAME_IDS.has(gameId)) return { following: false, follows: followsOf(uid) }
  const removed = db.prepare('DELETE FROM follows WHERE user_id=? AND game_id=?').run(uid, gameId)
  if (removed.changes === 0) {
    db.prepare('INSERT INTO follows (user_id, game_id) VALUES (?,?)').run(uid, gameId)
  }
  return { following: removed.changes === 0, follows: followsOf(uid) }
}

/** Telegram id всех подписчиков игры (для рассылки /announce). */
export function followerIds(gameId: string): number[] {
  return (db.prepare('SELECT user_id FROM follows WHERE game_id=?').all(gameId) as { user_id: number }[])
    .map(r => r.user_id)
}

// ─── Избранное ───────────────────────────────────────────────────────────

export function favoritesOf(uid: number): string[] {
  const rows = db
    .prepare('SELECT game_id FROM favorites WHERE user_id=? ORDER BY created_at DESC')
    .all(uid) as { game_id: string }[]
  return rows.map(r => r.game_id).filter(id => VALID_GAME_IDS.has(id))
}

export function toggleFavorite(uid: number, gameId: string): { favorite: boolean; favorites: string[] } {
  if (!VALID_GAME_IDS.has(gameId)) return { favorite: false, favorites: favoritesOf(uid) }
  const removed = db.prepare('DELETE FROM favorites WHERE user_id=? AND game_id=?').run(uid, gameId)
  if (removed.changes === 0) {
    db.prepare('INSERT INTO favorites (user_id, game_id) VALUES (?,?)').run(uid, gameId)
  }
  return { favorite: removed.changes === 0, favorites: favoritesOf(uid) }
}

// ─── Оценки ──────────────────────────────────────────────────────────────

export function ratingsOf(uid: number): Record<string, RatingValue> {
  const rows = db
    .prepare('SELECT game_id, value FROM ratings WHERE user_id=?')
    .all(uid) as { game_id: string; value: RatingValue }[]
  const out: Record<string, RatingValue> = {}
  for (const r of rows) if (VALID_GAME_IDS.has(r.game_id)) out[r.game_id] = r.value
  return out
}

/** value: 1 нравится, -1 не нравится, 0 снять оценку. */
export function rate(uid: number, gameId: string, value: 1 | -1 | 0): Record<string, RatingValue> {
  if (VALID_GAME_IDS.has(gameId)) {
    if (value === 0) {
      db.prepare('DELETE FROM ratings WHERE user_id=? AND game_id=?').run(uid, gameId)
    } else {
      db.prepare(
        `INSERT INTO ratings (user_id, game_id, value) VALUES (?,?,?)
         ON CONFLICT(user_id, game_id) DO UPDATE SET value=excluded.value, updated_at=datetime('now')`,
      ).run(uid, gameId, value)
    }
  }
  return ratingsOf(uid)
}
