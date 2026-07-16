import { Bot, webhookCallback } from 'grammy'
import { BOT_TOKEN } from './auth'
import { ADMIN_IDS, APP_URL, BOT_USERNAME, gameOverrides } from './env'
import { buildCatalog, GAMES, CATEGORIES } from '../../shared/games'
import { REFERRER_REWARD, REFERRED_BONUS, REF_PREFIX, inviteLink } from '../../shared/referrals'
import { getOrCreateUser, userExists } from './profiles'
import { userLang, normLang, pick, type Lang } from './botlang'
import { followerIds } from './catalog'
import { recordPayment, paymentByCharge, markRefunded, packById } from './wallet'
import { unlockPremium, unlockPremiumPlus, boostTiers } from './season'
import { TIER_BOOST_TIERS } from '../../shared/wallet'
import { economyReportText } from './econ'

export const bot = BOT_TOKEN ? new Bot(BOT_TOKEN) : null

// Язык уведомлений для входящего апдейта: сохранённый выбор игрока, а для новых
// (ещё не заведённых) — их Telegram language_code.
function langOf(ctx: { from?: { id: number; language_code?: string } }): Lang {
  if (!ctx.from) return 'ru'
  return userExists(ctx.from.id) ? userLang(ctx.from.id) : normLang(ctx.from.language_code)
}

// Кнопка, открывающая меню лаунчера как Mini App.
export function appKeyboard(startParam?: string, lang: Lang = 'ru') {
  if (!APP_URL) return undefined
  const url = startParam ? `${APP_URL}?startapp=${encodeURIComponent(startParam)}` : APP_URL
  return { inline_keyboard: [[{ text: pick(lang, 'Открыть игры 🎮', 'Open games 🎮'), web_app: { url } }]] }
}

// Тексты вокруг бота (без длинных тире нигде, где их видит игрок).
const GAME_COUNT = GAMES.length
const CATEGORY_LINE = CATEGORIES.map(c => c.ru.toLowerCase()).join(', ')

const CATEGORY_LINE_EN = 'cards, board games, party, words, arcade, puzzles and strategy'

const DESCRIPTION = (lang: Lang) => pick(lang,
  'Game is Game это уютная комната со всеми нашими играми в одном месте.\n\n' +
  `Открываешь приложение и сразу видишь меню: ${GAME_COUNT} игр на любое настроение. ` +
  `Карты и настольные, игры для компании, слова, аркады, головоломки и стратегии. ` +
  'Нажимаешь на любую игру и она запускается сразу, без чатов и лишних шагов.\n\n' +
  'Можно играть одному против умных ботов или позвать друзей в общую комнату по коду. ' +
  'Все игры теперь живут под одной кнопкой.\n\n' +
  'Заходи, выбирай игру по настроению и приятно проведи вечер.',

  'Game is Game is a cozy room with all our games in one place.\n\n' +
  `Open the app and you see the menu right away: ${GAME_COUNT} games for any mood. ` +
  'Cards and board games, party games, words, arcade, puzzles and strategy. ' +
  'Tap any game and it launches instantly, no chats or extra steps.\n\n' +
  'Play solo against smart bots or invite friends to a shared room by code. ' +
  'All our games now live under one button.\n\n' +
  'Drop in, pick a game by mood, and enjoy your evening.')

const SHORT_DESCRIPTION = (lang: Lang) => pick(lang,
  `Все наши игры в одном месте: ${GAME_COUNT} игр, от карт и настольных до аркад и стратегий. Выбирай и играй 🎮`,
  `All our games in one place: ${GAME_COUNT} games, from cards and board games to arcade and strategy. Pick one and play 🎮`)

const HELP = (lang: Lang) => pick(lang,
  'Game is Game 🎮 это лаунчер со всеми нашими играми.\n\n' +
  'Команды:\n' +
  '/start  открыть меню игр\n' +
  '/play  открыть меню игр\n' +
  '/games  список игр\n' +
  `/invite  позвать друга (+${REFERRER_REWARD} Game тебе)\n` +
  '/about  об этом приложении\n' +
  '/paysupport  поддержка по оплатам\n' +
  '/help  это сообщение\n\n' +
  'Жми кнопку ниже, чтобы открыть меню 👇',

  'Game is Game 🎮 is a launcher with all our games.\n\n' +
  'Commands:\n' +
  '/start  open the games menu\n' +
  '/play  open the games menu\n' +
  '/games  list of games\n' +
  `/invite  invite a friend (+${REFERRER_REWARD} Game for you)\n` +
  '/about  about this app\n' +
  '/paysupport  payment support\n' +
  '/help  this message\n\n' +
  'Tap the button below to open the menu 👇')

