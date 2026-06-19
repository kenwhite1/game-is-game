// Аватары хаба выводятся из единого каталога косметики (shared/cosmetics).
// Здесь — тонкая обёртка: список, дефолт по seed и резолвер эмодзи+кольца,
// чтобы любой аватар (в т.ч. редкие скины) корректно рисовался везде.
import { AVATAR_ITEMS } from './cosmetics'

export interface AvatarDef {
  id: string
  emoji: string
  ring: string
}

export const AVATARS: AvatarDef[] = AVATAR_ITEMS.map(a => ({ id: a.id, emoji: a.emoji, ring: a.ring }))

// Стартовые аватары — только из них выбирается дефолт нового игрока.
const STARTERS = AVATAR_ITEMS.filter(a => a.unlock.kind === 'starter').map(a => a.id)
const byId = new Map(AVATARS.map(a => [a.id, a]))

/** Детерминированный аватар по умолчанию из id пользователя. */
export function defaultAvatar(seed: number): string {
  const pool = STARTERS.length ? STARTERS : AVATARS.map(a => a.id)
  const i = Math.abs(Math.floor(seed)) % pool.length
  return pool[i]
}

export function avatarOf(id: string | null | undefined, seed = 0): AvatarDef {
  return (id && byId.get(id)) || byId.get(defaultAvatar(seed)) || AVATARS[0]
}
