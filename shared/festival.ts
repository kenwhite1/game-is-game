// Кросс-игровые события (§12 библии): лимитированные оверлеи с валютой 🎟
// Event Tokens (зарабатываются в событии, тратятся только в его магазине,
// сгорают в конце — 10% номинала конвертируется в монеты). Событие — это
// КОНФИГ: квесты + магазин + общая цель. Никаких новых подсистем: композиция
// уже готовых квестов (§8) и косметики (§10).

export type EventStat = 'distinct_since' | 'opens_since' | 'rate_since'

export interface EventQuestDef {
  id: string
  title: string
  emoji: string
  target: number
  tokens: number
  stat: EventStat
}
export interface EventShopItem {
  itemId: string
  tokens: number
}
export interface CommunityGoal {
  title: string
  /** Метрика общего счётчика (сейчас — «запуски»). */
  metric: string
  target: number
  /** Косметика всем участникам при достижении цели. */
  rewardItemId: string
}
export interface Festival {
  id: string
  name: string
  emoji: string
  startMs: number
  endMs: number
  quests: EventQuestDef[]
  shop: EventShopItem[]
  community: CommunityGoal
}

/** Доля номинала 🎟, что вернётся монетами при сгорании токенов. */
export const TOKEN_TO_COIN = 0.1

export const FESTIVALS: Festival[] = [
  {
    id: 'summer26',
    name: 'Летний движ',
    emoji: '🏖️',
    startMs: Date.parse('2026-07-01T00:00:00Z'),
    endMs: Date.parse('2026-08-01T00:00:00Z'),
    quests: [
      { id: 'e_breadth5', title: 'Открой 5 разных игр', emoji: '🧭', target: 5, tokens: 20, stat: 'distinct_since' },
      { id: 'e_play10', title: 'Сыграй 10 раз', emoji: '🎮', target: 10, tokens: 15, stat: 'opens_since' },
      { id: 'e_rate3', title: 'Оцени 3 игры', emoji: '👍', target: 3, tokens: 15, stat: 'rate_since' },
    ],
    shop: [
      { itemId: 'title_summer', tokens: 20 },
      { itemId: 'frame_summer', tokens: 60 },
    ],
    community: { title: 'Сообщество: 50 000 запусков за лето', metric: 'opens', target: 50_000, rewardItemId: 'title_community' },
  },
]

export function activeFestival(now: number): Festival | null {
  return FESTIVALS.find(f => now >= f.startMs && now < f.endMs) ?? null
}
export function festivalById(id: string): Festival | undefined {
  return FESTIVALS.find(f => f.id === id)
}

// ── Модель витрины (общая для сервера и клиента) ──────────────────────────
export interface EventQuestView { id: string; title: string; emoji: string; target: number; tokens: number; progress: number; done: boolean; claimed: boolean }
export interface EventShopView { itemId: string; name: string; tokens: number; owned: boolean }
export interface FestivalView {
  id: string
  name: string
  emoji: string
  endsMs: number
  tokens: number
  quests: EventQuestView[]
  shop: EventShopView[]
  community: { title: string; value: number; target: number; reached: boolean; claimed: boolean; rewardName: string }
}