const ABOUT = (lang: Lang) => pick(lang,
  'Game is Game 🎮\n\n' +
  `Одно приложение, в котором собраны все наши игры: ${GAME_COUNT} игр, ` +
  `среди них ${CATEGORY_LINE}. ` +
  'Выбираешь игру в меню и она открывается сразу, без лишних шагов.\n\n' +
  'Играй один против ботов или зови друзей по коду. Приятной игры! 💛',

  'Game is Game 🎮\n\n' +
  `One app with all our games gathered in it: ${GAME_COUNT} games, ` +
  `including ${CATEGORY_LINE_EN}. ` +
  'Pick a game from the menu and it opens right away, no extra steps.\n\n' +
  'Play solo against bots or invite friends by code. Have fun! 💛')

// Список игр со ссылками, открывающими каждую игру напрямую (по 2 в ряд,
// чтобы клавиатура из десятков игр не растягивалась на весь экран).
function gamesKeyboard() {
  const cards = buildCatalog(gameOverrides())
  const rows: { text: string; url: string }[][] = []
  for (let i = 0; i < cards.length; i += 2) {
    rows.push(cards.slice(i, i + 2).map(g => ({ text: `${g.emoji} ${g.name}`, url: g.link })))
  }
  return { inline_keyboard: rows }
}

