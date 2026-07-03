import { Hono } from 'hono'
import { z } from 'zod'
import { validateInitData, issueToken, verifyToken, signLaunch, verifyLaunch, DEV_MODE } from './auth'
import { handleResult } from './sdk'
import { encodeLaunchParam } from '../../shared/sdk'
import { achievementsView } from './achievements'
import { doPrestige } from './xp'
import { repairStreak } from './streak'
import { BOT_USERNAME, PRESENCE_KEY, ADMIN_IDS, gameOverrides, type Env } from './env'
import { economyReport } from './econ'
import { anomalyReport } from './anomaly'
import { startCoop, claimCoop, coopOf } from './coop'
import { touchPresence, clearPresence } from './presence'
import { getOrCreateUser, getProfile, recordOpen, recentGames, profileDetail, setUsername, userExists } from './profiles'
import { addFriendByCode, removeFriend, friendsOf, activityFeed, leaderboard, socialSnapshot, giftCoins, giftCosmetic, acceptChallenge } from './social'
import { questsOf, weeklyQuestsOf, claimQuest, rerollQuest, rerollsLeft } from './quests'
import { seasonView, claimTier } from './season'
import { festivalView, claimEventQuest, claimCommunity, buyEventItem } from './festival'
import { rankedOf, boards } from './ranked'
import { marketView, listItem, buyListing, cancelListing } from './market'
import { clanView, clanBoard, createClan, joinClan, leaveClan, claimClanWeekly } from './clans'
import { collectionsOf, claimCollection } from './collections'
import { PASS_PREMIUM_STARS } from '../../shared/wallet'
import { packById } from '../../shared/wallet'
import { packsBought } from './wallet'
import { bot } from './bot'
import { applyReferral } from './referrals'
import { REF_PREFIX } from '../../shared/referrals'
import { wardrobeOf, equip, buy, recolor } from './cosmetics'
import { gameMeta, favoritesOf, toggleFavorite, ratingsOf, rate, followsOf, toggleFollow } from './catalog'
import { buildCatalog, GAMES } from '../../shared/games'

export const api = new Hono<Env>()

const VALID_IDS = new Set(GAMES.map(g => g.id))
const SLOTS = ['color', 'face', 'frame', 'hat', 'eyewear', 'effect', 'companion', 'banner', 'title'] as const
const catalog = () => buildCatalog(gameOverrides())

/** Вставить закодированный токен запуска в startapp ссылки на игру (§2.3). */
function withLaunchParam(link: string, encoded: string): string {
  return /[?&]startapp=/.test(link)
    ? link.replace(/([?&]startapp=)[^&]*/, `$1${encoded}`)
    : `${link}${link.includes('?') ? '&' : '?'}startapp=${encoded}`
}

/** Каталог для авторизованного игрока: в каждую плитку вшит его токен запуска,
 *  чтобы игра получила его из startapp и могла честно рапортовать матч (§2.6). */
async function catalogFor(uid: number) {
  const base = catalog()
  return Promise.all(base.map(async g => ({ ...g, link: withLaunchParam(g.link, encodeLaunchParam(await signLaunch(uid, g.id))) })))
}

api.get('/health', c => c.json({ ok: true }))

// Public catalog, so the menu still renders if a guest opens the URL directly.
// meta = global opens/likes per game, so charts work for guests too.
api.get('/catalog', c => c.json({ catalog: catalog(), meta: gameMeta() }))

api.post('/auth', async c => {
  const body = await c.req.json<{ initData: string }>().catch(() => null)
  if (!body) return c.json({ error: 'bad_request' }, 400)
  const v = validateInitData(body.initData ?? '')
  if (!v) return c.json({ error: 'invalid_init_data' }, 401)
  const name = [v.user.first_name, v.user.last_name].filter(Boolean).join(' ').slice(0, 40) || 'Игрок'
  // Приглашение засчитываем только НОВЫМ игрокам: start_param подписан
  // Telegram (не подделать), а «только при первом входе» закрывает повторный
  // фарм наград с одного аккаунта.
  const isNew = !userExists(v.user.id)
  getOrCreateUser(v.user.id, name, v.user.username)
  const referral = isNew && v.startParam?.startsWith(REF_PREFIX)
    ? applyReferral(v.user.id, v.startParam.slice(REF_PREFIX.length))
    : null
  const token = await issueToken(v.user.id)
  return c.json({
    token,
    profile: getProfile(v.user.id),
    startParam: v.startParam,
    botUsername: BOT_USERNAME,
    catalog: await catalogFor(v.user.id),
    recent: recentGames(v.user.id),
    favorites: favoritesOf(v.user.id),
    ratings: ratingsOf(v.user.id),
    follows: followsOf(v.user.id),
    meta: gameMeta(),
    boughtPacks: packsBought(v.user.id),
    quests: questsOf(v.user.id),
    referral,
  })
})

