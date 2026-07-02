import { db } from './db'
import type { CoinReason } from '../../shared/economy'

// Единственная точка изменения баланса монет. Вместо «UPDATE users SET coins…»
// повсюду — credit/debit, которые ещё и пишут строку в coin_ledger с причиной,
// чтобы экономику можно было аудировать и ловить инфляцию/абузы (§16 библии).

const insertRow = db.prepare(
  'INSERT INTO coin_ledger (user_id, delta, reason, ref, balance_after, ts) VALUES (?,?,?,?,?,?)',
)
const readBalance = db.prepare('SELECT coins FROM users WHERE id=?')

/** Начислить (delta>0) или списать без проверки (delta<0). Возвращает новый баланс. */
export const credit = db.transaction((uid: number, delta: number, reason: CoinReason, ref?: string): number => {
  db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').run(delta, uid)
  const bal = (readBalance.get(uid) as { coins: number } | undefined)?.coins ?? 0
  insertRow.run(uid, delta, reason, ref ?? null, bal, Date.now())
  return bal
})

/** Списать при достаточном балансе (атомарно). true — если хватило и списали. */
export const debit = db.transaction((uid: number, amount: number, reason: CoinReason, ref?: string): boolean => {
  const res = db.prepare('UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?').run(amount, uid, amount)
  if (res.changes === 0) return false
  const bal = (readBalance.get(uid) as { coins: number }).coins
  insertRow.run(uid, -amount, reason, ref ?? null, bal, Date.now())
  return true
})
