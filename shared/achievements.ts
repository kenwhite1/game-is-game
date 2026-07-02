// Достижения — постоянный «хребет» мета-слоя (§6–7 библии). Определения живут в
// коде (как BADGES/COSMETICS), прогресс считается из свёрнутых счётчиков
// (user_progress, §2.5) и базовой статистики. Каждое достижение — «лесенка»:
// одна цель с растущими порогами и тирами. Единый источник правды клиент+сервер.

import { CATEGORIES } from './games'

export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

export const TIER_META: Record<Tier, { points: number; coins: number; ru: string; emoji: string }> = {
  bronze: { points: 15, coins: 50, ru: 'Бронза', emoji: '🥉' },
  silver: { points: 30, coins: 120, ru: 'Серебро', emoji: '🥈' },
  gold: { points: 90, coins: 350, ru: 'Золото', emoji: '🥇' },
  platinum: { points: 180, coins: 800, ru: 'Платина', emoji: '💎' },
  diamond: { points: 300, coins: 1500, ru: 'Алмаз', emoji: '🌟' },
}

export type AchCategory =
  | 'exploration' | 'progression' | 'skill' | 'collection'
  | 'social' | 'dedication' | 'meta' | 'economy'

export const ACH_CATEGORY_RU: Record<AchCategory, string> = {
  exploration: 'Открытия', progression: 'Прогресс', skill: 'Мастерство',
  collection: 'Коллекция', social: 'Общество', dedication: 'Преданность',
  meta: 'Мета', economy: 'Экономика',
}

export interface Rung { tier: Tier; target: number; name: string }

export interface Achievement {
  id: string
  category: AchCategory
  /** Ключ величины в снимке прогресса (сервер собирает snapshot: key -> число). */
  stat: string
  /** Отображаемое имя «лесенки». */
  title: string
  desc: string
  hidden?: boolean
  /** Пороги по возрастанию. */
  rungs: Rung[]
}

const r = (tier: Tier, target: number, name: string): Rung => ({ tier, target, name })

// ── Кросс-игровые «лесенки» (§7A) — то, ради чего хаб лучше папки из 41 игры ──
const CROSS: Achievement[] = [
  {
    id: 'catalogue', category: 'exploration', stat: 'distinct_games_played',
    title: 'Знаток каталога', desc: 'Сыграй в разные игры каталога',
    rungs: [r('bronze', 5, 'Дегустатор'), r('silver', 15, 'Гурман'), r('gold', 30, 'Энциклопедист'), r('platinum', 41, 'Прошёл всё')],
  },
  {
    id: 'category_conqueror', category: 'exploration', stat: 'categories_won',
    title: 'Чемпион категорий', desc: 'Побеждай в разных жанрах',
    rungs: [r('bronze', 3, 'Три жанра'), r('silver', 5, 'Пять жанров'), r('gold', 7, 'Мастер на все руки')],
  },
  {
    id: 'centurion', category: 'progression', stat: 'total_wins',
    title: 'Центурион', desc: 'Побеждай в матчах по всему каталогу',
    rungs: [r('bronze', 10, 'Боец'), r('silver', 50, 'Ветеран'), r('gold', 250, 'Чемпион'), r('diamond', 1000, 'Легенда GG')],
  },
  {
    id: 'collector', category: 'collection', stat: 'cosmetics_owned',
    title: 'Коллекционер', desc: 'Собирай косметику',
    rungs: [r('bronze', 10, 'Стиляга'), r('silver', 30, 'Модник'), r('gold', 60, 'Кутюрье'), r('platinum', 120, 'Гардеробщик')],
  },
  {
    id: 'humans_beater', category: 'social', stat: 'humans_beaten',
    title: 'Победитель людей', desc: 'Обыгрывай живых соперников (не ботов)',
    rungs: [r('bronze', 10, 'Задира'), r('silver', 100, 'Гроза лобби'), r('gold', 500, 'Народный чемпион')],
  },
  {
    id: 'patron', category: 'economy', stat: 'coins_spent',
    title: 'Меценат', desc: 'Трать монеты в магазине',
    rungs: [r('bronze', 1000, 'Покупатель'), r('silver', 10000, 'Транжира'), r('gold', 50000, 'Меценат'), r('platinum', 250000, 'Магнат стиля')],
  },
  {
    id: 'giver', category: 'social', stat: 'coins_gifted',
    title: 'Даритель', desc: 'Дари монеты друзьям',
    rungs: [r('bronze', 500, 'Добряк'), r('silver', 5000, 'Щедрый'), r('gold', 25000, 'Меценат друзей')],
  },
  {
    id: 'heart_of_hub', category: 'social', stat: 'friends',
    title: 'Душа хаба', desc: 'Заводи друзей в хабе',
    rungs: [r('bronze', 1, 'Не один'), r('silver', 5, 'Компанейский'), r('gold', 25, 'Популярный'), r('platinum', 100, 'Душа хаба')],
  },
  {
    id: 'ambassador', category: 'social', stat: 'referrals',
    title: 'Амбассадор', desc: 'Приглашай новых игроков',
    rungs: [r('bronze', 1, 'Сарафан'), r('silver', 5, 'Зазывала'), r('gold', 25, 'Амбассадор'), r('platinum', 100, 'Легенда роста')],
  },
  {
    id: 'streak_keeper', category: 'dedication', stat: 'streak_best',
    title: 'Не пропусти ни дня', desc: 'Держи серию дней подряд',
    rungs: [r('bronze', 7, 'Неделя'), r('silver', 30, 'Месяц'), r('gold', 100, 'Клуб 100'), r('diamond', 365, 'Год в GG')],
  },
  // Мета-лесенки (§7A ⑩,⑪): считаются во втором проходе (зависят от остальных).
  {
    id: 'score_grandmaster', category: 'meta', stat: 'gg_score',
    title: 'Гроссмейстер очков', desc: 'Набирай очки достижений (GG Score)',
    rungs: [r('bronze', 500, 'Новичок славы'), r('silver', 2500, 'Знаток'), r('gold', 10000, 'Гроссмейстер'), r('diamond', 25000, 'Небожитель')],
  },
  {
    id: 'trophy_hunter', category: 'meta', stat: 'achievements_unlocked',
    title: 'Охотник за трофеями', desc: 'Открывай достижения',
    rungs: [r('silver', 50, 'Охотник'), r('gold', 150, 'Коллекционер трофеев'), r('platinum', 300, 'Платиновый охотник')],
  },
]

