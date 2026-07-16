import { getInitData } from './telegram'
import type {
  AuthResponse, GameCard, GameMeta, Profile, ProfileDetail,
  Friend, ActivityItem, LeaderRow, Wardrobe, Slot, RatingValue, Quest,
} from '@shared/types'
import type { AchievementsPayload } from '@shared/achievements'
import type { CoopView } from '@shared/coop'
import type { SeasonView, Reward } from '@shared/season'
import type { FestivalView } from '@shared/festival'
import type { RankedView, Boards } from '@shared/ranked'
import type { MarketView } from '@shared/market'
import type { ClanView, ClanBoardRow } from '@shared/clans'
import type { CollectionView } from '@shared/cosmetics'

let token: string | null = sessionStorage.getItem('gg_jwt')

async function req<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(json.error ?? 'request_failed'), { status: res.status, data: json })
  return json as T
}

export interface SocialSnapshot {
  friends: Friend[]
  activity: ActivityItem[]
  leaderboard: LeaderRow[]
  /** Сколько новых игроков пришло по моей реферальной ссылке. */
  invited: number
  coop: CoopView[]
  friendStreaks: FriendStreak[]
}

export interface FriendStreak {
  friendId: number
  friendName: string
  current: number
  best: number
  bothToday: boolean
  canNudge: boolean
}

export const api = {
  async auth(): Promise<AuthResponse> {
    const r = await req<AuthResponse>('/auth', { initData: getInitData() })
    token = r.token
    sessionStorage.setItem('gg_jwt', r.token)
    return r
  },
  catalog: () => req<{ catalog: GameCard[]; meta: Record<string, GameMeta> }>('/catalog'),
  open: (gameId: string) => req<{ profile: Profile; recent: string[]; launchToken?: string }>('/open', { gameId }),
  toggleFavorite: (gameId: string) => req<{ favorite: boolean; favorites: string[] }>('/favorites/toggle', { gameId }),
  rate: (gameId: string, value: RatingValue | 0) =>
    req<{ ratings: Record<string, RatingValue>; meta: Record<string, GameMeta> }>('/rate', { gameId, value }),
  toggleFollow: (gameId: string) =>
    req<{ following: boolean; follows: string[]; meta: Record<string, GameMeta> }>('/follow/toggle', { gameId }),
  quests: () => req<{ quests: Quest[]; weekly: Quest[]; rerollsLeft: number }>('/quests'),
  claimQuest: (questId: string) => req<{ reward: number; profile: Profile; quests: Quest[]; weekly: Quest[] }>('/quests/claim', { questId }),
  rerollQuest: (questId: string) => req<{ quests: Quest[]; free: boolean; profile: Profile; rerollsLeft: number }>('/quests/reroll', { questId }),
  gift: (friendId: number, amount: number) => req<{ amount: number; profile: Profile; friends: Friend[] }>('/gift', { friendId, amount }),
  giftCosmetic: (friendId: number, itemId: string) => req<{ ok: boolean; itemId: string }>('/gift-cosmetic', { friendId, itemId }),
  nudgeFriend: (friendId: number) => req<{ ok: boolean }>('/friend-streak/nudge', { friendId }),
  coopStart: (friendId: number) => req<{ coop: CoopView[] }>('/coop/start', { friendId }),
  coopClaim: (id: number) => req<{ profile: Profile; coop: CoopView[] }>('/coop/claim', { id }),

  profileDetail: () => req<ProfileDetail>('/profile/detail'),
  prestige: () => req<{ profile: Profile }>('/profile/prestige'),
  repairStreak: (method: 'pay' | 'play') => req<{ profile: Profile }>('/streak/repair', { method }),
  achievements: () => req<AchievementsPayload>('/achievements'),
  setUsername: (username: string) => req<{ profile: Profile }>('/profile/username', { username }),
  setLang: (lang: 'ru' | 'en') => req<{ ok: boolean; lang: 'ru' | 'en' }>('/profile/lang', { lang }),

  ranked: () => req<{ ranked: RankedView }>('/ranked'),
  boards: () => req<{ boards: Boards }>('/boards'),

  clan: () => req<{ clan: ClanView | null; board: ClanBoardRow[] }>('/clan'),
  clanCreate: (name: string, tag: string) => req<{ clan: ClanView; board: ClanBoardRow[]; profile: Profile }>('/clan/create', { name, tag }),
  clanJoin: (clanId: number) => req<{ clan: ClanView; board: ClanBoardRow[] }>('/clan/join', { clanId }),
  clanLeave: () => req<{ clan: ClanView | null; board: ClanBoardRow[] }>('/clan/leave', {}),
  clanClaimWeekly: () => req<{ clan: ClanView; profile: Profile }>('/clan/weekly/claim', {}),

  collections: () => req<{ collections: CollectionView[] }>('/collections'),
  claimCollection: (name: string) => req<{ bonus: number; collections: CollectionView[]; profile: Profile }>('/collections/claim', { name }),

  market: () => req<{ market: MarketView }>('/market'),
  listItem: (itemId: string, price: number) => req<{ market: MarketView }>('/market/list', { itemId, price }),
  buyListing: (listingId: number) => req<{ market: MarketView; profile: Profile }>('/market/buy', { listingId }),
  cancelListing: (listingId: number) => req<{ market: MarketView }>('/market/cancel', { listingId }),

  social: () => req<SocialSnapshot>('/social'),
  addFriend: (code: string) => req<{ friend: Friend; friends: Friend[] }>('/friends/add', { code }),
  acceptChallenge: (fromId: number, gameId: string) => req<{ reward: number; profile: Profile }>('/challenge/accept', { fromId, gameId }),
  removeFriend: (friendId: number) => req<{ friends: Friend[] }>('/friends/remove', { friendId }),

  profile: () => req<{ profile: Profile; recent: string[] }>('/profile'),
  walletInvoice: (packId: string) => req<{ link: string }>('/wallet/invoice', { packId }),

  season: () => req<{ season: SeasonView }>('/season'),
  claimSeasonTier: (tier: number, track: 'free' | 'premium') =>
    req<{ reward: Reward; season: SeasonView; profile: Profile }>('/season/claim', { tier, track }),
  passInvoice: () => req<{ link: string }>('/season/premium'),
  passPlusInvoice: () => req<{ link: string }>('/season/premium-plus'),
  boostInvoice: () => req<{ link: string }>('/season/boost'),

  festival: () => req<{ festival: FestivalView | null }>('/festival'),
  claimEventQuest: (questId: string) => req<{ tokens: number; festival: FestivalView }>('/festival/quest/claim', { questId }),
  claimCommunity: () => req<{ festival: FestivalView }>('/festival/community/claim', {}),
  buyEventItem: (itemId: string) => req<{ festival: FestivalView }>('/festival/shop/buy', { itemId }),

  cosmetics: () => req<Wardrobe>('/cosmetics'),
  equip: (slot: Slot, itemId: string) => req<{ profile: Profile; wardrobe: Wardrobe }>('/cosmetics/equip', { slot, itemId }),
  buy: (itemId: string) => req<{ profile: Profile; wardrobe: Wardrobe }>('/cosmetics/buy', { itemId }),
  recolor: (itemId: string, hue: number) => req<{ profile: Profile; wardrobe: Wardrobe }>('/cosmetics/recolor', { itemId, hue }),
}
