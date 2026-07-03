import { db } from './db'
import type { ReferralApplied } from '../../shared/types'
import { REFERRER_REWARD, REFERRED_BONUS } from '../../shared/referrals'
import { credit } from './ledger'

/** Сколько игр новичок должен наиграть, чтобы приглашение засчиталось (§15.1). */
export const REFERRAL_QUALIFY_OPENS = 5

/**
 * Засчитать приглашение: новичок uid пришёл по коду друга rawCode.
 * Вызывается ТОЛЬКО для только что созданных пользователей (решает /auth).
 * Награда НЕ платится сразу (анти-фрод, §15.1): дружба создаётся, а бонусы
 * ждут квалификации новичка (см. settleReferral). Сторожевое
 * `referred_by IS NULL` защищает от повторного зачёта.
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
    // Приглашение сразу делает игроков друзьями — новичок не видит пустой хаб.
    const befriend = db.prepare('INSERT OR IGNORE INTO friendships (user_id, friend_id) VALUES (?,?)')
    befriend.run(uid, referrer.id)
    befriend.run(referrer.id, uid)
    return true
  })
  return tx() ? { by: referrer.name, bonus: REFERRED_BONUS } : null
}

/** Выплатить отложенную реферальную награду, когда новичок наиграл минимум.
 *  Вызывается на каждом запуске; идемпотентно (referral_paid). */
export function settleReferral(uid: number): void {
  const u = db.prepare('SELECT referred_by AS by, referral_paid AS paid, opens FROM users WHERE id=?')
    .get(uid) as { by: number | null; paid: number; opens: number } | undefined
  if (!u || !u.by || u.paid === 1 || u.opens < REFERRAL_QUALIFY_OPENS) return
  db.transaction(() => {
    const claimed = db.prepare('UPDATE users SET referral_paid=1 WHERE id=? AND referral_paid=0 AND referred_by IS NOT NULL').run(uid)
    if (claimed.changes === 0) return
    credit(u.by!, REFERRER_REWARD, 'referrer', `ref:${uid}`)
    credit(uid, REFERRED_BONUS, 'referred', `by:${u.by}`)
  })()
}

/** Сколько КВАЛИФИЦИРОВАННЫХ игроков привёл uid (для значков/достижения ⑮). */
export function invitedCount(uid: number): number {
  const r = db.prepare('SELECT COUNT(*) AS n FROM users WHERE referred_by=? AND referral_paid=1').get(uid) as { n: number }
  return r.n
}