if (bot) {
  void bot.api.setMyName('Game is Game').catch(() => {})
  // Русский — язык по умолчанию; английский Telegram отдаёт клиентам с en-локалью.
  void bot.api.setMyDescription(DESCRIPTION('ru')).catch(() => {})
  void bot.api.setMyDescription(DESCRIPTION('en'), { language_code: 'en' }).catch(() => {})
  void bot.api.setMyShortDescription(SHORT_DESCRIPTION('ru')).catch(() => {})
  void bot.api.setMyShortDescription(SHORT_DESCRIPTION('en'), { language_code: 'en' }).catch(() => {})
  void bot.api
    .setMyCommands([
      { command: 'start', description: 'Открыть меню игр' },
      { command: 'play', description: 'Открыть меню игр' },
      { command: 'games', description: 'Список игр' },
      { command: 'invite', description: `Позвать друга: +${REFERRER_REWARD} Game` },
      { command: 'about', description: 'Об этом приложении' },
      { command: 'help', description: 'Помощь' },
      { command: 'paysupport', description: 'Поддержка по оплатам' },
    ])
    .catch(() => {})
  void bot.api
    .setMyCommands([
      { command: 'start', description: 'Open the games menu' },
      { command: 'play', description: 'Open the games menu' },
      { command: 'games', description: 'List of games' },
      { command: 'invite', description: `Invite a friend: +${REFERRER_REWARD} Game` },
      { command: 'about', description: 'About this app' },
      { command: 'help', description: 'Help' },
      { command: 'paysupport', description: 'Payment support' },
    ], { language_code: 'en' })
    .catch(() => {})

  bot.command('start', async ctx => {
    const lang = langOf(ctx)
    const name = ctx.from?.first_name || pick(lang, 'друг', 'friend')
    // Полезная нагрузка /start (например ref_<КОД> из t.me/бот?start=...)
    // прокидывается в кнопку Mini App, чтобы приглашение засчиталось в /auth.
    const payload = typeof ctx.match === 'string' ? ctx.match.trim() : ''
    const invited = payload.startsWith(REF_PREFIX)
    await ctx.reply(
      pick(lang,
        (invited
          ? `Привет, ${name}! Тебя пригласили в Game is Game 🎁\n\n` +
            `Открой приложение по кнопке ниже, приглашение засчитается, и ты получишь +${REFERRED_BONUS} Game на старте.\n\n`
          : `Привет, ${name}! Это Game is Game 🎮\n\n`) +
          `Если совсем просто, это одно приложение со всеми нашими играми: ${GAME_COUNT} игр на любое настроение. ` +
          'Карты и настольные, игры для компании, слова, аркады, головоломки и стратегии.\n\n' +
          'Нажми на игру и она запустится сразу, без чатов и лишних шагов. Можно играть одному против ботов ' +
          'или позвать друзей в общую комнату по коду.\n\n' +
          'Жми кнопку ниже и выбирай игру по настроению. Хорошего вечера! 🎮',

        (invited
          ? `Hi ${name}! You've been invited to Game is Game 🎁\n\n` +
            `Open the app with the button below, your invite will count, and you'll get +${REFERRED_BONUS} Game to start.\n\n`
          : `Hi ${name}! This is Game is Game 🎮\n\n`) +
          `Put simply, it's one app with all our games: ${GAME_COUNT} games for any mood. ` +
          'Cards and board games, party games, words, arcade, puzzles and strategy.\n\n' +
          'Tap a game and it launches instantly, no chats or extra steps. Play solo against bots ' +
          'or invite friends to a shared room by code.\n\n' +
          'Tap the button below and pick a game by mood. Have a great evening! 🎮'),
      { reply_markup: appKeyboard(payload || undefined, lang) },
    )
  })

  bot.command('invite', async ctx => {
    if (!ctx.from) return
    const lang = langOf(ctx)
    const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ').slice(0, 40) || 'Игрок'
    const user = getOrCreateUser(ctx.from.id, name, ctx.from.username, ctx.from.language_code)
    const link = inviteLink(BOT_USERNAME, user.friend_code ?? '')
    const shareText = pick(lang,
      `Залетай в Game is Game, все наши игры в одном месте! Получишь +${REFERRED_BONUS} Game на старте 🎁`,
      `Come to Game is Game, all our games in one place! You'll get +${REFERRED_BONUS} Game to start 🎁`)
    const share = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`
    await ctx.reply(
      pick(lang,
        'Зови друзей, получай Game! 🎁\n\n' +
          `За каждого нового игрока, который зайдёт по твоей ссылке, ты получишь +${REFERRER_REWARD} Game, ` +
          `а друг +${REFERRED_BONUS} Game на старте. Вы сразу окажетесь друг у друга в друзьях.\n\n` +
          `Твоя ссылка:\n${link}`,
        'Invite friends, earn Game! 🎁\n\n' +
          `For every new player who joins via your link you get +${REFERRER_REWARD} Game, ` +
          `and your friend gets +${REFERRED_BONUS} Game to start. You become friends right away.\n\n` +
          `Your link:\n${link}`),
      { reply_markup: { inline_keyboard: [[{ text: pick(lang, 'Отправить другу 📨', 'Send to a friend 📨'), url: share }]] } },
    )
  })

  bot.command('play', async ctx => {
    const lang = langOf(ctx)
    await ctx.reply(pick(lang, 'Открываю меню игр 🎮 Выбирай, во что сыграть!', 'Opening the games menu 🎮 Pick what to play!'), { reply_markup: appKeyboard(undefined, lang) })
  })

  bot.command('games', async ctx => {
    const lang = langOf(ctx)
    await ctx.reply(
      pick(lang,
        `Наши игры 🎮 Всего ${GAME_COUNT}: ${CATEGORY_LINE}.\n\n` +
          'Нажми на игру, чтобы открыть её сразу, или жми кнопку меню внизу: там весь каталог ' +
          'с поиском, категориями и избранным.',
        `Our games 🎮 ${GAME_COUNT} in total: ${CATEGORY_LINE_EN}.\n\n` +
          'Tap a game to open it right away, or use the menu button below: it has the full catalog ' +
          'with search, categories and favorites.'),
      { reply_markup: gamesKeyboard() },
    )
  })

  bot.command('about', async ctx => {
    const lang = langOf(ctx)
    await ctx.reply(ABOUT(lang), { reply_markup: appKeyboard(undefined, lang) })
  })

  // Новость по игре всем её подписчикам: /announce <gameId> <текст>.
  // Дашборд экономики оператору (§16.3). Только для админов.
  bot.command('econ', async ctx => {
    if (!ctx.from || !ADMIN_IDS.has(ctx.from.id)) return
    await ctx.reply(economyReportText())
  })

  // Только для админов (ADMIN_IDS); это движок «подписался — узнал первым».
  bot.command('announce', async ctx => {
    if (!ctx.from || !ADMIN_IDS.has(ctx.from.id)) return
    const m = (typeof ctx.match === 'string' ? ctx.match : '').trim()
    const space = m.indexOf(' ')
    const gameId = space === -1 ? m : m.slice(0, space)
    const text = space === -1 ? '' : m.slice(space + 1).trim()
    const game = GAMES.find(g => g.id === gameId)
    if (!game || !text) {
      await ctx.reply('Так: /announce <id игры> <текст>. Id смотри в shared/games.ts (например viselitsa).')
      return
    }
    const ids = followerIds(game.id)
    if (ids.length === 0) {
      await ctx.reply(`У «${game.name}» пока нет подписчиков.`)
      return
    }
    const card = buildCatalog(gameOverrides()).find(g => g.id === game.id)
    const markup = { inline_keyboard: [[{ text: `${game.emoji} Открыть ${game.name}`, url: card?.link ?? '' }]] }
    let sent = 0
    for (const uid of ids) {
      try {
        await ctx.api.sendMessage(uid, `${game.emoji} ${game.name}: новости\n\n${text}`, { reply_markup: markup })
        sent++
      } catch { /* игрок не запускал бота или заблокировал его */ }
      // Мягкий темп, чтобы не упереться в лимиты Bot API (~30 сообщений/с).
      await new Promise(r => setTimeout(r, 50))
    }
    await ctx.reply(`Разослано подписчикам «${game.name}»: ${sent} из ${ids.length}.`)
  })

  bot.command('help', async ctx => {
    const lang = langOf(ctx)
    await ctx.reply(HELP(lang), { reply_markup: appKeyboard(undefined, lang) })
  })

  // ─── Оплаты Stars: пакеты Game ─────────────────────────────────────────

  // Telegram требует ответить на pre_checkout за 10 секунд, иначе платёж падает.
  bot.on('pre_checkout_query', async ctx => {
    const payload = ctx.preCheckoutQuery.invoice_payload
    let ok = false
    try {
      const p = JSON.parse(payload)
      ok = p.kind === 'pass' || p.kind === 'pass_plus' || p.kind === 'tier_boost' ? true : !!packById(p.packId)
    } catch { /* чужой или битый payload — отклоняем */ }
    await ctx.answerPreCheckoutQuery(ok, ok ? undefined : 'Этот товар больше недоступен. Попробуй ещё раз из приложения.')
  })

  bot.on('message:successful_payment', async ctx => {
    if (!ctx.from) return
    const lang = langOf(ctx)
    const sp = ctx.message.successful_payment
    const receipt = pick(lang, 'Квитанция', 'Receipt')
    let parsed: { kind?: string; packId?: string } = {}
    try { parsed = JSON.parse(sp.invoice_payload) } catch { /* неизвестный payload */ }

    // Премиум-пропуск: разблокируем премиум-трек текущего сезона.
    if (parsed.kind === 'pass') {
      const unlocked = unlockPremium(ctx.from.id)
      await ctx.reply(
        pick(lang,
          (unlocked ? 'Премиум-пропуск активирован ✨ ' : 'Премиум-пропуск уже активен. ') +
            `Награды премиум-трека теперь твои.`,
          (unlocked ? 'Premium pass activated ✨ ' : 'Premium pass is already active. ') +
            `The premium-track rewards are now yours.`) +
          `\n\n${receipt}: ${sp.telegram_payment_charge_id}`,
        { reply_markup: appKeyboard(undefined, lang) },
      )
      return
    }
    // «Пропуск+»: премиум + сразу +10 тиров.
    if (parsed.kind === 'pass_plus') {
      unlockPremiumPlus(ctx.from.id)
      await ctx.reply(
        pick(lang,
          `Пропуск+ активирован ✨ Премиум-трек и сразу +10 тиров твои!`,
          `Pass+ activated ✨ The premium track and +10 tiers are yours right away!`) +
          `\n\n${receipt}: ${sp.telegram_payment_charge_id}`,
        { reply_markup: appKeyboard(undefined, lang) },
      )
      return
    }
    // «Буст тиров»: мгновенно продвигаем по пропуску.
    if (parsed.kind === 'tier_boost') {
      boostTiers(ctx.from.id)
      await ctx.reply(
        pick(lang,
          `Буст засчитан 🚀 +${TIER_BOOST_TIERS} тиров по пропуску сезона!`,
          `Boost applied 🚀 +${TIER_BOOST_TIERS} tiers on the season pass!`) +
          `\n\n${receipt}: ${sp.telegram_payment_charge_id}`,
        { reply_markup: appKeyboard(undefined, lang) },
      )
      return
    }

    const pack = packById(parsed.packId ?? '')
    if (!pack) return
    // Монеты получает тот, кто заплатил; charge_id делает зачисление идемпотентным.
    const res = recordPayment(ctx.from.id, pack, sp.telegram_payment_charge_id)
    if (res.credited) {
      await ctx.reply(
        pick(lang,
          `Готово! ${pack.emoji} «${pack.title}» куплен: +${res.coins.toLocaleString('ru')} Game на балансе 🎉` +
            (res.doubled ? '\n\n🎁 Удвоитель первой покупки: ×2 монет!' : '') +
            `\n\n${receipt}: ${sp.telegram_payment_charge_id}\n` +
            'Если что-то не так с оплатой, команда /paysupport всегда рядом.',
          `Done! ${pack.emoji} "${pack.title}" purchased: +${res.coins.toLocaleString('en-US')} Game added to your balance 🎉` +
            (res.doubled ? '\n\n🎁 First-purchase doubler: ×2 coins!' : '') +
            `\n\n${receipt}: ${sp.telegram_payment_charge_id}\n` +
            'If anything is off with the payment, /paysupport is always here.'),
        { reply_markup: appKeyboard(undefined, lang) },
      )
    }
  })

  // Обязательная точка поддержки по платежам (требование Telegram).
  bot.command('paysupport', async ctx => {
    if (!ctx.from) return
    const lang = langOf(ctx)
    await ctx.reply(
      pick(lang,
        'Поддержка по оплатам 💬\n\n' +
          'Опиши проблему прямо здесь одним сообщением: что покупал(а), когда и что пошло не так. ' +
          'Приложи номер квитанции из чека (он приходит сообщением после оплаты).\n\n' +
          'Ошибочные списания возвращаем в Stars. Покупки за Game (косметика) внутри приложения не возвращаются, ' +
          'но если монеты не пришли, мы всё починим и начислим.',
        'Payment support 💬\n\n' +
          'Describe the problem right here in one message: what you bought, when, and what went wrong. ' +
          'Include the receipt number from the receipt (it arrives as a message after payment).\n\n' +
          'Erroneous charges are refunded in Stars. In-app purchases for Game (cosmetics) are non-refundable, ' +
          "but if the coins didn't arrive, we'll fix it and credit them."),
    )
    const who = `${[ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ')} (@${ctx.from.username ?? 'нет'}, id ${ctx.from.id})`
    for (const admin of ADMIN_IDS) {
      void ctx.api.sendMessage(admin, `⚠️ /paysupport: ${who} просит помощи с оплатой.`).catch(() => {})
    }
  })

  // Возврат платежа админом: /refund <charge_id>.
  bot.command('refund', async ctx => {
    if (!ctx.from || !ADMIN_IDS.has(ctx.from.id)) return
    const chargeId = (typeof ctx.match === 'string' ? ctx.match : '').trim()
    const p = chargeId ? paymentByCharge(chargeId) : undefined
    if (!p) {
      await ctx.reply('Так: /refund <charge_id из квитанции>. Платёж не найден.')
      return
    }
    if (p.status !== 'paid') {
      await ctx.reply('Этот платёж уже возвращён.')
      return
    }
    try {
      await ctx.api.refundStarPayment(p.user_id, chargeId)
    } catch (e) {
      await ctx.reply(`Telegram отклонил возврат: ${(e as Error).message}`)
      return
    }
    markRefunded(chargeId)
    await ctx.reply(`Возврат сделан: ${p.stars} Stars игроку ${p.user_id}, ${p.coins} Game списаны с баланса.`)
    const pl = userLang(p.user_id)
    void ctx.api.sendMessage(p.user_id, pick(pl,
      `Возврат по покупке оформлен: ${p.stars} Stars вернутся на твой счёт Telegram. ${p.coins} Game списаны.`,
      `Your purchase has been refunded: ${p.stars} Stars will return to your Telegram balance. ${p.coins} Game were deducted.`)).catch(() => {})
  })
}

export const botWebhook = bot ? webhookCallback(bot, 'hono') : null
