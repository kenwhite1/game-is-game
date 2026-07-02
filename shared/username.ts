// Правила ника: как в Telegram — латиница/цифры/подчёркивание, начинается с
// буквы. Даём чуть мягче по минимальной длине (3), чтобы игрок без @username в
// Telegram мог выбрать короткий ник. Единый источник правды для клиента и
// сервера (клиент — мгновенная подсказка, сервер — авторитетная проверка).

export const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{2,31}$/

/** Убирает ведущие @ и пробелы по краям. Регистр сохраняем как ввёл игрок. */
export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, '')
}

export function validUsername(raw: string): boolean {
  return USERNAME_RE.test(normalizeUsername(raw))
}