// Пинг присутствия от серверов игр (не от игроков): X-Presence-Key вместо JWT.
// Игра шлёт start/ping раз в минуту на активную сессию и end при выходе.
const pingSchema = z.object({
  userId: z.number().int().positive(),
  gameId: z.string().min(1).max(32),
  event: z.enum(['start', 'ping', 'end']).default('ping'),
})
api.post('/presence/ping', async c => {
  const key = PRESENCE_KEY ?? (DEV_MODE ? 'dev' : null)
  if (!key || c.req.header('x-presence-key') !== key) return c.json({ error: 'forbidden' }, 403)
  const parsed = pingSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
  if (parsed.data.event === 'end') clearPresence(parsed.data.userId)
  else touchPresence(parsed.data.userId, parsed.data.gameId)
  return c.json({ ok: true })
})

// Results SDK (§2): игра рапортует исход матча. Аутентификация — токеном
// запуска (подписан хабом), а не пользовательским JWT, поэтому маршрут стоит
// ДО auth-гейта. Хаб сам считает награду; игра не может начислить валюту.
api.post('/sdk/result', async c => {
  const launch = c.req.header('x-gg-launch')
  const claims = launch ? await verifyLaunch(launch) : null
  if (!claims) return c.json({ ok: false, rewarded: false, coins: 0, error: 'bad_launch' }, 401)
  const out = handleResult(launch, await c.req.json().catch(() => null), claims)
  return c.json(out.body, out.status as 200 | 400 | 401)
})

// auth gate for everything below
api.use('/*', async (c, next) => {
  const p = c.req.path
  if (p.endsWith('/auth') || p.endsWith('/health') || p.endsWith('/catalog') || p.endsWith('/presence/ping') || p.endsWith('/sdk/result')) return next()
  const token = c.req.header('authorization')?.replace(/^Bearer /, '')
  const uid = token ? await verifyToken(token) : null
  if (!uid) return c.json({ error: 'unauthorized' }, 401)
  c.set('uid', uid)
  return next()
})

api.get('/profile', c => c.json({ profile: getProfile(c.get('uid')), recent: recentGames(c.get('uid')) }))

// Достижения игрока: полный список с прогрессом, GG Score и редкостью (§6–7).
api.get('/achievements', c => c.json(achievementsView(c.get('uid'))))

// Престиж (§5.4): при уровне ≥100 сбросить уровень к 1 и поднять звезду.
api.post('/profile/prestige', c => {
  const uid = c.get('uid')
  const r = doPrestige(uid)
  if (!r.ok) return c.json({ error: r.reason }, 400)
  return c.json({ profile: getProfile(uid) })
})

// Ремонт серии (§9.3): бесплатно за 3 игры в окне или за 100🪙.
const repairSchema = z.object({ method: z.enum(['pay', 'play']) })
api.post('/streak/repair', async c => {
  const parsed = repairSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
  const uid = c.get('uid')
  const r = repairStreak(uid, parsed.data.method)
  if (!r.ok) return c.json({ error: r.reason }, r.reason === 'too_poor' ? 402 : 400)
  return c.json({ profile: getProfile(uid) })
})

// Full profile screen: profile + per-game stats + badges.
api.get('/profile/detail', c => {
  const detail = profileDetail(c.get('uid'))
  if (!detail) return c.json({ error: 'not_found' }, 404)
  return c.json(detail)
})

// Edit display name. Appearance (avatar/frame/banner/title) goes through
// /cosmetics/equip so ownership is always enforced.
// Выбор ника (только для игроков без @username из Telegram). Ник уникален;
// сервер возвращает username_taken / bad_username / username_locked.
const usernameSchema = z.object({ username: z.string().min(1).max(40) })
api.post('/profile/username', async c => {
  const parsed = usernameSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
  const res = setUsername(c.get('uid'), parsed.data.username)
  if ('error' in res) return c.json({ error: res.error }, res.error === 'not_found' ? 404 : 400)
  return c.json(res)
})

