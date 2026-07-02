import { GAMES } from '../../shared/games'

export type Env = { Variables: { uid: number } }

export const APP_URL = (process.env.APP_URL ?? '').replace(/\/$/, '')
export const BOT_USERNAME = process.env.BOT_USERNAME ?? 'game_is_game_bot'

// Per-game link overrides. Set <ID>_BOT to change a bot @username, or
// <ID>_LINK to point a tile at a fully custom URL. Empty values are ignored
// so the defaults from shared/games.ts win.
const IDS = GAMES.map(g => g.id)

/** Общий секрет для серверов игр: POST /api/presence/ping c X-Presence-Key.
 *  Не задан — эндпоинт выключен (кроме DEV MODE, там ключ "dev"). */
export const PRESENCE_KEY = process.env.PRESENCE_KEY?.trim() || null

/** Telegram id админов (ADMIN_IDS=123,456): им доступна команда /announce. */
export const ADMIN_IDS = new Set(
  (process.env.ADMIN_IDS ?? '')
    .split(',')
    .map(s => Number.parseInt(s.trim(), 10))
    .filter(n => Number.isFinite(n) && n > 0),
)

export function gameOverrides(): Record<string, { bot?: string; link?: string }> {
  const out: Record<string, { bot?: string; link?: string }> = {}
  for (const id of IDS) {
    const bot = process.env[`${id.toUpperCase()}_BOT`]?.trim()
    const link = process.env[`${id.toUpperCase()}_LINK`]?.trim()
    if (bot || link) out[id] = { bot: bot || undefined, link: link || undefined }
  }
  return out
}
