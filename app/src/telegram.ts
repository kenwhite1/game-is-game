// Тонкая типизированная обёртка над мостом Telegram WebApp; вне Telegram все методы это no-op.
interface TgWebApp {
  initData: string
  initDataUnsafe: { user?: { id: number; first_name: string; language_code?: string }; start_param?: string }
  colorScheme: 'light' | 'dark'
  ready(): void
  expand(): void
  isVersionAtLeast(v: string): boolean
  disableVerticalSwipes?(): void
  enableClosingConfirmation(): void
  setHeaderColor(c: string): void
  setBackgroundColor(c: string): void
  openTelegramLink?(url: string): void
  openInvoice?(url: string, callback?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void): void
  HapticFeedback?: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
    notificationOccurred(type: 'error' | 'success' | 'warning'): void
    selectionChanged(): void
  }
  BackButton: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void }
}

declare global {
  interface Window { Telegram?: { WebApp: TgWebApp } }
}

export const tg: TgWebApp | null = window.Telegram?.WebApp ?? null
export const inTelegram = !!tg && tg.initData.length > 0

const CREAM = '#f3e2bc'

export function initTelegram() {
  if (!tg) return
  try {
    tg.ready()
    tg.expand()
    tg.setHeaderColor(CREAM)
    tg.setBackgroundColor(CREAM)
    if (tg.isVersionAtLeast('7.7')) tg.disableVerticalSwipes?.()
  } catch { /* older clients */ }
}

// Цвет шапки/фона Telegram под текущий экран (плавная интеграция чрома).
export function setChrome(color: string): void {
  if (!tg) return
  try { tg.setHeaderColor(color); tg.setBackgroundColor(color) } catch { /* older clients */ }
}

export function haptic(kind: 'tap' | 'select' | 'success' | 'warn' | 'heavy' = 'tap') {
  const h = tg?.HapticFeedback
  if (!h) return
  try {
    if (kind === 'tap') h.impactOccurred('light')
    else if (kind === 'heavy') h.impactOccurred('rigid')
    else if (kind === 'select') h.selectionChanged()
    else if (kind === 'success') h.notificationOccurred('success')
    else h.notificationOccurred('warning')
  } catch { /* ignore */ }
}

export function getInitData(): string {
  return tg?.initData ?? ''
}

export function getStartParam(): string | null {
  return tg?.initDataUnsafe?.start_param ?? null
}

// Открыть Mini App игры. Внутри Telegram запускает игру сразу, без чата.
export function openGame(link: string): void {
  try {
    if (tg?.openTelegramLink) tg.openTelegramLink(link)
    else window.open(link, '_blank')
  } catch {
    window.open(link, '_blank')
  }
}

// Открыть счёт Stars. Статус придёт в колбэк ('paid' = успех); вне Telegram
// счёт открыть нельзя - вернём false, чтобы экран показал подсказку.
export function openInvoice(url: string, cb: (status: string) => void): boolean {
  if (!tg?.openInvoice) return false
  try {
    tg.openInvoice(url, cb)
    return true
  } catch {
    return false
  }
}

// Скопировать текст в буфер. true - успех (для тоста).
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// Поделиться приглашением через нативный диалог Telegram «Поделиться».
export function shareInvite(url: string, text: string): void {
  const share = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
  try {
    if (tg?.openTelegramLink) tg.openTelegramLink(share)
    else window.open(share, '_blank')
  } catch {
    window.open(share, '_blank')
  }
}
