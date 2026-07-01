import { GAMES } from '../../shared/games'

export type Env = { Variables: { uid: number } }

export const APP_URL = (process.env.APP_URL ?? '').replace(/\/$/, '')
export const BOT_USERNAME = process.env.BOT_USERNAME ?? 'game_is_game_bot'

// Per-game link overrides. Set <ID>_BOT to change a bot @username, or
// <ID>_LINK to point a tile at a fully custom URL. Empty values are ignored
// so the defaults from shared/games.ts win.
const IDS = GAMES.map(g => g.id)

export function gameOverrides(): Record<string, { bot?: string; link?: string }> {
  const out: Record<string, { bot?: string; link?: string }> = {}
  for (const id of IDS) {
    const bot = process.env[`${id.toUpperCase()}_BOT`]?.trim()
    const link = process.env[`${id.toUpperCase()}_LINK`]?.trim()
    if (bot || link) out[id] = { bot: bot || undefined, link: link || undefined }
  }
  return out
}
