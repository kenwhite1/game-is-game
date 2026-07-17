// Кросс-игровые события (§12 библии): лимитированные оверлеи с валютой 🎟
// Event Tokens (зарабатываются в событии, тратятся только в его магазине,
// сгорают в конце - 10% номинала конвертируется в монеты). Событие - это
// КОНФИГ: квесты + магазин + общая цель. Никаких новых подсистем: композиция
// уже готовых квестов (§8) и косметики (§10).

import type { Category } from './games'

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
  /** Метрика общего счётчика (сейчас - «запуски»). */
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
  /** «Множитель-уикенд» (§12.2): победа в этом жанре даёт бонусные 🎟. */
  spotlight?: { category: Category; tokens: number }
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
    spotlight: { category: 'arcade', tokens: 3 },
  },
  {
    id: 'halloween26',
    name: 'Хэллоуин',
    emoji: '🎃',
    startMs: Date.parse('2026-10-25T00:00:00Z'),
    endMs: Date.parse('2026-11-02T00:00:00Z'),
    quests: [
      { id: 'hw_breadth5', title: 'Открой 5 разных игр', emoji: '🧭', target: 5, tokens: 20, stat: 'distinct_since' },
      { id: 'hw_play13', title: 'Сыграй 13 раз', emoji: '👻', target: 13, tokens: 20, stat: 'opens_since' },
    ],
    shop: [
      { itemId: 'title_hw', tokens: 20 },
      { itemId: 'frame_hw', tokens: 60 },
    ],
    community: { title: 'Сообщество: 100 000 партий на Хэллоуин', metric: 'opens', target: 100_000, rewardItemId: 'title_hw_community' },
    spotlight: { category: 'party', tokens: 4 },
  },
  {
    id: 'newyear27',
    name: 'Новый год',
    emoji: '🎄',
    startMs: Date.parse('2026-12-28T00:00:00Z'),
    endMs: Date.parse('2027-01-11T00:00:00Z'),
    quests: [
      { id: 'ny_breadth7', title: 'Открой 7 разных игр', emoji: '🎁', target: 7, tokens: 25, stat: 'distinct_since' },
      { id: 'ny_play20', title: 'Сыграй 20 раз за праздники', emoji: '❄️', target: 20, tokens: 25, stat: 'opens_since' },
      { id: 'ny_rate5', title: 'Оцени 5 игр', emoji: '⭐', target: 5, tokens: 20, stat: 'rate_since' },
    ],
    shop: [
      { itemId: 'title_ny', tokens: 25 },
      { itemId: 'frame_ny', tokens: 70 },
    ],
    community: { title: 'Сообщество: 200 000 партий за праздники', metric: 'opens', target: 200_000, rewardItemId: 'title_ny_community' },
    spotlight: { category: 'board', tokens: 4 },
  },
  {
    id: 'victory27',
    name: 'День Победы',
    emoji: '🎖️',
    startMs: Date.parse('2027-05-07T00:00:00Z'),
    endMs: Date.parse('2027-05-11T00:00:00Z'),
    quests: [
      { id: 'vd_breadth5', title: 'Открой 5 разных игр', emoji: '🕊️', target: 5, tokens: 20, stat: 'distinct_since' },
      { id: 'vd_play9', title: 'Сыграй 9 раз', emoji: '🎖️', target: 9, tokens: 20, stat: 'opens_since' },
    ],
    shop: [
      { itemId: 'title_victory', tokens: 20 },
      { itemId: 'frame_victory', tokens: 60 },
    ],
    community: { title: 'Сообщество: 150 000 партий к 9 мая', metric: 'opens', target: 150_000, rewardItemId: 'title_victory_community' },
    spotlight: { category: 'strategy', tokens: 4 },
  },
  {
    id: 'maslenitsa27',
    name: 'Масленица',
    emoji: '🥞',
    startMs: Date.parse('2027-02-08T00:00:00Z'),
    endMs: Date.parse('2027-02-15T00:00:00Z'),
    quests: [
      { id: 'ms_breadth5', title: 'Открой 5 разных игр', emoji: '🥞', target: 5, tokens: 20, stat: 'distinct_since' },
      { id: 'ms_play10', title: 'Сыграй 10 раз', emoji: '☀️', target: 10, tokens: 15, stat: 'opens_since' },
    ],
    shop: [
      { itemId: 'title_maslenitsa', tokens: 20 },
      { itemId: 'frame_maslenitsa', tokens: 60 },
    ],
    community: { title: 'Сообщество: 120 000 партий на Масленицу', metric: 'opens', target: 120_000, rewardItemId: 'title_maslenitsa_community' },
    spotlight: { category: 'word', tokens: 3 },
  },
  {
    id: 'defender27',
    name: '23 Февраля',
    emoji: '🎖️',
    startMs: Date.parse('2027-02-21T00:00:00Z'),
    endMs: Date.parse('2027-02-25T00:00:00Z'),
    quests: [
      { id: 'df_breadth5', title: 'Открой 5 разных игр', emoji: '🪖', target: 5, tokens: 20, stat: 'distinct_since' },
      { id: 'df_play9', title: 'Сыграй 9 раз', emoji: '⭐', target: 9, tokens: 20, stat: 'opens_since' },
    ],
    shop: [
      { itemId: 'title_defender', tokens: 20 },
      { itemId: 'frame_defender', tokens: 60 },
    ],
    community: { title: 'Сообщество: 120 000 партий к 23 февраля', metric: 'opens', target: 120_000, rewardItemId: 'title_defender_community' },
    spotlight: { category: 'strategy', tokens: 4 },
  },
  {
    id: 'women27',
    name: '8 Марта',
    emoji: '🌷',
    startMs: Date.parse('2027-03-06T00:00:00Z'),
    endMs: Date.parse('2027-03-10T00:00:00Z'),
    quests: [
      { id: 'wm_breadth5', title: 'Открой 5 разных игр', emoji: '🌷', target: 5, tokens: 20, stat: 'distinct_since' },
      { id: 'wm_play9', title: 'Сыграй 9 раз', emoji: '💐', target: 9, tokens: 20, stat: 'opens_since' },
    ],
    shop: [
      { itemId: 'title_women', tokens: 20 },
      { itemId: 'frame_women', tokens: 60 },
    ],
    community: { title: 'Сообщество: 120 000 партий к 8 марта', metric: 'opens', target: 120_000, rewardItemId: 'title_women_community' },
    spotlight: { category: 'party', tokens: 4 },
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
