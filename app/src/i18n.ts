// Лёгкая двуязычная система (RU/EN) для хаба.
// Ключ словаря - это РУССКАЯ исходная строка. t('…') возвращает русский как есть,
// а в английском режиме - перевод из EN (или сам ключ, если перевода нет).
// Это делает обёртывание строк механическим и безопасным: ничего не ломается,
// даже если какой-то перевод отсутствует.
import { useSyncExternalStore } from 'react'
import { EN } from './strings'

export type Lang = 'ru' | 'en'

const KEY = 'gg_lang'
let currentLang: Lang = 'ru'
const listeners = new Set<() => void>()

/** Определить язык: сохранённый выбор → язык Telegram → русский по умолчанию. */
export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'ru' || saved === 'en') return saved
  } catch { /* private mode */ }
  const code = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code
  if (code) return code.toLowerCase().startsWith('ru') ? 'ru' : 'en'
  return 'ru'
}

export function initLang(): void {
  currentLang = detectLang()
}

export function getLang(): Lang {
  return currentLang
}

export function setLang(l: Lang): void {
  if (l === currentLang) return
  currentLang = l
  try { localStorage.setItem(KEY, l) } catch { /* ignore */ }
  listeners.forEach(fn => fn())
}

export function toggleLang(): Lang {
  const next: Lang = currentLang === 'ru' ? 'en' : 'ru'
  setLang(next)
  return next
}

/** Подписка для React: любой компонент, вызвавший useLang(), перерисуется при смене языка. */
export function useLang(): Lang {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => { listeners.delete(cb) } },
    () => currentLang,
    () => currentLang,
  )
}

/** Перевести строку. Ключ - русская исходная строка. */
export function t(ru: string): string {
  if (currentLang === 'ru') return ru
  return EN[ru] ?? ru
}

/** Локаль для форматирования чисел под текущий язык. */
export function numLocale(): string {
  return currentLang === 'ru' ? 'ru' : 'en-US'
}

/** Название сезона: «Сезон 3» → «Season 3» в EN (номер динамический, поэтому не через словарь). */
export function tSeason(name: string): string {
  if (currentLang === 'ru') return name
  return name.replace('Сезон', 'Season')
}

/** Подпись условия разблокировки: часть значений динамическая (номер/ранг), поэтому по шаблону. */
export function tUnlock(label: string): string {
  if (currentLang === 'ru' || !label) return label
  let m: RegExpExecArray | null
  if ((m = /^Уровень (\d+)$/.exec(label))) return `Level ${m[1]}`
  if ((m = /^Серия (\d+) дней$/.exec(label))) return `${m[1]}-day streak`
  if ((m = /^Ранг: (.+)$/.exec(label))) return `Rank: ${m[1]}`
  if ((m = /^Престиж (\d+)$/.exec(label))) return `Prestige ${m[1]}`
  if ((m = /^Значок «(.+)»$/.exec(label))) return `Badge “${t(m[1])}”`
  if (/ Game$/.test(label)) return label // «500 Game» - уже нейтрально
  return t(label) // статичные: «Скоро», «За достижение», «Сезонный пропуск», «Событие»
}
