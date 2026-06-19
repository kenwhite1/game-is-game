// Резолверы кастомизации персонажа (цвет тела + выражение лица).
// Выводятся из единого каталога косметики, чтобы сервер и клиент совпадали.
import { COLOR_ITEMS, FACE_ITEMS, DEFAULT_EQUIP, type ColorItem, type FaceItem } from './cosmetics'

const STARTER_COLORS = COLOR_ITEMS.filter(c => c.unlock.kind === 'starter').map(c => c.id)
const colorById = new Map(COLOR_ITEMS.map(c => [c.id, c]))
const faceById = new Map(FACE_ITEMS.map(f => [f.id, f]))

/** Детерминированный стартовый цвет нового игрока (по id). */
export function defaultColor(seed: number): string {
  const pool = STARTER_COLORS.length ? STARTER_COLORS : COLOR_ITEMS.map(c => c.id)
  return pool[Math.abs(Math.floor(seed)) % pool.length]
}

export const defaultFace = DEFAULT_EQUIP.face

export function colorOf(id: string | null | undefined, seed = 0): ColorItem {
  return (id && colorById.get(id)) || colorById.get(defaultColor(seed)) || COLOR_ITEMS[0]
}

export function faceOf(id: string | null | undefined): FaceItem {
  return (id && faceById.get(id)) || faceById.get(DEFAULT_EQUIP.face) || FACE_ITEMS[0]
}
