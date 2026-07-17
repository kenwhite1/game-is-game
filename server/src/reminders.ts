import { db } from './db'
import { bot } from './bot'
import { pick } from './botlang'

// «Последний шанс» (§9.5): самый ROI-эффективный пуш. Около конца МСК-дня находим
// игроков, чья серия вот-вот сгорит (сегодня не играли, заморозок нет), и шлём
// напоминание. Планировщик - простой in-process таймер (одна инстанс-Railway).

function mskNow(): Date { return new Date(Date.now() + 3 * 3600 * 1000) }
function mskDay(): string { return mskNow().toISOString().slice(0, 10) }

/** Разослать «последний шанс» игрокам с серией под угрозой. Возвращает число пушей. */
export function lastChanceReminders(): number {
  const today = mskDay()
  const rows = db.prepare(
    'SELECT id, streak_current, lang FROM users WHERE streak_current > 0 AND streak_freezes = 0 AND (streak_last IS NULL OR streak_last <> ?) LIMIT 1000',
  ).all(today) as { id: number; streak_current: number; lang: string | null }[]
  if (!bot) return 0
  let sent = 0
  for (const u of rows) {
    const lang = u.lang === 'en' ? 'en' : 'ru'
    void bot.api.sendMessage(u.id, pick(lang,
      `🔥 Твоя серия ${u.streak_current} дн. вот-вот сгорит! Сыграй одну партию сегодня, чтобы её спасти.`,
      `🔥 Your ${u.streak_current}-day streak is about to break! Play one game today to save it.`)).catch(() => {})
    sent++
  }
  return sent
}

let lastFiredDay = ''
/** Таймер: около 23:50 МСК раз в день зовёт lastChanceReminders(). */
export function startReminderTimer(): void {
  if (!bot) return
  setInterval(() => {
    const now = mskNow()
    const day = now.toISOString().slice(0, 10)
    if (now.getUTCHours() === 23 && now.getUTCMinutes() >= 50 && lastFiredDay !== day) {
      lastFiredDay = day
      const n = lastChanceReminders()
      console.log(`last-chance reminders sent: ${n}`)
    }
  }, 5 * 60 * 1000).unref?.() // каждые 5 минут; unref - не держать процесс
}
