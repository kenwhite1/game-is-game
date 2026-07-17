// Язык уведомлений бота на стороне сервера. Игрок выбирает язык в приложении,
// выбор хранится в users.lang; бот берёт его отсюда для всех пушей и ответов.
// Русский - язык по умолчанию, английский - второй.
import { db } from './db'

export type Lang = 'ru' | 'en'

/** Нормализовать любой код (напр. Telegram language_code) в 'ru' | 'en'. */
export function normLang(code: string | null | undefined): Lang {
  return code && code.toLowerCase().startsWith('ru') ? 'ru' : code ? 'en' : 'ru'
}

/** Сохранённый язык игрока (или 'ru', если не задан). */
export function userLang(id: number): Lang {
  const r = db.prepare('SELECT lang FROM users WHERE id=?').get(id) as { lang?: string } | undefined
  return r?.lang === 'en' ? 'en' : 'ru'
}

/** Записать выбор языка игрока. */
export function setUserLang(id: number, lang: Lang): void {
  db.prepare('UPDATE users SET lang=? WHERE id=?').run(lang, id)
}

/** Выбрать вариант по языку. */
export function pick(lang: Lang, ru: string, en: string): string {
  return lang === 'en' ? en : ru
}
