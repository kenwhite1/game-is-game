import { createHmac, timingSafeEqual } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret-change-me')
export const BOT_TOKEN = process.env.BOT_TOKEN ?? ''
export const DEV_MODE = !BOT_TOKEN

export interface TgUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
}

// HMAC validation per https://core.telegram.org/bots/webapps
export function validateInitData(raw: string): { user: TgUser; startParam: string | null } | null {
  if (DEV_MODE) {
    // Stable dev identity so the launcher works locally with no bot token.
    return { user: { id: 1, first_name: 'Dev' }, startParam: null }
  }
  const params = new URLSearchParams(raw)
  const hash = params.get('hash')
  if (!hash) return null
  params.delete('hash')
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')
  const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest()
  const computed = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
  // constant-time compare (lengths match → both 64 hex chars; guard anyway)
  const a = Buffer.from(computed, 'hex')
  const b = Buffer.from(hash, 'hex')
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  const authDate = Number(params.get('auth_date') ?? 0)
  if (Date.now() / 1000 - authDate > 3600) return null
  const userJson = params.get('user')
  if (!userJson) return null
  try {
    return { user: JSON.parse(userJson) as TgUser, startParam: params.get('start_param') }
  } catch {
    return null // signed but malformed user payload → treat as invalid, never 500
  }
}

export async function issueToken(userId: number): Promise<string> {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secret)
}

export async function verifyToken(token: string): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return typeof payload.uid === 'number' ? payload.uid : null
  } catch {
    return null
  }
}

// ─── Launch token (Results SDK, §2.3) ─────────────────────────────────────
// Хаб подписывает короткоживущий токен при запуске игры и передаёт его игре
// через startapp. Игра возвращает его в /api/sdk/result - так результат
// привязан к реальному запуску этим игроком именно этой игры. Подделать нельзя
// (подпись секретом хаба), поэтому играм не нужен отдельный общий ключ.
export async function signLaunch(userId: number, gameId: string, lang: 'ru' | 'en' = 'ru'): Promise<string> {
  // `lng` едет в токене, чтобы игра открылась на языке хаба (§i18n): startapp несёт
  // только один параметр, поэтому язык кладём в claims запуска, а не в query.
  return new SignJWT({ uid: userId, gid: gameId, scope: 'launch', lng: lang })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('2h')
    .sign(secret)
}

export async function verifyLaunch(token: string): Promise<{ uid: number; gid: string; lng: 'ru' | 'en' } | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    if (payload.scope !== 'launch' || typeof payload.uid !== 'number' || typeof payload.gid !== 'string') return null
    const lng = payload.lng === 'en' ? 'en' : 'ru'
    return { uid: payload.uid, gid: payload.gid, lng }
  } catch {
    return null
  }
}
