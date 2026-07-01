import { getInitData } from './telegram'
import type {
  AuthResponse, GameCard, GameMeta, Profile, ProfileDetail,
  Friend, ActivityItem, LeaderRow, Wardrobe, Slot, RatingValue, Quest,
} from '@shared/types'

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
}

export const api = {
  async auth(): Promise<AuthResponse> {
    const r = await req<AuthResponse>('/auth', { initData: getInitData() })
    token = r.token
    sessionStorage.setItem('gg_jwt', r.token)
    return r
  },
  catalog: () => req<{ catalog: GameCard[]; meta: Record<string, GameMeta> }>('/catalog'),
  open: (gameId: string) => req<{ profile: Profile; recent: string[] }>('/open', { gameId }),
  toggleFavorite: (gameId: string) => req<{ favorite: boolean; favorites: string[] }>('/favorites/toggle', { gameId }),
  rate: (gameId: string, value: RatingValue | 0) =>
    req<{ ratings: Record<string, RatingValue>; meta: Record<string, GameMeta> }>('/rate', { gameId, value }),
  quests: () => req<{ quests: Quest[] }>('/quests'),
  claimQuest: (questId: string) => req<{ reward: number; profile: Profile; quests: Quest[] }>('/quests/claim', { questId }),
  gift: (friendId: number, amount: number) => req<{ amount: number; profile: Profile; friends: Friend[] }>('/gift', { friendId, amount }),

  profileDetail: () => req<ProfileDetail>('/profile/detail'),
  updateProfile: (patch: { name: string }) => req<{ profile: Profile }>('/profile/update', patch),

  social: () => req<SocialSnapshot>('/social'),
  addFriend: (code: string) => req<{ friend: Friend; friends: Friend[] }>('/friends/add', { code }),
  removeFriend: (friendId: number) => req<{ friends: Friend[] }>('/friends/remove', { friendId }),

  cosmetics: () => req<Wardrobe>('/cosmetics'),
  equip: (slot: Slot, itemId: string) => req<{ profile: Profile; wardrobe: Wardrobe }>('/cosmetics/equip', { slot, itemId }),
  buy: (itemId: string) => req<{ profile: Profile; wardrobe: Wardrobe }>('/cosmetics/buy', { itemId }),
}