// ── Мастера категорий ×7 (§7A ⑨): по «лесенке» на каждый жанр ──
const CAT_LADDER_NAMES: Record<string, string> = {
  cards: 'Шулер', board: 'Настольный гений', party: 'Душа компании', word: 'Словесник',
  arcade: 'Аркадный ас', puzzle: 'Головолом', strategy: 'Стратег',
}
const CATEGORY_MASTERS: Achievement[] = CATEGORIES.map(c => ({
  id: `cat_master_${c.id}`,
  category: 'skill' as AchCategory,
  stat: `wins_cat_${c.id}`,
  title: CAT_LADDER_NAMES[c.id] ?? c.ru,
  desc: `Побеждай в играх жанра «${c.ru}»`,
  rungs: [r('bronze', 10, `${c.ru}: 10`), r('silver', 50, `${c.ru}: 50`), r('gold', 200, `${c.ru}: 200`)],
}))

export const ACHIEVEMENTS: Achievement[] = [...CROSS, ...CATEGORY_MASTERS]

/** Ключи-величины, которые считаются во ВТОРОМ проходе (зависят от очков/числа
 *  уже открытых достижений). */
export const META_STATS = new Set(['gg_score', 'achievements_unlocked'])

const byId = new Map(ACHIEVEMENTS.map(a => [a.id, a]))
export function achievementById(id: string): Achievement | undefined {
  return byId.get(id)
}

/** Индекс достигнутого тира (0-based) для значения; -1 если ни один порог не взят. */
export function reachedIndex(a: Achievement, value: number): number {
  let idx = -1
  for (let i = 0; i < a.rungs.length; i++) if (value >= a.rungs[i].target) idx = i
  return idx
}

/** Очки за «лесенку», взятую до включительно rungIndex. */
export function pointsUpTo(a: Achievement, rungIndex: number): number {
  let pts = 0
  for (let i = 0; i <= rungIndex && i < a.rungs.length; i++) pts += TIER_META[a.rungs[i].tier].points
  return pts
}

// ── Модель витрины (общая для сервера и клиента) ──────────────────────────
export interface AchView {
  id: string
  title: string
  desc: string
  category: string
  hidden: boolean
  /** Индекс взятого тира (-1 — ещё не начато). */
  tierReached: number
  value: number
  rungs: { tier: Tier; target: number; name: string }[]
  /** Доля игроков, открывших это достижение (0..1). */
  rarity: number
}
export interface AchievementsPayload {
  items: AchView[]
  score: number
  unlocked: number
  total: number
}
