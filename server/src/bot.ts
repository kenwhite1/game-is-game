import { Bot, webhookCallback } from 'grammy'
import { BOT_TOKEN } from './auth'
import { APP_URL, BOT_USERNAME, gameOverrides } from './env'
import { buildCatalog } from '../../shared/games'
import { REFERRER_REWARD, REFERRED_BONUS, REF_PREFIX, inviteLink } from '../../shared/referrals'
import { getOrCreateUser } from './profiles'

export const bot = BOT_TOKEN ? new Bot(BOT_TOKEN) : null

const OPEN = 'Открыть игры 🎮'

// Кнопка, открывающая меню лаунчера как Mini App.
export function appKeyboard(startParam?: string) {
  if (!APP_URL) return undefined
  const url = startParam ? `${APP_URL}?startapp=${encodeURIComponent(startParam)}` : APP_URL
  return { inline_keyboard: [[{ text: OPEN, web_app: { url } }]] }
}

// Тексты вокруг бота (без длинных тире нигде, где их видит игрок).
const DESCRIPTION =
  'Game is Game это уютная комната со всеми нашими играми в одном месте.\n\n' +
  'Открываешь приложение и сразу видишь меню: Однушечка про карты, Крокоша про слова, ' +
  'Секрет ночи про тайные роли и Шарик про питомца. Нажимаешь на любую игру и она запускается сразу, ' +
  'без чатов и лишних шагов.\n\n' +
  'Можно играть одному против умных ботов или позвать друзей в общую комнату по коду. ' +
  'Все игры теперь живут под одной кнопкой.\n\n' +
  'Заходи, выбирай игру по настроению и приятно проведи вечер.'

const SHORT_DESCRIPTION =
  'Все наши игры в одном месте: Однушечка, Крокоша, Секрет ночи и Шарик. Выбирай и играй 🎮'

const HELP =
  'Game is Game 🎮 это лаунчер со всеми нашими играми.\n\n' +
  'Команды:\n' +
  '/start  открыть меню игр\n' +
  '/play  открыть меню игр\n' +
  '/games  список игр\n' +
  `/invite  позвать друга (+${REFERRER_REWARD} Game тебе)\n` +
  '/about  об этом приложении\n' +
  '/help  это сообщение\n\n' +
  'Жми кнопку ниже, чтобы открыть меню 👇'

const ABOUT =
  'Game is Game 🎮\n\n' +
  'Одно приложение, в котором собраны все наши игры: Однушечка, Крокоша, Секрет ночи и Шарик. ' +
  'Выбираешь игру в меню и она открывается сразу, без лишних шагов.\n\n' +
  'Играй один против ботов или зови друзей по коду. Приятной игры! 💛'

// Список игр со ссылками, открывающими каждую игру напрямую.
function gamesKeyboard() {
  const cards = buildCatalog(gameOverrides())
  return { inline_keyboard: cards.map(g => [{ text: `${g.emoji} ${g.name}`, url: g.link }]) }
}

if (bot) {
  void bot.api.setMyName('Game is Game').catch(() => {})
  void bot.api.setMyDescription(DESCRIPTION).catch(() => {})
  void bot.api.setMyShortDescription(SHORT_DESCRIPTION).catch(() => {})
  void bot.api
    .setMyCommands([
      { command: 'start', description: 'Открыть меню игр' },
      { command: 'play', description: 'Открыть меню игр' },
      { command: 'games', description: 'Список игр' },
      { command: 'invite', description: `Позвать друга: +${REFERRER_REWARD} Game` },
      { command: 'about', description: 'Об этом приложении' },
      { command: 'help', description: 'Помощь' },
    ])
    .catch(() => {})

  bot.command('start', async ctx => {
    const name = ctx.from?.first_name || 'друг'
    // Полезная нагрузка /start (например ref_<КОД> из t.me/бот?start=...)
    // прокидывается в кнопку Mini App, чтобы приглашение засчиталось в /auth.
    const payload = typeof ctx.match === 'string' ? ctx.match.trim() : ''
    const invited = payload.startsWith(REF_PREFIX)
    await ctx.reply(
      (invited
        ? `Привет, ${name}! Тебя пригласили в Game is Game 🎁\n\n` +
          `Открой приложение по кнопке ниже — приглашение засчитается, и ты получишь +${REFERRED_BONUS} Game на старте.\n\n`
        : `Привет, ${name}! Это Game is Game 🎮\n\n`) +
        'Если совсем просто, это одно приложение со всеми нашими играми. Открываешь меню и выбираешь, ' +
        'во что сыграть: Однушечка про карты, Крокоша про слова, Секрет ночи про тайные роли и Шарик про питомца.\n\n' +
        'Нажми на игру и она запустится сразу, без чатов и лишних шагов. Можно играть одному против ботов ' +
        'или позвать друзей в общую комнату по коду.\n\n' +
        'Жми кнопку ниже и выбирай игру по настроению. Хорошего вечера! 🎮',
      { reply_markup: appKeyboard(payload || undefined) },
    )
  })

  bot.command('invite', async ctx => {
    if (!ctx.from) return
    const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ').slice(0, 40) || 'Игрок'
    const user = getOrCreateUser(ctx.from.id, name, ctx.from.username)
    const link = inviteLink(BOT_USERNAME, user.friend_code ?? '')
    const shareText = `Залетай в Game is Game — все наши игры в одном месте! Получишь +${REFERRED_BONUS} Game на старте 🎁`
    const share = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`
    await ctx.reply(
      'Зови друзей — получай Game! 🎁\n\n' +
        `За каждого нового игрока, который зайдёт по твоей ссылке, ты получишь +${REFERRER_REWARD} Game, ` +
        `а друг +${REFERRED_BONUS} Game на старте. Вы сразу окажетесь друг у друга в друзьях.\n\n` +
        `Твоя ссылка:\n${link}`,
      { reply_markup: { inline_keyboard: [[{ text: 'Отправить другу 📨', url: share }]] } },
    )
  })

  bot.command('play', async ctx => {
    await ctx.reply('Открываю меню игр 🎮 Выбирай, во что сыграть!', { reply_markup: appKeyboard() })
  })

  bot.command('games', async ctx => {
    await ctx.reply(
      'Наши игры 🎮\n\n' +
        '🎴 Однушечка · карты по цвету и числу\n' +
        '🐊 Крокоша · показывай и угадывай слова\n' +
        '🌙 Секрет ночи · тайные роли, блеф и интуиция\n' +
        '🐾 Шарик · питомец, о котором заботишься\n\n' +
        'Нажми на игру, чтобы открыть её, или жми кнопку меню внизу.',
      { reply_markup: gamesKeyboard() },
    )
  })

  bot.command('about', async ctx => {
    await ctx.reply(ABOUT, { reply_markup: appKeyboard() })
  })

  bot.command('help', async ctx => {
    await ctx.reply(HELP, { reply_markup: appKeyboard() })
  })
}

export const botWebhook = bot ? webhookCallback(bot, 'hono') : null
