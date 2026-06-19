import { Hono } from 'hono'
import { z } from 'zod'
import { validateInitData, issueToken, verifyToken } from './auth'
import { BOT_USERNAME, gameOverrides, type Env } from './env'
import { getOrCreateUser, getProfile, recordOpen, recentGames, profileDetail, updateProfile } from './profiles'
import { addFriendByCode, removeFriend, friendsOf, activityFeed, leaderboard, socialSnapshot } from './social'
import { wardrobeOf, equip, buy } from './cosmetics'
import { buildCatalog, GAMES } from '../../shared/games'

export const api = new Hono<Env>()

const VALID_IDS = new Set(GAMES.map(g => g.id))
const SLOTS = ['color', 'face', 'frame', 'hat', 'eyewear', 'effect', 'companion', 'banner', 'title'] as const
const catalog = () => buildCatalog(gameOverrides())

api.get('/health', c => c.json({ ok: true }))

// Public catalog, so the menu still renders if a guest opens the URL directly.
api.get('/catalog', c => c.json({ catalog: catalog() }))

api.post('/auth', async c => {
  const body = await c.req.json<{ initData: string }>().catch(() => null)
  if (!body) return c.json({ error: 'bad_request' }, 400)
  const v = validateInitData(body.initData ?? '')
  if (!v) return c.json({ error: 'invalid_init_data' }, 401)
  const name = [v.user.first_name, v.user.last_name].filter(Boolean).join(' ').slice(0, 40) || 'Игрок'
  getOrCreateUser(v.user.id, name, v.user.username)
  const token = await issueToken(v.user.id)
  return c.json({
    token,
    profile: getProfile(v.user.id),
    startParam: v.startParam,
    botUsername: BOT_USERNAME,
    catalog: catalog(),
    recent: recentGames(v.user.id),
  })
})

// auth gate for everything below
api.use('/*', async (c, next) => {
  const p = c.req.path
  if (p.endsWith('/auth') || p.endsWith('/health') || p.endsWith('/catalog')) return next()
  const token = c.req.header('authorization')?.replace(/^Bearer /, '')
  const uid = token ? await verifyToken(token) : null
  if (!uid) return c.json({ error: 'unauthorized' }, 401)
  c.set('uid', uid)
  return next()
})

api.get('/profile', c => c.json({ profile: getProfile(c.get('uid')), recent: recentGames(c.get('uid')) }))

// Full profile screen: profile + per-game stats + badges.
api.get('/profile/detail', c => {
  const detail = profileDetail(c.get('uid'))
  if (!detail) return c.json({ error: 'not_found' }, 404)
  return c.json(detail)
})

// Edit display name. Appearance (avatar/frame/banner/title) goes through
// /cosmetics/equip so ownership is always enforced.
const profileSchema = z.object({ name: z.string().trim().min(1).max(40) })
api.post('/profile/update', async c => {
  const parsed = profileSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
  const profile = updateProfile(c.get('uid'), parsed.data)
  if (!profile) return c.json({ error: 'not_found' }, 404)
  return c.json({ profile })
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

// Record that the player launched a game from the menu.
const openSchema = z.object({ gameId: z.string().min(1).max(32) })
api.post('/open', async c => {
  const parsed = openSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success || !VALID_IDS.has(parsed.data.gameId)) return c.json({ error: 'bad_request' }, 400)
  const uid = c.get('uid')
  const profile = recordOpen(uid, parsed.data.gameId)
  return c.json({ profile, recent: recentGames(uid) })
})

// ─── Social: friends, activity, leaderboard ──────────────────────────────

// One round trip for the Friends + Activity tabs.
api.get('/social', c => c.json(socialSnapshot(c.get('uid'))))

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
