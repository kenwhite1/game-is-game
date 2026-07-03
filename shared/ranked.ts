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

// ─── Настоящий Glicko-2 (§13.2) ────────────────────────────────────────────
// Используется, когда игра прислала id соперников: их текущие рейтинги — вход.
export const START_RD = 350
export const START_VOL = 0.06
export const GLICKO_TAU = 0.5
const GLICKO_SCALE = 173.7178

export interface Glicko { rating: number; rd: number; vol: number }

/** Один рейтинг-период Glicko-2: игрок против набора соперников с общим исходом
 *  (score: 1 победа / 0 поражение / 0.5 ничья ко ВСЕМ). Возвращает новые rating/rd/vol. */
export function glicko2Update(p: Glicko, opps: { rating: number; rd: number }[], score: number): Glicko {
  if (opps.length === 0) return p
  const mu = (p.rating - START_RATING) / GLICKO_SCALE
  const phi = p.rd / GLICKO_SCALE
  const g = (ph: number) => 1 / Math.sqrt(1 + (3 * ph * ph) / (Math.PI * Math.PI))
  const E = (muJ: number, phiJ: number) => 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)))
  let vInv = 0
  let deltaSum = 0
  for (const o of opps) {
    const muJ = (o.rating - START_RATING) / GLICKO_SCALE
    const phiJ = o.rd / GLICKO_SCALE
    const gj = g(phiJ)
    const ej = E(muJ, phiJ)
    vInv += gj * gj * ej * (1 - ej)
    deltaSum += gj * (score - ej)
  }
  const v = 1 / vInv
  const delta = v * deltaSum
  // Итерация волатильности (алгоритм Иллинойса).
  const a = Math.log(p.vol * p.vol)
  const f = (x: number) => {
    const ex = Math.exp(x)
    const d2 = delta * delta
    const pv = phi * phi + v + ex
    return (ex * (d2 - phi * phi - v - ex)) / (2 * pv * pv) - (x - a) / (GLICKO_TAU * GLICKO_TAU)
  }
  let A = a
  let B: number
  if (delta * delta > phi * phi + v) B = Math.log(delta * delta - phi * phi - v)
  else { let k = 1; while (f(a - k * GLICKO_TAU) < 0) k++; B = a - k * GLICKO_TAU }
  let fA = f(A)
  let fB = f(B)
  let iter = 0
  while (Math.abs(B - A) > 1e-6 && iter++ < 100) {
    const C = A + ((A - B) * fA) / (fB - fA)
    const fC = f(C)
    if (fC * fB <= 0) { A = B; fA = fB } else { fA = fA / 2 }
    B = C; fB = fC
  }
  const newVol = Math.exp(A / 2)
  const phiStar = Math.sqrt(phi * phi + newVol * newVol)
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v)
  const newMu = mu + newPhi * newPhi * deltaSum
  return { rating: newMu * GLICKO_SCALE + START_RATING, rd: newPhi * GLICKO_SCALE, vol: newVol }
}

/** Мягкий сброс сезона (§13.2): сжать рейтинг к среднему, вернуть неуверенность. */
export function softResetSeed(prevRating: number): Glicko {
  return { rating: START_RATING + (prevRating - START_RATING) * 0.5, rd: 200, vol: START_VOL }
}

/** Распад рейтинга на Мастер+ при простое (§13.2): −20/неделю сверх 7 дней. */
export function decayedRating(rating: number, staleDays: number): number {
  if (rating < 1600 || staleDays <= 7) return rating
  const weeks = (staleDays - 7) / 7
  return Math.max(1600, rating - weeks * 20)
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
