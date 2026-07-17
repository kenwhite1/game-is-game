import { db } from './db'
import { credit } from './ledger'
import { writeFeed } from './events'
import { levelInfo } from '../../shared/progression'

// Account XP (§5): постоянный опыт уровня аккаунта, развязанный от «запусков».
// XP теперь дают матчи, квесты, достижения и серия - level отражает всю
// активность, а не только тапы по плиткам. Кривая растущая (§5.3, progression.ts).

export const PRESTIGE_LEVEL = 100

/** Разовые бонусы за вехи уровня (§5.3): «сундук» монет сверх обычных 20·level. */
export const LEVEL_MILESTONES: Record<number, number> = {
  5: 200, 10: 500, 25: 1500, 50: 4000, 75: 8000, 100: 15000,
}

/** Начислить account_xp; за каждый новый уровень платим 20·level (+вехи) и пишем в ленту. */
export function grantAccountXp(uid: number, amount: number): void {
  if (amount <= 0) return
  const row = db.prepare('SELECT account_xp FROM users WHERE id=?').get(uid) as { account_xp: number } | undefined
  if (!row) return
  const before = row.account_xp
  const after = before + amount
  db.prepare('UPDATE users SET account_xp=? WHERE id=?').run(after, uid)
  const lvBefore = levelInfo(before).level
  const lvAfter = levelInfo(after).level
  if (lvAfter > lvBefore) {
    let bonus = 0
    for (let l = lvBefore + 1; l <= lvAfter; l++) {
      bonus += 20 * l // §5.3: каждый уровень платит
      bonus += LEVEL_MILESTONES[l] ?? 0 // вехи 5/10/25/50/75/100 - сундук сверху
    }
    if (bonus > 0) credit(uid, bonus, 'level', `lv:${lvAfter}`)
    writeFeed(uid, 'level', `достиг(ла) ${lvAfter} уровня 🎉`)
  }
}

export type PrestigeResult = { ok: true; prestige: number } | { ok: false; reason: string }

/** Престиж (§5.4): при уровне ≥100 сбросить уровень к 1 и поднять звезду престижа. */
export function doPrestige(uid: number): PrestigeResult {
  const row = db.prepare('SELECT account_xp, prestige FROM users WHERE id=?').get(uid) as { account_xp: number; prestige: number } | undefined
  if (!row) return { ok: false, reason: 'not_found' }
  if (levelInfo(row.account_xp).level < PRESTIGE_LEVEL) return { ok: false, reason: 'too_low' }
  const next = row.prestige + 1
  db.prepare('UPDATE users SET account_xp=0, prestige=? WHERE id=?').run(next, uid)
  writeFeed(uid, 'level', `перешёл(ла) в престиж ${next} ⭐`)
  return { ok: true, prestige: next }
}
