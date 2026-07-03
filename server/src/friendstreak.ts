import { db } from './db'
import { writeFeed } from './events'

// Дружеские серии (§9.5): когда ОБА друга сыграли в один день, общий счётчик пары
// растёт. Считается на первом заходе игрока за день. Портфель из нескольких пар
// устойчивее одиночной серии — поэтому показываем до 5 активных.

function mskDay(ts = Date.now()): string {
  return new Date(ts + 3 * 3600 * 1000).toISOString().slice(0, 10)
}
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000)
}
function pair(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a]
}

interface FSRow { a_id: number; b_id: number; current: number; best: number; a_day: string | null; b_day: string | null; both_day: string | null }

/** Отметить, что игрок сыграл сегодня, и продвинуть серии с теми друзьями,
 *  кто тоже уже сыграл сегодня. Вызывается на первом заходе за день. */
export function tickFriendStreaks(uid: number): void {
  const today = mskDay()
  const friends = (db.prepare('SELECT friend_id FROM friendships WHERE user_id=?').all(uid) as { friend_id: number }[]).map(r => r.friend_id)
  for (const fid of friends) {
    const [a, b] = pair(uid, fid)
    db.prepare('INSERT OR IGNORE INTO friend_streaks (a_id, b_id) VALUES (?,?)').run(a, b)
    const uidIsA = uid === a
    db.prepare(`UPDATE friend_streaks SET ${uidIsA ? 'a_day' : 'b_day'}=? WHERE a_id=? AND b_id=?`).run(today, a, b)
    const row = db.prepare('SELECT * FROM friend_streaks WHERE a_id=? AND b_id=?').get(a, b) as FSRow
    // Оба сыграли сегодня и серия ещё не продвигалась сегодня → продвинуть.
    if (row.a_day === today && row.b_day === today && row.both_day !== today) {
      const consecutive = row.both_day != null && daysBetween(row.both_day, today) === 1
      const current = consecutive ? row.current + 1 : 1
      const best = Math.max(row.best, current)
      db.prepare('UPDATE friend_streaks SET current=?, best=?, both_day=? WHERE a_id=? AND b_id=?').run(current, best, today, a, b)
      if (current === 3 || current === 7 || current % 30 === 0) {
        writeFeed(uid, 'streak', `держит дружескую серию ${current} дней 🔥🤝`)
      }
    }
  }
}

export interface FriendStreakView { friendId: number; friendName: string; current: number; best: number; bothToday: boolean; canNudge: boolean }

/** Активные дружеские серии игрока (до 5, самые длинные), для соц-вкладки. */
export function friendStreaksOf(uid: number): FriendStreakView[] {
  const today = mskDay()
  const rows = db.prepare('SELECT * FROM friend_streaks WHERE (a_id=? OR b_id=?) AND current>0 ORDER BY current DESC LIMIT 5')
    .all(uid, uid) as (FSRow & { nudge_day: string | null })[]
  return rows.map(r => {
    const friendId = r.a_id === uid ? r.b_id : r.a_id
    const iPlayedToday = (r.a_id === uid ? r.a_day : r.b_day) === today
    const friendPlayedToday = (r.a_id === uid ? r.b_day : r.a_day) === today
    return {
      friendId,
      friendName: (db.prepare('SELECT name FROM users WHERE id=?').get(friendId) as { name: string } | undefined)?.name ?? 'Друг',
      current: r.current,
      best: r.best,
      bothToday: iPlayedToday && friendPlayedToday,
      // Пнуть можно, если я сыграл, а друг ещё нет, и сегодня ещё не пинал.
      canNudge: iPlayedToday && !friendPlayedToday && r.nudge_day !== today,
    }
  })
}

export type NudgeResult = { ok: true; friendId: number; current: number } | { ok: false; reason: 'not_found' | 'already' }

/** «Пни друга»: пометить пару, чтобы не пинать дважды за день. Возвращает данные
 *  для пуша (сам пуш шлёт бот из API). */
export function nudgeFriend(uid: number, friendId: number): NudgeResult {
  const today = mskDay()
  const [a, b] = pair(uid, friendId)
  const row = db.prepare('SELECT * FROM friend_streaks WHERE a_id=? AND b_id=?').get(a, b) as (FSRow & { nudge_day: string | null }) | undefined
  if (!row || row.current <= 0) return { ok: false, reason: 'not_found' }
  if (row.nudge_day === today) return { ok: false, reason: 'already' }
  db.prepare('UPDATE friend_streaks SET nudge_day=? WHERE a_id=? AND b_id=?').run(today, a, b)
  return { ok: true, friendId, current: row.current }
}
