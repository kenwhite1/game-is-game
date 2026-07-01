// Общие типы для клиента и сервера.
import type { GameCard } from './games'
import type { Badge } from './progression'
import type { Cosmetic, Slot, Look } from './cosmetics'

export interface Profile {
  id: number
  name: string
  /** id цвета тела персонажа (c_*). */
  color: string
  /** id выражения лица (f_*). */
  face: string
  /** id надетой рамки (frame_*). */
  frame: string
  /** id надетой шляпы (hat_*). */
  hat: string
  /** id надетых очков (eye_*). */
  eyewear: string
  /** id надетого эффекта (fx_*). */
  effect: string
  /** id надетого питомца (comp_*). */
  companion: string
  /** id надетого баннера (banner_*). */
  banner: string
  /** id надетого титула (title_*). */
  title: string
  /** Баланс мягкой валюты Game. */
  coins: number
  /** Сколько раз игрок открывал игры из хаба. */
  opens: number
  /** Накопленный опыт (выводится из opens). */
  xp: number
  /** Текущий уровень. */
  level: number
  /** Код для добавления в друзья. */
  friendCode: string
  /** Когда присоединился, ISO-строка. */
  joinedAt: string
}

/** Сколько раз игрок открывал конкретную игру. */
export interface GameStat {
  id: string
  opens: number
}

/** Профиль + статистика по играм + значки для экрана «Профиль». */
export interface ProfileDetail {
  profile: Profile
  stats: GameStat[]
  badges: Badge[]
  friendCount: number
  /** Сколько новых игроков пришло по реферальной ссылке. */
  invited: number
}

/** Итог сработавшего приглашения (для приветственного тоста новичку). */
export interface ReferralApplied {
  /** Имя пригласившего. */
  by: string
  /** Сколько Game начислено новичку. */
  bonus: number
}

export interface Friend {
  id: number
  name: string
  /** Полный образ — чтобы видеть друга «как он одет». */
  look: Look
  level: number
  /** id последней игры, которую запускал друг. */
  lastGame: string | null
  /** Последняя активность, ISO-строка. */
  lastSeen: string | null
}

export interface ActivityItem {
  id: number
  userId: number
  name: string
  look: Look
  gameId: string
  ts: string
}

export interface LeaderRow {
  id: number
  name: string
  look: Look
  level: number
  xp: number
  isMe: boolean
}

// ─── Косметика ──────────────────────────────────────────────────────────

/** Предмет каталога + состояние для конкретного игрока. */
export interface CosmeticState {
  item: Cosmetic
  owned: boolean
  equipped: boolean
  /** Цена в Game, если это товар магазина и ещё не куплен. */
  price: number | null
  /** Подпись условия открытия, если предмет заперт. */
  lockLabel: string
}

export interface Wardrobe {
  /** Что надето сейчас, по слотам. */
  equipped: Record<Slot, string>
  /** Все предметы со статусом владения/надетости. */
  items: CosmeticState[]
  ownedCount: number
  totalCount: number
  /** Баланс Game (дублируем для удобства экрана стиля). */
  coins: number
}

export interface AuthResponse {
  token: string
  profile: Profile
  startParam: string | null
  botUsername: string
  /** Каталог игр с готовыми ссылками. */
  catalog: GameCard[]
  /** Идентификаторы недавно открытых игр, свежие первыми. */
  recent: string[]
  /** Заполнено, если этот вход засчитан как приход по приглашению. */
  referral: ReferralApplied | null
}

export type { GameCard, GameDef } from './games'
export type { Badge } from './progression'
export type { Cosmetic, Slot, Rarity, Look } from './cosmetics'
