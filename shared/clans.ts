// Команды/кланы (§15.3): коллективный слой для самых вовлечённых. Опт-ин
// группы с общим недельным квестом (агрегат результатов участников), клановым
// лидербордом и клан-тегом как общей идентичностью. Общий источник правды.

export const CLAN_MAX_MEMBERS = 30
export const CLAN_NAME_MIN = 3
export const CLAN_NAME_MAX = 24
/** Тег 2–5 символов латиницы/цифр (хранится в верхнем регистре). */
export const CLAN_TAG_RE = /^[A-Za-z0-9]{2,5}$/
/** Недельная цель: суммарные запуски игр участниками. */
export const CLAN_WEEKLY_TARGET = 200
/** Награда каждому участнику при достижении цели. */
export const CLAN_WEEKLY_REWARD = 300

export function validClanName(name: string): boolean {
  const n = name.trim()
  return n.length >= CLAN_NAME_MIN && n.length <= CLAN_NAME_MAX
}
export function validClanTag(tag: string): boolean {
  return CLAN_TAG_RE.test(tag.trim())
}

import type { Look } from './cosmetics'

export interface ClanMemberView {
  id: number
  name: string
  look: Look
  level: number
  role: string
  ggScore: number
}
export interface ClanView {
  id: number
  name: string
  tag: string
  role: string
  memberCount: number
  members: ClanMemberView[]
  weekly: { value: number; target: number; reached: boolean; claimed: boolean; reward: number }
}
export interface ClanBoardRow {
  id: number
  name: string
  tag: string
  score: number
  members: number
  isMine: boolean
}
