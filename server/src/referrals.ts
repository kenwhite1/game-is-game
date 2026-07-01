import { db } from './db'
import type { ReferralApplied } from '../../shared/types'
import { REFERRER_REWARD, REFERRED_BONUS } from '../../shared/referrals'

/**
 * Засчитать приглашение: новичок uid пришёл по коду друга rawCode.
 * Вызывается ТОЛЬКО для только что созданных пользователей (решает /auth),
 * а сторожевое `referred_by IS NULL` защищает от повторного зачёта.
 * Пригласившему и новичку начисляются Game, между ними создаётся дружба.
 */
export function applyReferral(uid: number, rawCode: string): ReferralApplied | null {
  const code = rawCode.trim().toUpperCase()
  if (!code) return null
  const referrer = db.prepare('SELECT id, name FROM users WHERE friend_code=?').get(code) as
    | { id: number; name: string }
    | undefined
  if (!referrer || referrer.id === uid) return null

  const tx = db.transaction((): boolean => {
    const claimed = db
      .prepare('UPDATE users SET referred_by=? WHERE id=? AND referred_by IS NULL')
      .run(referrer.id, uid)
    if (claimed.changes === 0) return false
    const pay = db.prepare('UPDATE users SET coins=coins+? WHERE id=?')
    pay.run(REFERRER_REWARD, referrer.id)
    pay.run(REFERRED_BONUS, uid)
    // Приглашение сразу делает игроков друзьями — новичок не видит пустой хаб.
    const befriend = db.prepare('INSERT OR IGNORE INTO friendships (user_id, friend_id) VALUES (?,?)')
    befriend.run(uid, referrer.id)
    befriend.run(referrer.id, uid)
    return true
  })
  return tx() ? { by: referrer.name, bonus: REFERRED_BONUS } : null
}

/** Сколько новых игроков привёл uid (для значков и карточки приглашения). */
export function invitedCount(uid: number): number {
  const r = db.prepare('SELECT COUNT(*) AS n FROM users WHERE referred_by=?').get(uid) as { n: number }
  return r.n
}
