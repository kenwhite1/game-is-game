// Прогресс игрока: уровни, опыт и значки. Единый источник правды для
// клиента и сервера, чтобы шкала уровня и значки считались одинаково везде.
// Без браузерных или Node-зависимостей: файл должен импортироваться отовсюду.

/** Сколько опыта даёт один запуск игры из хаба. */
export const XP_PER_OPEN = 25
/** Сколько опыта нужно на один уровень (линейная кривая, легко читается). */
export const XP_PER_LEVEL = 100

/** Опыт игрока выводится из числа запусков: один источник правды, без рассинхрона. */
export function xpFromOpens(opens: number): number {
  return Math.max(0, Math.floor(opens)) * XP_PER_OPEN
}

export interface LevelInfo {
  level: number
  /** Опыт на старте текущего уровня. */
  floor: number
  /** Опыт, нужный для следующего уровня. */
  ceil: number
  /** Сколько опыта набрано внутри текущего уровня. */
  into: number
  /** Размер уровня в опыте. */
  span: number
  /** Заполнение шкалы 0..1. */
  pct: number
}

export function levelInfo(xp: number): LevelInfo {
  const safe = Math.max(0, Math.floor(xp))
  const level = 1 + Math.floor(safe / XP_PER_LEVEL)
  const floor = (level - 1) * XP_PER_LEVEL
  const ceil = level * XP_PER_LEVEL
  return { level, floor, ceil, into: safe - floor, span: XP_PER_LEVEL, pct: (safe - floor) / XP_PER_LEVEL }
}

// ─── Значки ────────────────────────────────────────────────────────────
// Считаются из простой статистики игрока. earned выставляет сервер.

export interface BadgeStat {
  opens: number
  distinctGames: number
  friends: number
  level: number
  /** Сколько новых игроков пришло по реферальной ссылке игрока. */
  invited: number
}

export interface BadgeDef {
  id: string
  emoji: string
  name: string
  desc: string
  test(s: BadgeStat): boolean
}

export const BADGES: BadgeDef[] = [
  { id: 'first', emoji: '🚀', name: 'Поехали', desc: 'Первый запуск игры', test: s => s.opens >= 1 },
  { id: 'explorer', emoji: '🧭', name: 'Исследователь', desc: 'Сыграно 2 разные игры', test: s => s.distinctGames >= 2 },
  { id: 'collector', emoji: '🎲', name: 'Все четыре', desc: 'Попробованы все игры', test: s => s.distinctGames >= 4 },
  { id: 'regular', emoji: '🔥', name: 'Завсегдатай', desc: '10 запусков игр', test: s => s.opens >= 10 },
  { id: 'veteran', emoji: '👑', name: 'Ветеран', desc: '50 запусков игр', test: s => s.opens >= 50 },
  { id: 'friendly', emoji: '🤝', name: 'Не один', desc: 'Добавлен первый друг', test: s => s.friends >= 1 },
  { id: 'popular', emoji: '🌟', name: 'Душа компании', desc: '5 друзей в хабе', test: s => s.friends >= 5 },
  { id: 'level5', emoji: '⚡', name: '5 уровень', desc: 'Достигнут 5 уровень', test: s => s.level >= 5 },
  { id: 'inviter', emoji: '📣', name: 'Зазывала', desc: 'Первый друг пришёл по твоей ссылке', test: s => s.invited >= 1 },
  { id: 'ambassador', emoji: '🏅', name: 'Амбассадор', desc: '5 друзей пришли по твоей ссылке', test: s => s.invited >= 5 },
]

export interface Badge {
  id: string
  emoji: string
  name: string
  desc: string
  earned: boolean
}

export function computeBadges(s: BadgeStat): Badge[] {
  return BADGES.map(b => ({ id: b.id, emoji: b.emoji, name: b.name, desc: b.desc, earned: b.test(s) }))
}
