// Достижения — постоянный «хребет» мета-слоя (§6–7 библии). Определения живут в
// коде (как BADGES/COSMETICS), прогресс считается из свёрнутых счётчиков
// (user_progress, §2.5) и базовой статистики. Каждое достижение — «лесенка»:
// одна цель с растущими порогами и тирами. Единый источник правды клиент+сервер.

import { CATEGORIES, GAMES, type Category, type GameDef } from './games'

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
  /** id игры для достижений уровня игры (§7B); null/undefined — кросс-игровое. */
  gameId?: string
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
    id: 'frenemies', category: 'social', stat: 'frenemies',
    title: 'Друзья-соперники', desc: 'Обыграй друга в РАЗНЫХ играх (§7A ⑱)',
    rungs: [r('bronze', 3, 'Троих обыграл'), r('silver', 10, 'Десяток'), r('gold', 25, 'Заклятые друзья')],
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
  // Скрытый кластер (§7A ⑲): сюрприз-открытия, показываются как «???» до взятия.
  {
    id: 'hoarder', category: 'economy', stat: 'coins_held', hidden: true,
    title: 'Копилка', desc: 'Скопи 25 000 Game на балансе (и потрать же!)',
    rungs: [r('silver', 25000, 'Копилка')],
  },
  {
    id: 'nightowl', category: 'dedication', stat: 'nightowl', hidden: true,
    title: 'Сова', desc: 'Сыграй ночью, с 03:00 до 05:00 МСК',
    rungs: [r('bronze', 1, 'Сова')],
  },
  // Дневные ладдеры (§7A ⑤⑥⑦): «в один день» и «разные игры по дням».
  {
    id: 'variety_marathon', category: 'dedication', stat: 'variety_best',
    title: 'Марафон разнообразия', desc: 'Играй в РАЗНЫЕ игры несколько дней подряд',
    rungs: [r('bronze', 3, 'Три дня'), r('silver', 7, 'Неделя разнообразия'), r('gold', 14, 'Две недели'), r('platinum', 30, 'Месяц без повторов')],
  },
  {
    id: 'marathoner', category: 'dedication', stat: 'day_games',
    title: 'Марафонец', desc: 'Сыграй в 10 разных игр за один день',
    rungs: [r('silver', 10, 'Марафонец')],
  },
  {
    id: 'seven_for_seven', category: 'skill', stat: 'day_cats', hidden: true,
    title: 'Семь на семь', desc: 'Победи в играх всех 7 жанров за один день',
    rungs: [r('platinum', 7, 'Семь на семь')],
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

// ── Полимат (§7A ④): стань «Мастером» в N разных играх ─────────────────────
// Требует достижений уровня игры (ниже), поэтому живёт рядом с ними и считается
// в мета-проходе (games_mastered набирается из открытых «Мастеров»).
const POLYMATH: Achievement = {
  id: 'polymath', category: 'dedication', stat: 'games_mastered',
  title: 'Полимат', desc: 'Становись «Мастером» в разных играх',
  rungs: [r('silver', 1, 'Мастер'), r('gold', 5, 'Полимат'), r('platinum', 15, 'Эрудит-мастер'), r('diamond', 41, 'Мастер мастеров')],
}

// ── Достижения уровня игры (§7B): один шаблон из 10 архетипов × 41 игра ≈ 410 ─
// Конвенция ключей прогресса (их наполняет сервер из отчёта матча, см. SDK):
//   successes_game_<id>  — победа ИЛИ финиш (прогресс/победитель)
//   matches_game_<id>    — сыграно матчей (любой исход)
//   winsvsh_game_<id>    — побед над живыми людьми
//   f_<id>_<flag>        — булев «фирменный» момент из report.stats (счётчик срабатываний)
//   s_<id>_<num>         — числовое накопление из report.stats (голы, сундуки…)
//   modes_game_<id>      — сколько разных режимов сыграно (для «Знатока режимов»)
//   master_<id>          — производное: все достижения игры взяты (мета-проход)
// Игре, чтобы «зажечь» достижение, достаточно прислать нужный ключ в stats —
// хабу не нужен код на игру (данные-как-конфиг, §7B). SDK-PER-GAME.md перечисляет
// требуемые ключи по каждой игре.

const A = (
  gameId: string, suffix: string, category: AchCategory, stat: string,
  title: string, desc: string, rungs: Rung[], hidden = false,
): Achievement => ({ id: `${gameId}_${suffix}`, gameId, category, stat, title, desc, rungs, hidden })

/** «Проколы» по жанрам для архетипа «Безупречно» (#4). */
const FLAWLESS: Record<Category, string> = {
  cards: 'Победи, не набрав ни одного штрафного очка',
  board: 'Победи, не потеряв ни одной фигуры',
  party: 'Победи с идеальным раундом',
  word: 'Победи, не сделав ни одной ошибки',
  arcade: 'Победи, не получив ни одного урона',
  puzzle: 'Реши без подсказок и отмен',
  strategy: 'Победи, не потеряв ни одной фигуры',
}
/** Порог скорости по жанрам для «Молнии» (#5). */
const FAST: Record<Category, string> = {
  cards: 'Победи за минимум ходов',
  board: 'Победи менее чем за 25 ходов',
  party: 'Победи в экспресс-темпе',
  word: 'Угадай с первых попыток',
  arcade: 'Победи быстрее порога времени',
  puzzle: 'Реши быстрее порога времени',
  strategy: 'Победи менее чем за 25 ходов',
}
/** Фирменный приём (#8) по играм; нет записи — общий «Виртуоз». */
const SIG: Record<string, { name: string; desc: string }> = {
  uno: { name: 'Чистая рука', desc: 'Победи, скинув последней картой «+4»' },
  domino: { name: 'Рыба', desc: 'Выиграй по очкам в наглухо заблокированной партии' },
  morskoyboy: { name: 'Снайпер', desc: 'Потопи весь флот, потратив ≤25 выстрелов' },
  go: { name: 'Территория', desc: 'Победи с перевесом в 50+ очков' },
  shogi: { name: 'Мат в миттельшпиле', desc: 'Победи менее чем за 25 ходов' },
  xiangqi: { name: 'Мат в миттельшпиле', desc: 'Победи менее чем за 25 ходов' },
  hrumik: { name: 'Обжора', desc: 'Съешь всю доску и 4 призраков за один буст' },
  viktorina: { name: 'Эрудит', desc: 'Пройди раунд без единой ошибки' },
  croco: { name: 'Телепат', desc: 'Угадай слово меньше чем за 10 секунд' },
  mahjong: { name: 'Чистое поле', desc: 'Разбери доску без отмен' },
  kubik: { name: 'Спидкубер', desc: 'Собери кубик быстрее порога' },
  magnat: { name: 'Монополист', desc: 'Победи, владея полным набором цвета с отелями' },
  mafia: { name: 'Крёстный отец', desc: 'Победи за Мафию, оставшись до конца' },
  duplet: { name: 'Чистый прогон', desc: 'Забей все свои шары и восьмёрку без промаха' },
  reversi: { name: 'Разгром', desc: 'Победи, заняв 50+ клеток' },
  ryad: { name: 'Двойная угроза', desc: 'Победи, создав вилку из двух угроз' },
  loto: { name: 'Полный дом', desc: 'Закрой карточку раньше всех «по кону»' },
  lesenki: { name: 'Змеелов', desc: 'Дойди до финиша, не съехав ни по одной змее' },
  bukvica: { name: 'Слово дня', desc: 'Собери слово из 7 букв на бонусной клетке' },
  pletenka: { name: 'Филолог', desc: 'Найди все слова, не ошибившись' },
  viselitsa: { name: 'С первой буквы', desc: 'Угадай слово, не сделав ни одной ошибки' },
  puzyrik: { name: 'Каскад', desc: 'Схлопни 10+ шаров одним выстрелом' },
  shaybus: { name: 'Всухую', desc: 'Победи со счётом 7:0' },
  rikoshet: { name: 'Одним махом', desc: 'Выбей целый ряд одним рикошетом' },
  tanchiki: { name: 'Крепость', desc: 'Пройди волну, не потеряв базу' },
  zabava: { name: 'Три из трёх', desc: 'Победи во всех трёх мини-играх подряд' },
  kletki: { name: 'Без ошибок', desc: 'Реши нонограмму без единой ошибки' },
  linik: { name: 'Пятёрка', desc: 'Собери линию из 5 шаров одним ходом' },
  skladik: { name: 'Оптимист', desc: 'Реши уровень за минимум ходов' },
  legion: { name: 'Континент', desc: 'Удержи целый континент до своего хода' },
  natisk: { name: 'Блицкриг', desc: 'Захвати карту за минимум ходов' },
  saxalarm: { name: 'Заводила', desc: 'Победи в компании из 6+ человек' },
  kartishki: { name: 'Панчлайн', desc: 'Выиграй раунд ведущим' },
  slabo: { name: 'Смельчак', desc: 'Выполни задание «действие» на камеру' },
  krot: { name: 'Контрразведка', desc: 'Вычисли крота с первого голосования' },
}

const MODE_COUNT: Record<GameDef['players'], number> = { solo: 1, multi: 2, both: 3 }

/** Стандартный набор из 10 архетипов для не-флагманской игры (multi/both). */
function templateSet(g: GameDef): Achievement[] {
  const n = g.name
  const sig = SIG[g.id] ?? { name: 'Виртуоз', desc: `Соверши фирменный приём игры «${n}»` }
  return [
    A(g.id, 'firstwin', 'progression', `successes_game_${g.id}`, 'Первая победа', `Впервые пройди матч в «${n}»`, [r('bronze', 1, 'Дебют')]),
    A(g.id, 'regular', 'dedication', `matches_game_${g.id}`, 'Завсегдатай', `Играй в «${n}»`, [r('bronze', 25, 'Новичок'), r('silver', 100, 'Завсегдатай')]),
    A(g.id, 'winner', 'progression', `successes_game_${g.id}`, 'Победитель', `Побеждай в «${n}»`, [r('silver', 10, 'Победитель'), r('gold', 50, 'Мастер'), r('diamond', 200, 'Легенда')]),
    A(g.id, 'flawless', 'skill', `f_${g.id}_flawless`, 'Безупречно', FLAWLESS[g.category], [r('gold', 1, 'Безупречно')]),
    A(g.id, 'fast', 'skill', `f_${g.id}_fast`, 'Молния', FAST[g.category], [r('gold', 1, 'Молния')]),
    A(g.id, 'comeback', 'skill', `f_${g.id}_comeback`, 'Камбэк', 'Победи из явно проигрышной позиции', [r('gold', 1, 'Камбэк')], true),
    A(g.id, 'humans', 'social', `winsvsh_game_${g.id}`, 'Против людей', `Обыгрывай живых соперников в «${n}»`, [r('silver', 3, 'Гроза лобби')]),
    A(g.id, 'signature', 'skill', `f_${g.id}_signature`, sig.name, sig.desc, [r('gold', 1, sig.name)]),
    A(g.id, 'collector', 'collection', `modes_game_${g.id}`, 'Знаток режимов', `Сыграй во всех режимах «${n}»`, [r('silver', MODE_COUNT[g.players], 'Знаток режимов')]),
    A(g.id, 'master', 'meta', `master_${g.id}`, `Мастер: ${n}`, `Открой все достижения «${n}»`, [r('platinum', 1, `Мастер «${n}»`)]),
  ]
}

// Флагманы и соло-игры — авторские наборы (§7B); архетипы те же, но «под игру».
const maniacSet = (g: GameDef): Achievement[] => [
  A(g.id, 'firstwin', 'progression', `successes_game_${g.id}`, 'Первая кровь', 'Выиграй первый матч в «Маньяке»', [r('bronze', 1, 'Первая кровь')]),
  A(g.id, 'signature', 'skill', `f_${g.id}_novote`, 'Кто здесь Маньяк', 'Победи за Маньяка, не собрав против себя ни одного голоса', [r('gold', 1, 'Кто здесь Маньяк')]),
  A(g.id, 'sheriff', 'skill', `f_${g.id}_sheriff`, 'Меткий шериф', 'За Шерифа потрать единственный патрон точно в Маньяка', [r('gold', 1, 'Меткий шериф')]),
  A(g.id, 'deduction', 'skill', `f_${g.id}_deciding`, 'Дедукция', 'За мирного подай решающий голос, изгоняющий Маньяка', [r('silver', 1, 'Дедукция')]),
  A(g.id, 'flawless', 'skill', `f_${g.id}_survived`, 'Выживший', 'Доживи до конца матча 10 раз', [r('gold', 10, 'Выживший')]),
  A(g.id, 'winner', 'progression', `successes_game_${g.id}`, 'Серийный', 'Побеждай в «Маньяке»', [r('silver', 10, 'Серийный'), r('gold', 50, 'Хищник'), r('diamond', 200, 'Кошмар города')]),
  A(g.id, 'humans', 'social', `f_${g.id}_fulltable`, 'Полный стол', 'Победи в матче с 6+ живыми игроками', [r('silver', 1, 'Полный стол')]),
  A(g.id, 'regular', 'dedication', `matches_game_${g.id}`, 'Ночной город', 'Играй в «Маньяка»', [r('bronze', 25, 'Завсегдатай'), r('silver', 100, 'Ночной город')]),
  A(g.id, 'comeback', 'skill', `f_${g.id}_accused`, 'Хладнокровный', 'За Маньяка победи после публичного обвинения', [r('gold', 1, 'Хладнокровный')], true),
  A(g.id, 'master', 'meta', `master_${g.id}`, 'Мастер Маньяка', 'Открой все достижения «Маньяка»', [r('platinum', 1, 'Мастер Маньяка')]),
]
const nitroSet = (g: GameDef): Achievement[] => [
  A(g.id, 'firstwin', 'progression', `successes_game_${g.id}`, 'Первый гол', 'Выиграй первый матч в «Нитро-лиге»', [r('bronze', 1, 'Первый гол')]),
  A(g.id, 'signature', 'skill', `f_${g.id}_hattrick`, 'Хет-трик', 'Забей 3+ гола за один матч', [r('gold', 1, 'Хет-трик')]),
  A(g.id, 'aerial', 'skill', `f_${g.id}_aerial`, 'Воздушный ас', 'Забей гол с лёта, в воздухе', [r('gold', 1, 'Воздушный ас')]),
  A(g.id, 'flawless', 'skill', `f_${g.id}_clean`, 'Сухая победа', 'Выиграй, не пропустив ни одного гола', [r('gold', 1, 'Сухая победа')]),
  A(g.id, 'comeback', 'skill', `f_${g.id}_comeback`, 'Камбэк', 'Выиграй, уступая 2+ гола', [r('gold', 1, 'Камбэк')], true),
  A(g.id, 'scorer', 'progression', `s_${g.id}_goals`, 'Бомбардир', 'Забивай голы', [r('silver', 100, 'Бомбардир'), r('gold', 500, 'Голеадор')]),
  A(g.id, 'winner', 'progression', `successes_game_${g.id}`, 'Чемпион', 'Побеждай в «Нитро-лиге»', [r('silver', 10, 'Чемпион'), r('gold', 50, 'Звезда лиги'), r('diamond', 200, 'Легенда')]),
  A(g.id, 'humans', 'social', `winsvsh_game_${g.id}`, 'Дерби', 'Обыграй живого соперника', [r('silver', 1, 'Дерби')]),
  A(g.id, 'regular', 'dedication', `matches_game_${g.id}`, 'На разогреве', 'Играй в «Нитро-лигу»', [r('bronze', 25, 'На разогреве'), r('silver', 100, 'Ветеран трассы')]),
  A(g.id, 'master', 'meta', `master_${g.id}`, 'Мастер Нитро', 'Открой все достижения «Нитро-лиги»', [r('platinum', 1, 'Мастер Нитро')]),
]
const neonSet = (g: GameDef): Achievement[] => [
  A(g.id, 'firstwin', 'progression', `successes_game_${g.id}`, 'Спуск на воду', 'Заверши первый заплыв в «Неон-Тайде»', [r('bronze', 1, 'Спуск на воду')]),
  A(g.id, 'flawless', 'skill', `f_${g.id}_flawless`, 'Целым и невредимым', 'Доберись до сундука, не потеряв ни одного блока', [r('gold', 1, 'Целым и невредимым')]),
  A(g.id, 'signature', 'skill', `f_${g.id}_gold`, 'Золотой флот', 'Заверши заплыв на золотых блоках', [r('gold', 1, 'Золотой флот')]),
  A(g.id, 'engineer', 'skill', `f_${g.id}_waterfall`, 'Инженер', 'Переживи секцию водопада', [r('gold', 1, 'Инженер')]),
  A(g.id, 'fast', 'skill', `f_${g.id}_fast`, 'Скороход', 'Заверши заплыв быстрее порога', [r('gold', 1, 'Скороход')]),
  A(g.id, 'chest', 'progression', `s_${g.id}_chest`, 'Богач', 'Забирай золотой сундук', [r('silver', 25, 'Богач'), r('gold', 100, 'Магнат реки')]),
  A(g.id, 'winner', 'progression', `successes_game_${g.id}`, 'Речной волк', 'Заверши заплывы', [r('silver', 10, 'Речной волк'), r('gold', 50, 'Капитан'), r('diamond', 200, 'Легенда реки')]),
  A(g.id, 'humans', 'social', `f_${g.id}_coop`, 'Кооп', 'Заверши заплыв вместе с другом', [r('silver', 1, 'Кооп')]),
  A(g.id, 'regular', 'dedication', `matches_game_${g.id}`, 'Юнга', 'Играй в «Неон-Тайд»', [r('bronze', 25, 'Юнга'), r('silver', 100, 'Боцман')]),
  A(g.id, 'master', 'meta', `master_${g.id}`, 'Мастер Неон-Тайда', 'Открой все достижения «Неон-Тайда»', [r('platinum', 1, 'Мастер Неон-Тайда')]),
]
const chekSet = (g: GameDef): Achievement[] => [
  A(g.id, 'firstwin', 'progression', `successes_game_${g.id}`, 'Корона', 'Возьми первую корону в «Чехарде»', [r('bronze', 1, 'Корона')]),
  A(g.id, 'flawless', 'skill', `f_${g.id}_nofall`, 'Без падений', 'Выиграй эпизод, ни разу не упав', [r('gold', 1, 'Без падений')]),
  A(g.id, 'fast', 'skill', `f_${g.id}_fast`, 'Зефирная молния', 'Возьми финальный раунд быстрее порога', [r('gold', 1, 'Зефирная молния')]),
  A(g.id, 'finalist', 'skill', `f_${g.id}_final`, 'Финалист', 'Дойди до третьего раунда 10 раз', [r('silver', 10, 'Финалист')]),
  A(g.id, 'humans', 'social', `f_${g.id}_full`, 'Полный лоббик', 'Победи в полном лобби из 16 игроков', [r('gold', 1, 'Полный лоббик')]),
  A(g.id, 'qualify', 'progression', `s_${g.id}_qualify`, 'Живучий', 'Проходи первый раунд', [r('silver', 50, 'Живучий'), r('gold', 200, 'Неубиваемый')]),
  A(g.id, 'winner', 'progression', `successes_game_${g.id}`, 'Серийный чемпион', 'Бери короны', [r('silver', 10, 'Серийный чемпион'), r('gold', 50, 'Король шоу'), r('diamond', 200, 'Легенда')]),
  A(g.id, 'comeback', 'skill', `f_${g.id}_comeback`, 'Камбэк', 'Победи, будучи последним в начале третьего раунда', [r('gold', 1, 'Камбэк')], true),
  A(g.id, 'regular', 'dedication', `matches_game_${g.id}`, 'Разминка', 'Играй в «Чехарду»', [r('bronze', 25, 'Разминка'), r('silver', 100, 'Завсегдатай')]),
  A(g.id, 'master', 'meta', `master_${g.id}`, 'Мастер Чехарды', 'Открой все достижения «Чехарды»', [r('platinum', 1, 'Мастер Чехарды')]),
]
const paukSet = (g: GameDef): Achievement[] => [
  A(g.id, 'firstwin', 'progression', `successes_game_${g.id}`, 'Первый пасьянс', 'Собери первый пасьянс в «Пауке»', [r('bronze', 1, 'Первый пасьянс')]),
  A(g.id, 'regular', 'dedication', `matches_game_${g.id}`, 'Раскладчик', 'Раскладывай «Паука»', [r('bronze', 25, 'Раскладчик'), r('silver', 100, 'Завсегдатай')]),
  A(g.id, 'winner', 'progression', `successes_game_${g.id}`, 'Пасьянсник', 'Собирай пасьянсы', [r('silver', 10, 'Пасьянсник'), r('gold', 50, 'Мастер раскладов'), r('diamond', 200, 'Легенда пасьянса')]),
  A(g.id, 'flawless', 'skill', `f_${g.id}_flawless`, 'Без отмен', 'Собери пасьянс, ни разу не отменив ход', [r('gold', 1, 'Без отмен')]),
  A(g.id, 'fast', 'skill', `f_${g.id}_fast`, 'Скоростной', 'Собери пасьянс быстрее порога', [r('gold', 1, 'Скоростной')]),
  A(g.id, 'signature', 'skill', `f_${g.id}_signature`, 'Паучок', 'Собери расклад в две масти', [r('gold', 1, 'Паучок')]),
  A(g.id, 'hard', 'skill', `f_${g.id}_hard`, 'Арахнолог', 'Собери расклад в четыре масти', [r('silver', 1, 'Арахнолог')]),
  A(g.id, 'clean', 'skill', `f_${g.id}_clean`, 'Чистое поле', 'Разбери всю доску без застреваний', [r('silver', 1, 'Чистое поле')]),
  A(g.id, 'comeback', 'skill', `f_${g.id}_comeback`, 'Из тупика', 'Собери пасьянс из почти безвыходного расклада', [r('gold', 1, 'Из тупика')], true),
  A(g.id, 'master', 'meta', `master_${g.id}`, 'Мастер Паука', 'Открой все достижения «Паука»', [r('platinum', 1, 'Мастер Паука')]),
]
const petSet = (g: GameDef): Achievement[] => [
  A(g.id, 'firstwin', 'progression', `successes_game_${g.id}`, 'Первый друг', 'Проведи первый день с питомцем', [r('bronze', 1, 'Первый друг')]),
  A(g.id, 'regular', 'dedication', `matches_game_${g.id}`, 'Хозяин', 'Заботься о питомце', [r('bronze', 25, 'Хозяин'), r('silver', 100, 'Верный хозяин')]),
  A(g.id, 'care', 'progression', `successes_game_${g.id}`, 'Заботливый', 'Проводи дни с питомцем', [r('silver', 10, 'Заботливый'), r('gold', 50, 'Любящий'), r('diamond', 200, 'Родная душа')]),
  A(g.id, 'full', 'skill', `f_${g.id}_full`, 'Здоровяк', 'Доведи все показатели питомца до максимума', [r('gold', 1, 'Здоровяк')]),
  A(g.id, 'signature', 'skill', `f_${g.id}_signature`, 'Лучший друг', 'Достигни максимальной привязанности', [r('gold', 1, 'Лучший друг')]),
  A(g.id, 'gourmet', 'skill', `f_${g.id}_variety`, 'Гурман', 'Накорми питомца всеми видами еды', [r('silver', 1, 'Гурман')]),
  A(g.id, 'clean', 'skill', `f_${g.id}_clean`, 'Чистюля', 'Держи питомца ухоженным неделю подряд', [r('silver', 1, 'Чистюля')]),
  A(g.id, 'playful', 'skill', `f_${g.id}_fast`, 'Непоседа', 'Сыграй с питомцем во все мини-игры', [r('gold', 1, 'Непоседа')]),
  A(g.id, 'comeback', 'skill', `f_${g.id}_comeback`, 'Второе дыхание', 'Верни к жизни запущенного питомца', [r('gold', 1, 'Второе дыхание')], true),
  A(g.id, 'master', 'meta', `master_${g.id}`, 'Мастер Шарика', 'Открой все достижения «Шарика»', [r('platinum', 1, 'Мастер Шарика')]),
]

const BESPOKE: Record<string, (g: GameDef) => Achievement[]> = {
  maniac: maniacSet, nitroliga: nitroSet, neontide: neonSet, chekharda: chekSet,
  pauk: paukSet, pet: petSet,
}

/** Достижения уровня игры для всех 41 игры (флагманы/соло — авторские, прочее — шаблон). */
export const PER_GAME: Achievement[] = GAMES.flatMap(g => (BESPOKE[g.id] ?? templateSet)(g))

export const ACHIEVEMENTS: Achievement[] = [...CROSS, POLYMATH, ...CATEGORY_MASTERS, ...PER_GAME]

/** Ключи-величины, которые считаются во ВТОРОМ проходе (зависят от очков/числа
 *  уже открытых достижений / «Мастеров»). */
export const META_STATS = new Set(['gg_score', 'achievements_unlocked', 'games_mastered'])

/** Достижение — производный «Мастер игры» (открывается, когда взяты все прочие её достижения). */
export function isMasterStat(stat: string): boolean {
  return stat.startsWith('master_')
}

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
  /** id игры для достижений уровня игры; отсутствует у кросс-игровых. */
  gameId?: string
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
