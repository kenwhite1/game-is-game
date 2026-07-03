// Прогресс игрока: уровни, опыт и значки. Единый источник правды для
// клиента и сервера, чтобы шкала уровня и значки считались одинаково везде.
// Без браузерных или Node-зависимостей: файл должен импортироваться отовсюду.

/** Сколько опыта даёт один запуск игры из хаба (историческое, для бэкфилла). */
export const XP_PER_OPEN = 25

/** Опыт игрока выводится из числа запусков: один источник правды, без рассинхрона. */
export function xpFromOpens(opens: number): number {
  return Math.max(0, Math.floor(opens)) * XP_PER_OPEN
}

// ─── Кривая уровней (§5.3) ─────────────────────────────────────────────────
// Плавно растущая: быстрые ранние уровни для онбординга, «престижные» поздние.
//   xpToNext(level) = 80 + 20·level   → L1→2 = 100, L2→3 = 120, … L49→50 = 1060.
//   cumulativeXP(L)  = 10·L² + 70·L − 80 (XP, чтобы ДОСТИЧЬ уровня L; L1 = 0).
// ≈29k XP до L50, ≈107k до L100 — L100 как марафонский знак отличия.

/** XP, нужный для перехода с `level` на `level+1`. */
export function xpToNext(level: number): number {
  return 80 + 20 * Math.max(1, Math.floor(level))
}
/** Накопленный XP, чтобы ДОСТИЧЬ уровня `level` (level ≥ 1). cumulativeXP(1) = 0. */
export function cumulativeXP(level: number): number {
  const n = Math.max(0, Math.floor(level) - 1)
  return 80 * n + 10 * n * (n + 1) // Σ_{k=1..n}(80+20k) = 80n + 10n(n+1)
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
  // Инверсия cumulativeXP: cumXP(L) = 10L²+70L−80 ≤ safe. Корень квадратного.
  const level = Math.max(1, Math.floor((-70 + Math.sqrt(4900 + 40 * (80 + safe))) / 20))
  const floor = cumulativeXP(level)
  const ceil = cumulativeXP(level + 1)
  const span = ceil - floor
  return { level, floor, ceil, into: safe - floor, span, pct: span > 0 ? (safe - floor) / span : 0 }
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
