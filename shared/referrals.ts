// Реферальная программа хаба: единые константы для клиента и сервера,
// чтобы подписи «+250 Game» на экране всегда совпадали с начислением.
// Файл без браузерных и Node-зависимостей: импортируется отовсюду.

/** Сколько Game получает пригласивший за каждого нового игрока по ссылке. */
export const REFERRER_REWARD = 250
/** Приветственный бонус новому игроку, пришедшему по ссылке друга. */
export const REFERRED_BONUS = 150

/** Префикс диплинка приглашения: ?startapp=ref_<КОД_ДРУГА>. */
export const REF_PREFIX = 'ref_'

/** Ссылка-приглашение конкретного игрока. */
export function inviteLink(botUsername: string, friendCode: string): string {
  return `https://t.me/${botUsername}?startapp=${REF_PREFIX}${friendCode}`
}
