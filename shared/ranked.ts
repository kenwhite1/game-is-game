// Ранговый режим и лидерборды (§13 библии). Рейтинг per-game считается СЕРВЕРОМ
// из match_results (только против людей). Пока игры не рапортуют матчи через
// SDK, рейтинги стоят на месте — движок готов и включается по мере интеграции.
// Дивизионы — видимый слой над числовым рейтингом. GG-лига агрегирует лучшие
// дивизионы по всем ранговым играм: мастер в трёх играх выше специалиста в одной.

/** Игры со смыслом ранга (навык, не удача) — §13.2. */
export const RANKED_GAMES = new Set<string>([
  'go', 'shogi', 'xiangqi', 'reversi', 'ryad', 'morskoyboy',
  'nitroliga', 'shaybus', 'duplet', 'maniac',
])

export const START_RATING = 1000
/** Якорь «среднего соперника» для Elo-против-поля (пока в SDK нет id соперника). */
export const FIELD_ANCHOR = 1000

export interface Division { name: string; tier: string; index: number }

// Границы дивизионов по рейтингу. Внутри полосы — под-тиры III/II/I.
const BANDS: { min: number; name: string }[] = [
  { min: -Infinity, name: 'Бронза' },
  { min: 1000, name: 'Серебро' },
  { min: 1150, name: 'Золото' },
  { min: 1300, name: 'Платина' },
  { min: 1450, name: 'Алмаз' },
  { min: 1600, name: 'Мастер' },
  { min: 1750, name: 'Грандмастер' },
]

export function divisionOf(rating: number): Division {
  let idx = 0
  for (let i = 0; i < BANDS.length; i++) if (rating >= BANDS[i].min) idx = i
  const band = BANDS[idx]
  // Под-тир: где в 150-очковой полосе находится рейтинг (I — верх). Бронза и
  // Грандмастер без под-тиров.
  if (idx === 0 || idx === BANDS.length - 1) return { name: band.name, tier: '', index: idx }
  const into = rating - band.min // 0..150
  const sub = into >= 100 ? 'I' : into >= 50 ? 'II' : 'III'
  return { name: band.name, tier: sub, index: idx }
}

export function divisionLabel(rating: number): string {
  const d = divisionOf(rating)
  return d.tier ? `${d.name} ${d.tier}` : d.name
}

/** Вклад игры в GG-лигу: насколько рейтинг выше среднего (только «сверх поля»). */
export function ladderContribution(rating: number): number {
  return Math.max(0, Math.round(rating - START_RATING))
}

/** K-фактор: новичкам двигаем рейтинг резче, опытным — плавно. */
export function kFactor(games: number): number {
  return games < 10 ? 40 : 24
}

/** Ожидание победы против «поля» (Elo). */
export function expectedScore(rating: number): number {
  return 1 / (1 + Math.pow(10, (FIELD_ANCHOR - rating) / 400))
}

export interface RankedGameView { gameId: string; name: string; rating: number; games: number; division: string; peakDivision: string }
export interface RankedView {
  /** Суммарный рейтинг GG-лиги (сумма вкладов по всем ранговым играм). */
  ladder: number
  games: RankedGameView[]
}

export interface BoardRow { id: number; name: string; value: number; isMe: boolean }
export interface Boards {
  ggScore: BoardRow[]
  weeklyCoins: BoardRow[]
  ggLadder: BoardRow[]
}
