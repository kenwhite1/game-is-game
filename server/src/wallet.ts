import { db } from './db'
import { packById, type CoinPack } from '../../shared/wallet'
import { credit } from './ledger'

// ─── Платежи Stars → Game ────────────────────────────────────────────────

export interface PaymentResult {
  /** Начислены ли монеты в этом вызове (false при повторе того же charge_id). */
  credited: boolean
  /** Итог монет с учётом удвоителя. */
  coins: number
  /** Сработал ли разовый удвоитель первой покупки этого пакета (§4.5). */
  doubled: boolean
}

/** Куплен ли уже этот пакет игроком (для бейджа «×2 за первую покупку» в UI). */
export function packsBought(uid: number): string[] {
  return (db.prepare("SELECT DISTINCT pack_id FROM payments WHERE user_id=? AND status='paid'").all(uid) as { pack_id: string }[])
    .map(r => r.pack_id)
}

/** Зачислить оплаченный пакет. Идемпотентно по charge_id: повторный апдейт
 *  от Telegram не зачислит монеты дважды. §4.5: первая покупка КАЖДОГО пакета
 *  удваивает монеты (разовый удвоитель — сильный буст конверсии, без инфляции). */
export function recordPayment(uid: number, pack: CoinPack, chargeId: string): PaymentResult {
  let credited = false
  let doubled = false
  let coins = pack.coins
  db.transaction(() => {
    // Первая покупка этого пакета? Считаем ДО вставки новой строки.
    const priorSame = (db.prepare("SELECT COUNT(*) AS n FROM payments WHERE user_id=? AND pack_id=? AND status='paid'").get(uid, pack.id) as { n: number }).n
    const ins = db
      .prepare('INSERT OR IGNORE INTO payments (user_id, pack_id, stars, coins, charge_id) VALUES (?,?,?,?,?)')
      .run(uid, pack.id, pack.stars, pack.coins, chargeId)
    if (ins.changes === 0) return
    // Игрок мог прийти платежом раньше, чем открыл приложение.
    db.prepare("INSERT OR IGNORE INTO users (id, name, coins) VALUES (?, 'Игрок', 0)").run(uid)
    credit(uid, pack.coins, 'purchase', chargeId)
    if (priorSame === 0) {
      doubled = true
      coins = pack.coins * 2
      credit(uid, pack.coins, 'purchase', `${chargeId}:first2x`) // удвоитель — отдельная строка ledger
    }
    credited = true
  })()
  return { credited, coins, doubled }
}

export interface PaymentRow {
  id: number
  user_id: number
  pack_id: string
  stars: number
  coins: number
  charge_id: string | null
  status: string
  ts: string
}

export function paymentByCharge(chargeId: string): PaymentRow | undefined {
  return db.prepare('SELECT * FROM payments WHERE charge_id=?').get(chargeId) as PaymentRow | undefined
}

/** Отметить возврат и списать монеты (не ниже нуля: часть могла быть потрачена). */
export function markRefunded(chargeId: string): boolean {
  const p = paymentByCharge(chargeId)
  if (!p || p.status !== 'paid') return false
  db.transaction(() => {
    db.prepare("UPDATE payments SET status='refunded' WHERE id=?").run(p.id)
    // Списываем не ниже нуля: часть монет могла быть потрачена. Через ledger,
    // чтобы возврат тоже был аудируемой строкой.
    const cur = (db.prepare('SELECT coins FROM users WHERE id=?').get(p.user_id) as { coins: number } | undefined)?.coins ?? 0
    const clawback = Math.min(cur, p.coins)
    if (clawback > 0) credit(p.user_id, -clawback, 'refund', p.charge_id ?? undefined)
  })()
  return true
}

export { packById }
