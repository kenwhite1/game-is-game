import { db } from './db'
import { credit } from './ledger'
import { writeFeed } from './events'
import { COOP_TARGET, COOP_REWARD, COOP_ITEM, type CoopView } from '../../shared/coop'

// Кооп-квесты (§8.3): пара друзей на общий недельный таргет; прогресс копится от
// обоих (каждая победа любого из пары), награда - каждому по отдельному клейму.

function weekMonday(): string {
  const d = new Date()
  const shift = (d.getUTCDay() + 6) % 7 // 0 = понедельник
  d.setUTCDate(d.getUTCDate() - shift)
  return d.toISOString().slice(0, 10)
}
function pair(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a]
}
function nameOf(id: number): string {
  return (db.prepare('SELECT name FROM users WHERE id=?').get(id) as { name: string } | undefined)?.name ?? 'Друг'
}

export type CoopStartResult = { ok: true } | { ok: false; reason: 'self' | 'not_friends' }

/** Начать (или переиспользовать) кооп-квест с другом на текущую неделю. */
export function startCoop(uid: number, friendId: number): CoopStartResult {
  if (uid === friendId) return { ok: false, reason: 'self' }
  if (!db.prepare('SELECT 1 FROM friendships WHERE user_id=? AND friend_id=?').get(uid, friendId)) {
    return { ok: false, reason: 'not_friends' }
  }
  const [a, b] = pair(uid, friendId)
  db.prepare('INSERT OR IGNORE INTO coop_quests (a_id, b_id, week, target) VALUES (?,?,?,?)').run(a, b, weekMonday(), COOP_TARGET)
  return { ok: true }
}

/** Победа любого из пары двигает общий прогресс. Вызывается на win из /sdk/result. */
export function tickCoop(uid: number): void {
  db.prepare('UPDATE coop_quests SET progress = MIN(target, progress + 1) WHERE week=? AND (a_id=? OR b_id=?)')
    .run(weekMonday(), uid, uid)
}

/** Кооп-квесты игрока на текущую неделю (для соц-вкладки). */
export function coopOf(uid: number): CoopView[] {
  const week = weekMonday()
  const rows = db.prepare('SELECT * FROM coop_quests WHERE week=? AND (a_id=? OR b_id=?)').all(week, uid, uid) as {
    id: number; a_id: number; b_id: number; target: number; progress: number; a_claimed: number; b_claimed: number
  }[]
  return rows.map(r => {
    const isA = r.a_id === uid
    const partnerId = isA ? r.b_id : r.a_id
    return {
      id: r.id, partnerId, partnerName: nameOf(partnerId), target: r.target, progress: r.progress,
      done: r.progress >= r.target, claimed: (isA ? r.a_claimed : r.b_claimed) === 1,
    }
  })
}

export type CoopClaimResult = { ok: true; reward: number } | { ok: false; reason: 'unknown' | 'not_member' | 'not_done' | 'claimed' }

/** Забрать награду за общий клир (каждый участник - свой клейм, один раз). */
export function claimCoop(uid: number, id: number): CoopClaimResult {
  const r = db.prepare('SELECT * FROM coop_quests WHERE id=? AND week=?').get(id, weekMonday()) as {
    id: number; a_id: number; b_id: number; target: number; progress: number; a_claimed: number; b_claimed: number
  } | undefined
  if (!r) return { ok: false, reason: 'unknown' }
  const isA = r.a_id === uid, isB = r.b_id === uid
  if (!isA && !isB) return { ok: false, reason: 'not_member' }
  if (r.progress < r.target) return { ok: false, reason: 'not_done' }
  if ((isA ? r.a_claimed : r.b_claimed) === 1) return { ok: false, reason: 'claimed' }
  const col = isA ? 'a_claimed' : 'b_claimed'
  db.prepare(`UPDATE coop_quests SET ${col}=1 WHERE id=?`).run(id)
  credit(uid, COOP_REWARD, 'quest', `coop:${id}`)
  // Кооп-косметика - навсегда, один раз (идемпотентно на пользователя).
  db.prepare('INSERT OR IGNORE INTO cosmetics_owned (user_id, item_id) VALUES (?,?)').run(uid, COOP_ITEM)
  writeFeed(uid, 'streak', `завершил(а) кооп-квест с другом 🤝`)
  return { ok: true, reward: COOP_REWARD }
}
