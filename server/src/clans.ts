import { db } from './db'
import { credit } from './ledger'
import { getProgress } from './events'
import { defaultColor } from '../../shared/avatars'
import { DEFAULT_EQUIP, type Look } from '../../shared/cosmetics'
import { levelInfo } from '../../shared/progression'
import {
  validClanName, validClanTag, CLAN_MAX_MEMBERS, CLAN_WEEKLY_TARGET, CLAN_WEEKLY_REWARD,
  type ClanView, type ClanMemberView, type ClanBoardRow,
} from '../../shared/clans'

// Кланы: создание/вступление/выход, ростер, недельная общая цель и лидерборд.

interface LookRow { color: string | null; face: string | null; frame: string | null; hat: string | null; eyewear: string | null; effect: string | null; companion: string | null }
const LOOK_COLS = 'u.color, u.face, u.frame, u.hat, u.eyewear, u.effect, u.companion'
function lookOf(r: LookRow, seed: number): Look {
  return {
    color: r.color || defaultColor(seed), face: r.face || DEFAULT_EQUIP.face,
    frame: r.frame || DEFAULT_EQUIP.frame, hat: r.hat || DEFAULT_EQUIP.hat,
    eyewear: r.eyewear || DEFAULT_EQUIP.eyewear, effect: r.effect || DEFAULT_EQUIP.effect,
    companion: r.companion || DEFAULT_EQUIP.companion,
  }
}

