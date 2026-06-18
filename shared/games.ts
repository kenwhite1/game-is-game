// Каталог игр Game is Game: единый источник правды для лаунчера и бота.
// Здесь нет ни длинных тире, ни ссылок на конкретную среду, чтобы файл
// одинаково работал и на сервере (Node), и в приложении (браузер).

export interface GameDef {
  /** Стабильный идентификатор (используется в ссылках и аналитике). */
  id: string
  /** Название игры на русском. */
  name: string
  /** Короткая подпись под названием. */
  tagline: string
  /** Одно предложение для экрана «Об этом». */
  blurb: string
  /** Эмодзи-иконка игры. */
  emoji: string
  /** Акцентный цвет плитки (hex). */
  accent: string
  /** Тёмный акцент для нижней «губы» плитки (hex). */
  accentDeep: string
  /** @username бота игры без @. */
  bot: string
}

// Порядок здесь = порядок плиток в меню.
export const GAMES: GameDef[] = [
  {
    id: 'uno',
    name: 'Однушечка',
    tagline: 'Карты по цвету и числу',
    blurb: 'Весёлая карточная игра про цвета и числа, в духе «Уно».',
    emoji: '🎴',
    accent: '#e1554b',
    accentDeep: '#b8362c',
    bot: 'odinkartibot',
  },
  {
    id: 'croco',
    name: 'Крокоша',
    tagline: 'Показывай и угадывай слова',
    blurb: 'Игра в ассоциации, цифровой «Крокодил»: угадывай слова по подсказкам.',
    emoji: '🐊',
    accent: '#54b15a',
    accentDeep: '#37833f',
    bot: 'krokosha_play_bot',
  },
  {
    id: 'mafia',
    name: 'Секрет ночи',
    tagline: 'Тайные роли, блеф и интуиция',
    blurb: 'Социальная игра про доверие и обман, в духе «Мафии».',
    emoji: '🌙',
    accent: '#6c5ce0',
    accentDeep: '#4b3bc0',
    bot: 'secretnochibot',
  },
  {
    id: 'pet',
    name: 'Шарик',
    tagline: 'Питомец, о котором заботишься',
    blurb: 'Тёплая игра про питомца, немного как тамагочи: заботишься о зверьке, а заодно и о себе.',
    emoji: '🐾',
    accent: '#f2a93b',
    accentDeep: '#d98b1f',
    bot: 'sharikrubot',
  },
]

/** Прямая ссылка на Mini App игры. Открывает игру сразу, без чата с ботом. */
export function defaultLink(bot: string, startParam = 'gg'): string {
  return `https://t.me/${bot}?startapp=${encodeURIComponent(startParam)}`
}

/** Каталог со ссылками для клиента: применяет переопределения окружения, если они есть. */
export interface GameCard extends GameDef {
  link: string
}

export function buildCatalog(overrides: Record<string, { bot?: string; link?: string }> = {}): GameCard[] {
  return GAMES.map(g => {
    const o = overrides[g.id] ?? {}
    const bot = o.bot || g.bot
    return { ...g, bot, link: o.link || defaultLink(bot) }
  })
}