// ─── Cosmetics: wardrobe + equip ─────────────────────────────────────────
api.get('/cosmetics', c => {
  const wardrobe = wardrobeOf(c.get('uid'))
  if (!wardrobe) return c.json({ error: 'not_found' }, 404)
  return c.json(wardrobe)
})

const equipSchema = z.object({ slot: z.enum(SLOTS), itemId: z.string().min(1).max(48) })
api.post('/cosmetics/equip', async c => {
  const parsed = equipSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
  const uid = c.get('uid')
  const r = equip(uid, parsed.data.slot, parsed.data.itemId)
  if (!r.ok) return c.json({ error: r.reason }, r.reason === 'locked' ? 403 : 400)
  return c.json({ profile: getProfile(uid), wardrobe: wardrobeOf(uid) })
})

// Buy a shop item with Game coins. Equipping stays a separate step.
const buySchema = z.object({ itemId: z.string().min(1).max(48) })
api.post('/cosmetics/buy', async c => {
  const parsed = buySchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
  const uid = c.get('uid')
  const r = buy(uid, parsed.data.itemId)
  if (!r.ok) return c.json({ error: r.reason }, r.reason === 'too_poor' ? 402 : 400)
  return c.json({ profile: getProfile(uid), wardrobe: wardrobeOf(uid) })
})

// Перекраска надетого предмета (§10.6): поворот оттенка за 🪙 (hue=0 — сброс).
const recolorSchema = z.object({ itemId: z.string().min(1).max(64), hue: z.number().int().min(0).max(360) })
api.post('/cosmetics/recolor', async c => {
  const parsed = recolorSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
  const uid = c.get('uid')
  const r = recolor(uid, parsed.data.itemId, parsed.data.hue)
  if (!r.ok) return c.json({ error: r.reason }, r.reason === 'too_poor' ? 402 : 400)
  return c.json({ profile: getProfile(uid), wardrobe: wardrobeOf(uid) })
})

// Record that the player launched a game from the menu.
const openSchema = z.object({ gameId: z.string().min(1).max(32) })
api.post('/open', async c => {
  const parsed = openSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success || !VALID_IDS.has(parsed.data.gameId)) return c.json({ error: 'bad_request' }, 400)
  const uid = c.get('uid')
  const profile = recordOpen(uid, parsed.data.gameId)
  // Запуск из хаба = игрок сейчас в игре (пока сама игра не начнёт пинговать).
  touchPresence(uid, parsed.data.gameId)
  // Токен запуска для Results SDK: игра вернёт его в /sdk/result (§2.3).
  const launchToken = await signLaunch(uid, parsed.data.gameId)
  return c.json({ profile, recent: recentGames(uid), launchToken })
})

// ─── Catalog: favorites + ratings ────────────────────────────────────────

const favSchema = z.object({ gameId: z.string().min(1).max(32) })
api.post('/favorites/toggle', async c => {
  const parsed = favSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success || !VALID_IDS.has(parsed.data.gameId)) return c.json({ error: 'bad_request' }, 400)
  return c.json(toggleFavorite(c.get('uid'), parsed.data.gameId))
})

api.post('/follow/toggle', async c => {
  const parsed = favSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success || !VALID_IDS.has(parsed.data.gameId)) return c.json({ error: 'bad_request' }, 400)
  return c.json({ ...toggleFollow(c.get('uid'), parsed.data.gameId), meta: gameMeta() })
})

const rateSchema = z.object({ gameId: z.string().min(1).max(32), value: z.union([z.literal(1), z.literal(-1), z.literal(0)]) })
api.post('/rate', async c => {
  const parsed = rateSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success || !VALID_IDS.has(parsed.data.gameId)) return c.json({ error: 'bad_request' }, 400)
  const ratings = rate(c.get('uid'), parsed.data.gameId, parsed.data.value)
  return c.json({ ratings, meta: gameMeta() })
})

// ─── Quests: задания дня ─────────────────────────────────────────────────

// ─── Wallet: счёт Stars за пакет Game ────────────────────────────────────

