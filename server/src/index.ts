import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import './db'
import { seedDev } from './devseed'
import { api } from './api'
import { bot, botWebhook } from './bot'
import { startReminderTimer } from './reminders'
import { DEV_MODE } from './auth'
import { APP_URL } from './env'

seedDev()

const app = new Hono()
app.route('/api', api)

const WEBHOOK_PATH = `/bot/${process.env.WEBHOOK_SECRET ?? 'hook'}`
const hook = botWebhook
if (hook) app.post(WEBHOOK_PATH, c => hook(c))

// static SPA (app/dist), path must be relative to process cwd for serveStatic
const here = dirname(fileURLToPath(import.meta.url))
const dist = join(here, '..', '..', 'app', 'dist')
if (existsSync(dist)) {
  const rel = relative(process.cwd(), dist)
  app.use('/*', serveStatic({ root: rel }))
  app.get('*', serveStatic({ path: join(rel, 'index.html') }))
}

const port = Number(process.env.PORT ?? 3000)
// Bind 0.0.0.0 explicitly so a platform edge proxy (Railway, Fly, etc.) can reach us.
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, async info => {
  console.log(`game-is-game launcher listening on 0.0.0.0:${info.port}${DEV_MODE ? ' (DEV MODE, no bot token)' : ''}`)
  startReminderTimer() // §9.5 «последний шанс» — пуш под конец МСК-дня
  if (!APP_URL) {
    console.warn('⚠ APP_URL is not set: webhook + Mini App button cannot be configured. Set it to your public https URL.')
  }
  if (bot && APP_URL) {
    const hookUrl = `${APP_URL}${WEBHOOK_PATH}`
    try {
      await bot.api.setWebhook(hookUrl)
      console.log(`webhook set: ${hookUrl}`)
    } catch (e) {
      console.error('setWebhook failed', e)
    }
    // Persistent menu button (next to the message input) opens the launcher.
    try {
      await bot.api.setChatMenuButton({
        menu_button: { type: 'web_app', text: 'Игры', web_app: { url: APP_URL } },
      })
    } catch (e) {
      console.error('setChatMenuButton failed', e)
    }
  }
})
