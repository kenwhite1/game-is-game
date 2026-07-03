import { Bot, webhookCallback } from 'grammy'
import { BOT_TOKEN } from './auth'
import { ADMIN_IDS, APP_URL, BOT_USERNAME, gameOverrides } from './env'
import { buildCatalog, GAMES, CATEGORIES } from '../../shared/games'
import { REFERRER_REWARD, REFERRED_BONUS, REF_PREFIX, inviteLink } from '../../shared/referrals'
import { getOrCreateUser } from './profiles'
import { followerIds } from './catalog'
import { recordPayment, paymentByCharge, markRefunded, packById } from './wallet'
import { unlockPremium, unlockPremiumPlus } from './season'
import { economyReportText } from './econ'

export const bot = BOT_TOKEN ? new Bot(BOT_TOKEN) : null

const OPEN = 'Открыть игры 🎮'

// Кнопка, открывающая меню лаунчера как Mini App.
export function appKeyboard(startParam?: string) {
  if (!APP_URL) return undefined
  const url = startParam ? `${APP_URL}?startapp=${encodeURIComponent(startParam)}` : APP_URL
  return { inline_keyboard: [[{ text: OPEN, web_app: { url } }]] }
}

// Тексты вокруг бота (без длинных тире нигде, где их видит игрок).
const GAME_COUNT = GAMES.length
const CATEGORY_LINE = CATEGORIES.map(c => c.ru.toLowerCase()).join(', ')

const DESCRIPTION =
  'Game is Game это уютная комната со всеми нашими играми в одном месте.\n\n' +
  `Открываешь приложение и сразу видишь меню: ${GAME_COUNT} игр на любое настроение. ` +
  `Карты и настольные, игры для компании, слова, аркады, головоломки и стратегии. ` +
  'Нажимаешь на любую игру и она запускается сразу, без чатов и лишних шагов.\n\n' +
  'Можно играть одному против умных ботов или позвать друзей в общую комнату по коду. ' +
  'Все игры теперь живут под одной кнопкой.\n\n' +
  'Заходи, выбирай игру по настроению и приятно проведи вечер.'

const SHORT_DESCRIPTION =
  `Все наши игры в одном месте: ${GAME_COUNT} игр, от карт и настольных до аркад и стратегий. Выбирай и играй 🎮`

const HELP =
  'Game is Game 🎮 это лаунчер со всеми нашими играми.\n\n' +
  'Команды:\n' +
  '/start  открыть меню игр\n' +
  '/play  открыть меню игр\n' +
  '/games  список игр\n' +
  `/invite  позвать друга (+${REFERRER_REWARD} Game тебе)\n` +
  '/about  об этом приложении\n' +
  '/paysupport  поддержка по оплатам\n' +
  '/help  это сообщение\n\n' +
  'Жми кнопку ниже, чтобы открыть меню 👇'

const ABOUT =
  'Game is Game 🎮\n\n' +
  `Одно приложение, в котором собраны все наши игры: ${GAME_COUNT} игр, ` +
  `среди них ${CATEGORY_LINE}. ` +
  'Выбираешь игру в меню и она открывается сразу, без лишних шагов.\n\n' +
  'Играй один против ботов или зови друзей по коду. Приятной игры! 💛'

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
      { command: 'paysupport', description: 'Поддержка по оплатам' },
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
        `Если совсем просто, это одно приложение со всеми нашими играми: ${GAME_COUNT} игр на любое настроение. ` +
        'Карты и настольные, игры для компании, слова, аркады, головоломки и стратегии.\n\n' +
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
      `Наши игры 🎮 Всего ${GAME_COUNT}: ${CATEGORY_LINE}.\n\n` +
        'Нажми на игру, чтобы открыть её сразу, или жми кнопку меню внизу: там весь каталог ' +
        'с поиском, категориями и избранным.',
      { reply_markup: gamesKeyboard() },
    )
  })

  bot.command('about', async ctx => {
    await ctx.reply(ABOUT, { reply_markup: appKeyboard() })
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
    await ctx.reply(HELP, { reply_markup: appKeyboard() })
  })

  // ─── Оплаты Stars: пакеты Game ─────────────────────────────────────────

  // Telegram требует ответить на pre_checkout за 10 секунд, иначе платёж падает.
  bot.on('pre_checkout_query', async ctx => {
    const payload = ctx.preCheckoutQuery.invoice_payload
    let ok = false
    try {
      const p = JSON.parse(payload)
      ok = p.kind === 'pass' || p.kind === 'pass_plus' ? true : !!packById(p.packId)
    } catch { /* чужой или битый payload — отклоняем */ }
    await ctx.answerPreCheckoutQuery(ok, ok ? undefined : 'Этот товар больше недоступен. Попробуй ещё раз из приложения.')
  })

  bot.on('message:successful_payment', async ctx => {
    if (!ctx.from) return
    const sp = ctx.message.successful_payment
    let parsed: { kind?: string; packId?: string } = {}
    try { parsed = JSON.parse(sp.invoice_payload) } catch { /* неизвестный payload */ }

    // Премиум-пропуск: разблокируем премиум-трек текущего сезона.
    if (parsed.kind === 'pass') {
      const unlocked = unlockPremium(ctx.from.id)
      await ctx.reply(
        (unlocked ? 'Премиум-пропуск активирован ✨ ' : 'Премиум-пропуск уже активен. ') +
          `Награды премиум-трека теперь твои.\n\nКвитанция: ${sp.telegram_payment_charge_id}`,
        { reply_markup: appKeyboard() },
      )
      return
    }
    // «Пропуск+»: премиум + сразу +10 тиров.
    if (parsed.kind === 'pass_plus') {
      unlockPremiumPlus(ctx.from.id)
      await ctx.reply(
        `Пропуск+ активирован ✨ Премиум-трек и сразу +10 тиров твои!\n\nКвитанция: ${sp.telegram_payment_charge_id}`,
        { reply_markup: appKeyboard() },
      )
      return
    }

    const pack = packById(parsed.packId ?? '')
    if (!pack) return
    // Монеты получает тот, кто заплатил; charge_id делает зачисление идемпотентным.
    const res = recordPayment(ctx.from.id, pack, sp.telegram_payment_charge_id)
    if (res.credited) {
      const bonus = res.doubled ? '\n\n🎁 Удвоитель первой покупки: ×2 монет!' : ''
      await ctx.reply(
        `Готово! ${pack.emoji} «${pack.title}» куплен: +${res.coins.toLocaleString('ru')} Game на балансе 🎉${bonus}\n\n` +
          `Квитанция: ${sp.telegram_payment_charge_id}\n` +
          'Если что-то не так с оплатой, команда /paysupport всегда рядом.',
        { reply_markup: appKeyboard() },
      )
    }
  })

  // Обязательная точка поддержки по платежам (требование Telegram).
  bot.command('paysupport', async ctx => {
    if (!ctx.from) return
    await ctx.reply(
      'Поддержка по оплатам 💬\n\n' +
        'Опиши проблему прямо здесь одним сообщением: что покупал(а), когда и что пошло не так. ' +
        'Приложи номер квитанции из чека (он приходит сообщением после оплаты).\n\n' +
        'Ошибочные списания возвращаем в Stars. Покупки за Game (косметика) внутри приложения не возвращаются, ' +
        'но если монеты не пришли, мы всё починим и начислим.',
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
    void ctx.api.sendMessage(p.user_id, `Возврат по покупке оформлен: ${p.stars} Stars вернутся на твой счёт Telegram. ${p.coins} Game списаны.`).catch(() => {})
  })
}

export const botWebhook = bot ? webhookCallback(bot, 'hono') : null