const invoiceSchema = z.object({ packId: z.string().min(1).max(32) })
api.post('/wallet/invoice', async c => {
  const parsed = invoiceSchema.safeParse(await c.req.json().catch(() => null))
  const pack = parsed.success ? packById(parsed.data.packId) : undefined
  if (!pack) return c.json({ error: 'bad_request' }, 400)
  if (!bot) return c.json({ error: 'unavailable' }, 503)
  try {
    // Stars: валюта XTR, provider_token пустой, сумма прямо в звёздах.
    const link = await bot.api.createInvoiceLink(
      pack.title,
      `${pack.coins.toLocaleString('ru')} Game на баланс Game is Game`,
      JSON.stringify({ packId: pack.id, uid: c.get('uid') }),
      '',
      'XTR',
      [{ label: pack.title, amount: pack.stars }],
    )
    return c.json({ link })
  } catch (e) {
    console.error('createInvoiceLink failed', e)
    return c.json({ error: 'invoice_failed' }, 502)
  }
})

api.get('/quests', c => {
  const uid = c.get('uid')
  return c.json({ quests: questsOf(uid), weekly: weeklyQuestsOf(uid), rerollsLeft: rerollsLeft(uid) })
})

const claimSchema = z.object({ questId: z.string().min(1).max(48) })
api.post('/quests/claim', async c => {
  const parsed = claimSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
  const uid = c.get('uid')
  const r = claimQuest(uid, parsed.data.questId)
  if (!r.ok) return c.json({ error: r.reason }, r.reason === 'claimed' ? 409 : 400)
  return c.json({ reward: r.reward, profile: getProfile(uid), quests: questsOf(uid), weekly: weeklyQuestsOf(uid) })
})

api.post('/quests/reroll', async c => {
  const parsed = claimSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
  const uid = c.get('uid')
  const r = rerollQuest(uid, parsed.data.questId)
  if (!r.ok) return c.json({ error: r.reason }, r.reason === 'too_poor' ? 402 : 400)
  return c.json({ quests: r.quests, free: r.free, profile: getProfile(uid), rerollsLeft: rerollsLeft(uid) })
})

// ─── Season Pass (§11) ───────────────────────────────────────────────────
api.get('/season', c => c.json({ season: seasonView(c.get('uid')) }))

const seasonClaimSchema = z.object({ tier: z.number().int().min(1).max(50), track: z.enum(['free', 'premium']) })
api.post('/season/claim', async c => {
  const parsed = seasonClaimSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
  const uid = c.get('uid')
  const r = claimTier(uid, parsed.data.tier, parsed.data.track)
  if (!r.ok) return c.json({ error: r.reason }, r.reason === 'claimed' ? 409 : 400)
  return c.json({ reward: r.reward, season: seasonView(uid), profile: getProfile(uid) })
})

// ─── Cross-game Events (§12) ─────────────────────────────────────────────
api.get('/festival', c => c.json({ festival: festivalView(c.get('uid')) }))

const eventQuestSchema = z.object({ questId: z.string().min(1).max(48) })
api.post('/festival/quest/claim', async c => {
  const parsed = eventQuestSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
  const uid = c.get('uid')
  const r = claimEventQuest(uid, parsed.data.questId)
  if (!r.ok) return c.json({ error: r.reason }, r.reason === 'claimed' ? 409 : 400)
  return c.json({ tokens: r.tokens, festival: festivalView(uid) })
})

api.post('/festival/community/claim', c => {
  const uid = c.get('uid')
  const r = claimCommunity(uid)
  if (!r.ok) return c.json({ error: r.reason }, r.reason === 'claimed' ? 409 : 400)
  return c.json({ festival: festivalView(uid), wardrobeStale: true })
})

const eventBuySchema = z.object({ itemId: z.string().min(1).max(48) })
api.post('/festival/shop/buy', async c => {
  const parsed = eventBuySchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
  const uid = c.get('uid')
  const r = buyEventItem(uid, parsed.data.itemId)
  if (!r.ok) return c.json({ error: r.reason }, r.reason === 'too_poor' ? 402 : 400)
  return c.json({ festival: festivalView(uid) })
})