function weekMonday(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

export function clanIdOf(uid: number): number | null {
  return (db.prepare('SELECT clan_id FROM clan_members WHERE user_id=?').get(uid) as { clan_id: number } | undefined)?.clan_id ?? null
}
function memberIds(clanId: number): number[] {
  return (db.prepare('SELECT user_id FROM clan_members WHERE clan_id=?').all(clanId) as { user_id: number }[]).map(r => r.user_id)
}
function weeklyValue(clanId: number): number {
  const ids = memberIds(clanId)
  if (ids.length === 0) return 0
  const marks = ids.map(() => '?').join(',')
  return (db.prepare(`SELECT COUNT(*) AS n FROM opens WHERE date(ts) >= ? AND user_id IN (${marks})`).get(weekMonday(), ...ids) as { n: number }).n
}

export type ClanResult = { ok: true; view: ClanView } | { ok: false; reason: string }

export function createClan(uid: number, name: string, tag: string): ClanResult {
  if (!validClanName(name) || !validClanTag(tag)) return { ok: false, reason: 'bad' }
  if (clanIdOf(uid)) return { ok: false, reason: 'in_clan' }
  const cleanName = name.trim().slice(0, 24)
  const cleanTag = tag.trim().toUpperCase()
  try {
    const tx = db.transaction((): number => {
      const res = db.prepare('INSERT INTO clans (name, tag, owner_id) VALUES (?,?,?)').run(cleanName, cleanTag, uid)
      const id = Number(res.lastInsertRowid)
      db.prepare("INSERT INTO clan_members (clan_id, user_id, role) VALUES (?,?,'owner')").run(id, uid)
      return id
    })
    tx()
  } catch {
    return { ok: false, reason: 'tag_taken' }
  }
  grantClanTitle(uid) // §15.3 клан-эксклюзив
  return { ok: true, view: clanView(uid)! }
}

/** Клан-эксклюзивная косметика (§15.3): титул «В команде» при вступлении. */
function grantClanTitle(uid: number): void {
  db.prepare('INSERT OR IGNORE INTO cosmetics_owned (user_id, item_id) VALUES (?,?)').run(uid, 'title_clan')
}

export function joinClan(uid: number, clanId: number): ClanResult {
  if (clanIdOf(uid)) return { ok: false, reason: 'in_clan' }
  const clan = db.prepare('SELECT id FROM clans WHERE id=?').get(clanId)
  if (!clan) return { ok: false, reason: 'not_found' }
  if (memberIds(clanId).length >= CLAN_MAX_MEMBERS) return { ok: false, reason: 'full' }
  db.prepare("INSERT OR IGNORE INTO clan_members (clan_id, user_id, role) VALUES (?,?,'member')").run(clanId, uid)
  grantClanTitle(uid) // §15.3 клан-эксклюзив
  return { ok: true, view: clanView(uid)! }
}

export function leaveClan(uid: number): { ok: boolean } {
  const clanId = clanIdOf(uid)
  if (!clanId) return { ok: false }
  db.transaction(() => {
    const isOwner = (db.prepare('SELECT role FROM clan_members WHERE user_id=?').get(uid) as { role: string } | undefined)?.role === 'owner'
    db.prepare('DELETE FROM clan_members WHERE user_id=?').run(uid)
    const remaining = db.prepare('SELECT user_id FROM clan_members WHERE clan_id=? ORDER BY joined_at ASC LIMIT 1').get(clanId) as { user_id: number } | undefined
    if (!remaining) {
      // Последний ушёл - распускаем клан.
      db.prepare('DELETE FROM clans WHERE id=?').run(clanId)
      db.prepare('DELETE FROM clan_claims WHERE clan_id=?').run(clanId)
    } else if (isOwner) {
      // Передаём владение старейшему участнику.
      db.prepare("UPDATE clan_members SET role='owner' WHERE clan_id=? AND user_id=?").run(clanId, remaining.user_id)
      db.prepare('UPDATE clans SET owner_id=? WHERE id=?').run(remaining.user_id, clanId)
    }
  })()
  return { ok: true }
}

export function claimClanWeekly(uid: number): { ok: boolean; reason?: string } {
  const clanId = clanIdOf(uid)
  if (!clanId) return { ok: false, reason: 'no_clan' }
  if (weeklyValue(clanId) < CLAN_WEEKLY_TARGET) return { ok: false, reason: 'not_done' }
  const week = weekMonday()
  const ins = db.prepare('INSERT OR IGNORE INTO clan_claims (clan_id, week, user_id) VALUES (?,?,?)').run(clanId, week, uid)
  if (ins.changes === 0) return { ok: false, reason: 'claimed' }
  credit(uid, CLAN_WEEKLY_REWARD, 'clan', `clan:${clanId}`)
  return { ok: true }
}

export function clanView(uid: number): ClanView | null {
  const clanId = clanIdOf(uid)
  if (!clanId) return null
  const clan = db.prepare('SELECT id, name, tag FROM clans WHERE id=?').get(clanId) as { id: number; name: string; tag: string } | undefined
  if (!clan) return null
  const rows = db.prepare(
    `SELECT u.id, u.name, u.account_xp, m.role, ${LOOK_COLS}
       FROM clan_members m JOIN users u ON u.id=m.user_id
      WHERE m.clan_id=? ORDER BY (m.role='owner') DESC, u.account_xp DESC`,
  ).all(clanId) as (LookRow & { id: number; name: string; account_xp: number; role: string })[]
  const members: ClanMemberView[] = rows.map(r => ({
    id: r.id, name: r.name, look: lookOf(r, r.id), level: levelInfo(r.account_xp).level,
    role: r.role, ggScore: getProgress(r.id, 'gg_score'),
  }))
  const value = weeklyValue(clanId)
  const myRole = rows.find(r => r.id === uid)?.role ?? 'member'
  const claimed = !!db.prepare('SELECT 1 FROM clan_claims WHERE clan_id=? AND week=? AND user_id=?').get(clanId, weekMonday(), uid)
  return {
    id: clan.id, name: clan.name, tag: clan.tag, role: myRole, memberCount: members.length, members,
    weekly: { value, target: CLAN_WEEKLY_TARGET, reached: value >= CLAN_WEEKLY_TARGET, claimed, reward: CLAN_WEEKLY_REWARD },
  }
}

/** Кланы по суммарному GG Score участников. */
export function clanBoard(uid: number, limit = 20): ClanBoardRow[] {
  const mine = clanIdOf(uid)
  const clans = db.prepare('SELECT id, name, tag FROM clans').all() as { id: number; name: string; tag: string }[]
  return clans.map(c => {
    const rows = db.prepare(
      `SELECT COALESCE(SUM(p.value),0) AS score, COUNT(DISTINCT m.user_id) AS members
         FROM clan_members m LEFT JOIN user_progress p ON p.user_id=m.user_id AND p.key='gg_score'
        WHERE m.clan_id=?`,
    ).get(c.id) as { score: number; members: number }
    return { id: c.id, name: c.name, tag: c.tag, score: rows.score, members: rows.members, isMine: c.id === mine }
  }).sort((a, b) => b.score - a.score).slice(0, limit)
}