// Счёт Stars на премиум-пропуск. Разблокировку делает вебхук после оплаты.
api.post('/season/premium', async c => {
  if (!bot) return c.json({ error: 'unavailable' }, 503)
  try {
    const link = await bot.api.createInvoiceLink(
      'Премиум-пропуск',
      'Премиум-трек текущего сезона Game is Game',
      JSON.stringify({ kind: 'pass', uid: c.get('uid') }),
      '',
      'XTR',
      [{ label: 'Премиум-пропуск', amount: PASS_PREMIUM_STARS }],
    )
    return c.json({ link })
  } catch (e) {
    console.error('pass invoice failed', e)
    return c.json({ error: 'invoice_failed' }, 502)
  }
})

// ─── Gifts: подарить Game другу ──────────────────────────────────────────

const giftSchema = z.object({ friendId: z.number().int().positive(), amount: z.number().int() })
api.post('/gift', async c => {
  const parsed = giftSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
  const uid = c.get('uid')
  const r = giftCoins(uid, parsed.data.friendId, parsed.data.amount)
  if (!r.ok) return c.json({ error: r.reason }, r.reason === 'too_poor' ? 402 : 400)
  // Дружеский пинг в личку получателю; молча пропускаем, если бот не запущен.
  const sender = getProfile(uid)
  if (bot && sender) {
    void bot.api
      .sendMessage(parsed.data.friendId, `🎁 ${sender.name} подарил(а) тебе ${r.amount} Game! Загляни в приложение.`)
      .catch(() => {})
  }
  return c.json({ amount: r.amount, profile: sender, friends: friendsOf(uid) })
})

// Подарить косметику другу (§14.2): только торгуемые вещи, перевод владения.
const giftItemSchema = z.object({ friendId: z.number().int().positive(), itemId: z.string().min(1).max(64) })
api.post('/gift-cosmetic', async c => {
  const parsed = giftItemSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
  const uid = c.get('uid')
  const r = giftCosmetic(uid, parsed.data.friendId, parsed.data.itemId)
  if (!r.ok) return c.json({ error: r.reason }, 400)
  const sender = getProfile(uid)
  if (bot && sender) {
    void bot.api.sendMessage(parsed.data.friendId, `🎁 ${sender.name} подарил(а) тебе предмет! Загляни в гардероб.`).catch(() => {})
  }
  return c.json({ ok: true, itemId: r.itemId })
})

// Кооп-квесты с другом (§8.3): начать общий недельный таргет и забрать награду.
const coopStartSchema = z.object({ friendId: z.number().int().positive() })
api.post('/coop/start', async c => {
  const parsed = coopStartSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
  const uid = c.get('uid')
  const r = startCoop(uid, parsed.data.friendId)
  if (!r.ok) return c.json({ error: r.reason }, 400)
  return c.json({ coop: coopOf(uid) })
})
const coopClaimSchema = z.object({ id: z.number().int().positive() })
api.post('/coop/claim', async c => {
  const parsed = coopClaimSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
  const uid = c.get('uid')
  const r = claimCoop(uid, parsed.data.id)
  if (!r.ok) return c.json({ error: r.reason }, 400)
  return c.json({ profile: getProfile(uid), coop: coopOf(uid) })
})

// ─── Social: friends, activity, leaderboard ──────────────────────────────

// One round trip for the Friends + Activity tabs.
// ─── Ranked & Leaderboards (§13) ─────────────────────────────────────────
api.get('/ranked', c => c.json({ ranked: rankedOf(c.get('uid')) }))
api.get('/boards', c => c.json({ boards: boards(c.get('uid')) }))

// Здоровье экономики (§16.3) + аномалии (§16.2) — только операторам или в DEV.
api.get('/admin/economy', c => {
  const uid = c.get('uid')
  if (!DEV_MODE && !ADMIN_IDS.has(uid)) return c.json({ error: 'forbidden' }, 403)
  return c.json({ ...economyReport(), anomalies: anomalyReport() })
})

// ─── Marketplace (§14) ───────────────────────────────────────────────────
// ─── Collections & set bonuses (§10.5) ───────────────────────────────────
api.get('/collections', c => c.json({ collections: collectionsOf(c.get('uid')) }))
const collectionSchema = z.object({ name: z.string().min(1).max(48) })
api.post('/collections/claim', async c => {
  const parsed = collectionSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
  const uid = c.get('uid')
  const r = claimCollection(uid, parsed.data.name)
  if (!r.ok) return c.json({ error: r.reason }, r.reason === 'claimed' ? 409 : 400)
  return c.json({ bonus: r.bonus, collections: collectionsOf(uid), profile: getProfile(uid) })
})

api.get('/market', c => c.json({ market: marketView(c.get('uid')) }))

const listSchema = z.object({ itemId: z.string().min(1).max(48), price: z.number().int().min(1).max(100000) })
api.post('/market/list', async c => {
  const parsed = listSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
  const uid = c.get('uid')
  const r = listItem(uid, parsed.data.itemId, parsed.data.price)
  if (!r.ok) return c.json({ error: r.reason }, 400)
  return c.json({ market: marketView(uid) })
})

const listingSchema = z.object({ listingId: z.number().int().positive() })
api.post('/market/buy', async c => {
  const parsed = listingSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
  const uid = c.get('uid')
  const r = buyListing(uid, parsed.data.listingId)
  if (!r.ok) return c.json({ error: r.reason }, r.reason === 'too_poor' ? 402 : 400)
  return c.json({ market: marketView(uid), profile: getProfile(uid) })
})

api.post('/market/cancel', async c => {
  const parsed = listingSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
  const uid = c.get('uid')
  const r = cancelListing(uid, parsed.data.listingId)
  if (!r.ok) return c.json({ error: r.reason }, 400)
  return c.json({ market: marketView(uid) })
})

// ─── Clans (§15.3) ───────────────────────────────────────────────────────
api.get('/clan', c => { const uid = c.get('uid'); return c.json({ clan: clanView(uid), board: clanBoard(uid) }) })

const clanCreateSchema = z.object({ name: z.string().min(1).max(24), tag: z.string().min(1).max(5) })
api.post('/clan/create', async c => {
  const parsed = clanCreateSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
  const uid = c.get('uid')
  const r = createClan(uid, parsed.data.name, parsed.data.tag)
  if (!r.ok) return c.json({ error: r.reason }, 400)
  return c.json({ clan: r.view, board: clanBoard(uid), profile: getProfile(uid) })
})

const clanJoinSchema = z.object({ clanId: z.number().int().positive() })
api.post('/clan/join', async c => {
  const parsed = clanJoinSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
  const uid = c.get('uid')
  const r = joinClan(uid, parsed.data.clanId)
  if (!r.ok) return c.json({ error: r.reason }, 400)
  return c.json({ clan: r.view, board: clanBoard(uid) })
})

api.post('/clan/leave', c => {
  const uid = c.get('uid')
  leaveClan(uid)
  return c.json({ clan: clanView(uid), board: clanBoard(uid) })
})

api.post('/clan/weekly/claim', c => {
  const uid = c.get('uid')
  const r = claimClanWeekly(uid)
  if (!r.ok) return c.json({ error: r.reason }, r.reason === 'claimed' ? 409 : 400)
  return c.json({ clan: clanView(uid), profile: getProfile(uid) })
})

api.get('/social', c => c.json(socialSnapshot(c.get('uid'))))

// Принять вызов друга (deep-link chl_<gameId>_<fromId>): награда обоим.
const challengeSchema = z.object({ fromId: z.number().int().positive(), gameId: z.string().min(1).max(32) })
api.post('/challenge/accept', async c => {
  const parsed = challengeSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
  const uid = c.get('uid')
  const r = acceptChallenge(uid, parsed.data.fromId, parsed.data.gameId)
  if (!r.ok) return c.json({ error: r.reason }, 400)
  return c.json({ reward: r.reward, profile: getProfile(uid) })
})

api.get('/friends', c => c.json({ friends: friendsOf(c.get('uid')) }))

const addSchema = z.object({ code: z.string().trim().min(3).max(12) })
api.post('/friends/add', async c => {
  const parsed = addSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
  const r = addFriendByCode(c.get('uid'), parsed.data.code)
  if (!r.ok) return c.json({ error: r.reason }, r.reason === 'not_found' ? 404 : 409)
  return c.json({ friend: r.friend, friends: friendsOf(c.get('uid')) })
})

const removeSchema = z.object({ friendId: z.number().int().positive() })
api.post('/friends/remove', async c => {
  const parsed = removeSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
  removeFriend(c.get('uid'), parsed.data.friendId)
  return c.json({ friends: friendsOf(c.get('uid')) })
})

api.get('/activity', c => c.json({ activity: activityFeed(c.get('uid')) }))

api.get('/leaderboard', c => c.json({ leaderboard: leaderboard(c.get('uid')) }))
