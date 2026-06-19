// Косметика хаба Game is Game — «скины», которые НАДЕВАЮТСЯ на персонажа.
// Слоты (как в Roblox-редакторе образа):
//   avatar    — сам персонаж (эмодзи)
//   frame     — кольцо-рамка вокруг аватара
//   hat       — головной убор (поверх макушки)
//   eyewear   — на лицо (очки/маски)
//   effect    — аура/частицы вокруг персонажа
//   companion — питомец рядом
//   banner    — фон карточки игрока
//   title     — титул под именем
// Аксессуары (hat/eyewear/effect/companion) рисуются слоями на аватаре —
// в любом месте, где он виден (профиль, друзья, лента, таблица лидеров).
//
// Валюта — «Game» (мягкая, зарабатывается игрой). Часть предметов открывается
// прогрессом (уровень/значки), часть покупается в магазине за Game, топовые
// мифики пока заперты под будущую премиум-монетизацию.
//
// Файл без браузерных/Node-зависимостей: импортируется отовсюду.

export type Slot = 'avatar' | 'frame' | 'hat' | 'eyewear' | 'effect' | 'companion' | 'banner' | 'title'
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'

export type Unlock =
  | { kind: 'starter' }
  | { kind: 'level'; level: number }
  | { kind: 'badge'; badge: string }
  | { kind: 'shop'; price: number }
  | { kind: 'premium' }

interface Base {
  id: string
  slot: Slot
  name: string
  rarity: Rarity
  collection: string
  unlock: Unlock
}
export interface AvatarItem extends Base { slot: 'avatar'; emoji: string; ring: string }
export interface FrameItem extends Base { slot: 'frame'; bg: string; glow?: string; anim?: 'spin' | 'pulse' | 'shimmer' }
export interface HatItem extends Base { slot: 'hat'; emoji: string }
export interface EyewearItem extends Base { slot: 'eyewear'; emoji: string }
export interface CompanionItem extends Base { slot: 'companion'; emoji: string }
export interface EffectItem extends Base { slot: 'effect'; particle: string; glow?: string; anim: 'float' | 'rise' | 'orbit' | 'spin' | 'pulse' }
export interface BannerItem extends Base { slot: 'banner'; bg: string; anim?: 'shimmer' | 'drift' }
export interface TitleItem extends Base { slot: 'title'; text: string }
export type Cosmetic =
  | AvatarItem | FrameItem | HatItem | EyewearItem | CompanionItem | EffectItem | BannerItem | TitleItem

export const SLOTS: Slot[] = ['avatar', 'frame', 'hat', 'eyewear', 'effect', 'companion', 'banner', 'title']
export const SLOT_RU: Record<Slot, string> = {
  avatar: 'Персонаж', frame: 'Рамка', hat: 'Шляпа', eyewear: 'Очки',
  effect: 'Эффект', companion: 'Питомец', banner: 'Баннер', title: 'Титул',
}

export const RARITY_ORDER: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 }
export const RARITY: Record<Rarity, { label: string; color: string }> = {
  common: { label: 'Обычная', color: '#9b8466' },
  rare: { label: 'Редкая', color: '#3a82f7' },
  epic: { label: 'Эпическая', color: '#9b6cff' },
  legendary: { label: 'Легендарная', color: '#f2a93b' },
  mythic: { label: 'Мифическая', color: '#e2574c' },
}

// Цены магазина по умолчанию (в Game) по редкости.
export const PRICE: Record<Rarity, number> = { common: 120, rare: 350, epic: 900, legendary: 2200, mythic: 6000 }
const shop = (r: Rarity, price?: number): Unlock => ({ kind: 'shop', price: price ?? PRICE[r] })

// ─── Персонажи ───────────────────────────────────────────────────────────
const A = (id: string, name: string, emoji: string, ring: string, rarity: Rarity, collection: string, unlock: Unlock): AvatarItem =>
  ({ id, slot: 'avatar', name, emoji, ring, rarity, collection, unlock })

export const AVATAR_ITEMS: AvatarItem[] = [
  A('fox', 'Лис', '🦊', '#f2a93b', 'common', 'Базовые', { kind: 'starter' }),
  A('owl', 'Сова', '🦉', '#3a82f7', 'common', 'Базовые', { kind: 'starter' }),
  A('cat', 'Кот', '🐱', '#e2574c', 'common', 'Базовые', { kind: 'starter' }),
  A('panda', 'Панда', '🐼', '#5c7cfa', 'common', 'Базовые', { kind: 'starter' }),
  A('frog', 'Лягушка', '🐸', '#7fb069', 'common', 'Базовые', { kind: 'starter' }),
  A('penguin', 'Пингвин', '🐧', '#4dabf7', 'common', 'Базовые', { kind: 'starter' }),
  A('pig', 'Свин', '🐷', '#f783ac', 'common', 'Базовые', { kind: 'starter' }),
  A('chick', 'Цыплёнок', '🐥', '#f7cf6f', 'common', 'Базовые', { kind: 'starter' }),
  A('hamster', 'Хомяк', '🐹', '#e8a87c', 'common', 'Базовые', { kind: 'starter' }),
  A('rabbit', 'Кролик', '🐰', '#dee2e6', 'common', 'Базовые', { kind: 'starter' }),
  // Звери — уровни
  A('tiger', 'Тигр', '🐯', '#f59f00', 'rare', 'Звери', { kind: 'level', level: 3 }),
  A('bear', 'Мишка', '🐻', '#9c6644', 'rare', 'Звери', { kind: 'level', level: 4 }),
  A('koala', 'Коала', '🐨', '#868e96', 'rare', 'Звери', { kind: 'level', level: 5 }),
  A('wolf', 'Волк', '🐺', '#5c7cfa', 'rare', 'Звери', { kind: 'level', level: 6 }),
  A('monkey', 'Обезьяна', '🐵', '#a8742f', 'rare', 'Звери', { kind: 'level', level: 7 }),
  A('lion', 'Лев', '🦁', '#f59f00', 'rare', 'Звери', { kind: 'level', level: 8 }),
  A('butterfly', 'Бабочка', '🦋', '#4dabf7', 'rare', 'Звери', { kind: 'level', level: 9 }),
  A('octopus', 'Осьминог', '🐙', '#cc5de8', 'epic', 'Звери', { kind: 'level', level: 11 }),
  A('eagle', 'Орёл', '🦅', '#8a5a33', 'epic', 'Звери', { kind: 'level', level: 13 }),
  A('whale', 'Кит', '🐳', '#3a82f7', 'epic', 'Звери', { kind: 'level', level: 14 }),
  A('trex', 'Ти-рекс', '🦖', '#5e8e4a', 'legendary', 'Звери', { kind: 'level', level: 22 }),
  // Магазин — звери
  A('shark', 'Акула', '🦈', '#4dabf7', 'rare', 'Звери', shop('rare')),
  A('parrot', 'Попугай', '🦜', '#51cf66', 'rare', 'Звери', shop('rare')),
  A('hedgehog', 'Ёжик', '🦔', '#b08968', 'rare', 'Звери', shop('rare')),
  A('snake', 'Змея', '🐍', '#69db7c', 'epic', 'Звери', shop('epic')),
  A('peacock', 'Павлин', '🦚', '#22b8cf', 'epic', 'Звери', shop('epic')),
  // Мифические / стихии
  A('dragon', 'Дракон', '🐲', '#7fb069', 'epic', 'Мифические', { kind: 'level', level: 12 }),
  A('unicorn', 'Единорог', '🦄', '#f06595', 'epic', 'Мифические', { kind: 'badge', badge: 'explorer' }),
  A('ninja', 'Ниндзя', '🥷', '#495057', 'epic', 'Мифические', { kind: 'level', level: 17 }),
  A('wizard', 'Маг', '🧙', '#9b6cff', 'legendary', 'Мифические', { kind: 'level', level: 19 }),
  A('mermaid', 'Русалка', '🧜', '#22b8cf', 'epic', 'Мифические', shop('epic')),
  A('fairy', 'Фея', '🧚', '#f783ac', 'epic', 'Мифические', shop('epic')),
  A('vampire', 'Вампир', '🧛', '#a02c4a', 'legendary', 'Мифические', shop('legendary')),
  A('fire', 'Огонёк', '🔥', '#e2574c', 'epic', 'Стихии', { kind: 'level', level: 16 }),
  A('star', 'Звезда', '🌟', '#f7cf6f', 'rare', 'Стихии', { kind: 'level', level: 10 }),
  A('crystal', 'Шар', '🔮', '#9b6cff', 'epic', 'Стихии', { kind: 'level', level: 15 }),
  A('gem', 'Алмаз', '💎', '#22b8cf', 'legendary', 'Стихии', { kind: 'badge', badge: 'collector' }),
  A('crown', 'Корона', '👑', '#f2a93b', 'legendary', 'Стихии', { kind: 'level', level: 20 }),
  A('rocket', 'Ракета', '🚀', '#3a82f7', 'legendary', 'Космос', { kind: 'level', level: 18 }),
  A('skull', 'Череп', '💀', '#868e96', 'epic', 'Тьма', { kind: 'level', level: 14 }),
  A('demon', 'Демон', '👹', '#e2574c', 'epic', 'Тьма', { kind: 'badge', badge: 'veteran' }),
  // Премиум — заперты (будущая монетизация)
  A('genie', 'Джинн', '🧞', '#5c7cfa', 'mythic', 'Премиум', { kind: 'premium' }),
  A('ufo', 'НЛО', '🛸', '#22b8cf', 'mythic', 'Топ', shop('mythic')),
  A('alien', 'Пришелец', '👾', '#cc5de8', 'epic', 'Премиум', shop('epic')),
  A('robot', 'Робот', '🤖', '#868e96', 'rare', 'Премиум', shop('rare')),
  A('ghost', 'Призрак', '👻', '#adb5bd', 'rare', 'Премиум', shop('rare')),
  A('clown', 'Клоун', '🤡', '#f06595', 'rare', 'Премиум', shop('rare')),
  A('jackolantern', 'Тыква', '🎃', '#f2762a', 'epic', 'Сезон', shop('epic')),
  A('snowman', 'Снеговик', '⛄', '#74c0fc', 'rare', 'Сезон', shop('rare')),
]

// ─── Рамки ─────────────────────────────────────────────────────────────
const F = (id: string, name: string, rarity: Rarity, collection: string, unlock: Unlock, bg: string, glow?: string, anim?: FrameItem['anim']): FrameItem =>
  ({ id, slot: 'frame', name, rarity, collection, unlock, bg, glow, anim })

export const FRAME_ITEMS: FrameItem[] = [
  F('frame_none', 'Без рамки', 'common', 'Базовые', { kind: 'starter' }, ''),
  F('frame_silver', 'Серебро', 'common', 'Базовые', { kind: 'starter' }, 'linear-gradient(135deg,#eef2f7,#b9c2cf)'),
  F('frame_bronze', 'Бронза', 'common', 'Базовые', { kind: 'starter' }, 'linear-gradient(135deg,#e6b486,#a86a3c)'),
  F('frame_pixel', 'Пиксель', 'rare', 'Ретро', { kind: 'level', level: 4 }, 'repeating-conic-gradient(#5c7cfa 0deg 30deg,#fff 30deg 60deg)'),
  F('frame_ice', 'Лёд', 'rare', 'Стихии', { kind: 'level', level: 6 }, 'linear-gradient(135deg,#dff4ff,#7fc7f0,#3a82f7)', 'rgba(127,199,240,.6)'),
  F('frame_sakura', 'Сакура', 'rare', 'Природа', { kind: 'level', level: 10 }, 'linear-gradient(135deg,#ffd6e8,#ff8fc0,#f06595)', 'rgba(240,101,149,.5)'),
  F('frame_mint', 'Мята', 'rare', 'Природа', shop('rare'), 'linear-gradient(135deg,#b2f2dd,#2bb39a)', 'rgba(43,179,154,.5)'),
  F('frame_neon', 'Неон', 'epic', 'Кибер', { kind: 'level', level: 8 }, 'linear-gradient(135deg,#3df0ff,#3a82f7)', 'rgba(61,240,255,.8)', 'pulse'),
  F('frame_emerald', 'Изумруд', 'epic', 'Природа', { kind: 'badge', badge: 'collector' }, 'linear-gradient(135deg,#a8f0c0,#34c759,#1f8f46)', 'rgba(52,199,89,.55)'),
  F('frame_lava', 'Лава', 'epic', 'Стихии', { kind: 'level', level: 18 }, 'conic-gradient(from 0deg,#2a0d0d,#e2574c,#ffb24d,#2a0d0d)', 'rgba(226,87,76,.6)', 'spin'),
  F('frame_aurora', 'Аврора', 'epic', 'Космос', { kind: 'badge', badge: 'popular' }, 'linear-gradient(135deg,#5ad0a0,#3a82f7,#9b6cff)', 'rgba(90,208,160,.5)', 'pulse'),
  F('frame_fire', 'Пламя', 'epic', 'Стихии', { kind: 'level', level: 12 }, 'conic-gradient(from 0deg,#ffd166,#f2762a,#e2574c,#ffd166)', 'rgba(242,118,42,.7)', 'spin'),
  F('frame_amethyst', 'Аметист', 'epic', 'Роскошь', shop('epic'), 'linear-gradient(135deg,#d0bfff,#9b6cff,#5c3bc0)', 'rgba(155,108,255,.6)'),
  F('frame_gold', 'Золото', 'legendary', 'Роскошь', { kind: 'level', level: 5 }, 'linear-gradient(135deg,#ffe7a6,#f2a93b 60%,#caa12e)', 'rgba(242,169,59,.7)'),
  F('frame_royal', 'Корона', 'legendary', 'Роскошь', { kind: 'level', level: 15 }, 'linear-gradient(135deg,#9b6cff,#5c3bc0,#f2a93b)', 'rgba(155,108,255,.6)'),
  F('frame_rainbow', 'Радуга', 'legendary', 'Космос', { kind: 'level', level: 20 }, 'conic-gradient(from 0deg,#ff5d5d,#ffb24d,#ffe24d,#5ad06e,#3a82f7,#9b6cff,#ff5d5d)', 'rgba(155,108,255,.5)', 'spin'),
  F('frame_crown', 'Венец', 'legendary', 'Роскошь', { kind: 'level', level: 25 }, 'linear-gradient(135deg,#fff1c2,#f7cf6f,#d98b1f)', 'rgba(247,207,111,.85)', 'pulse'),
  F('frame_diamond', 'Бриллиант', 'legendary', 'Роскошь', shop('legendary'), 'conic-gradient(from 0deg,#e8fbff,#a5e8ff,#fff,#a5e8ff,#e8fbff)', 'rgba(165,232,255,.8)', 'spin'),
  F('frame_glitch', 'Глитч', 'mythic', 'Топ', shop('mythic'), 'linear-gradient(135deg,#ff00e6,#00fff0,#ff00e6)', 'rgba(255,0,230,.6)', 'shimmer'),
  F('frame_void', 'Бездна', 'mythic', 'Премиум', { kind: 'premium' }, 'radial-gradient(circle,#2a2540,#0d0b16)', 'rgba(155,108,255,.7)', 'pulse'),
  F('frame_electric', 'Электро', 'epic', 'Кибер', shop('epic'), 'linear-gradient(135deg,#fff95c,#3a82f7,#9b6cff)', 'rgba(58,130,247,.7)', 'shimmer'),
]

// ─── Шляпы ─────────────────────────────────────────────────────────────
const H = (id: string, name: string, emoji: string, rarity: Rarity, collection: string, unlock: Unlock): HatItem =>
  ({ id, slot: 'hat', name, emoji, rarity, collection, unlock })

export const HAT_ITEMS: HatItem[] = [
  H('hat_none', 'Без шляпы', '', 'common', 'Базовые', { kind: 'starter' }),
  H('hat_cap', 'Кепка', '🧢', 'common', 'Уличное', { kind: 'starter' }),
  H('hat_party', 'Колпак', '🎉', 'common', 'Праздник', { kind: 'starter' }),
  H('hat_bow', 'Бантик', '🎀', 'rare', 'Милое', { kind: 'level', level: 3 }),
  H('hat_grad', 'Конфедератка', '🎓', 'rare', 'Учёба', { kind: 'level', level: 5 }),
  H('hat_sun', 'Шляпка', '👒', 'rare', 'Лето', shop('rare')),
  H('hat_tophat', 'Цилиндр', '🎩', 'epic', 'Высший свет', { kind: 'level', level: 9 }),
  H('hat_helmet', 'Каска', '⛑️', 'rare', 'Стройка', shop('rare')),
  H('hat_military', 'Берет', '🪖', 'rare', 'Армия', shop('rare')),
  H('hat_flower', 'Цветок', '🌸', 'rare', 'Природа', shop('rare')),
  H('hat_mushroom', 'Гриб', '🍄', 'epic', 'Лес', shop('epic')),
  H('hat_halo', 'Нимб', '😇', 'legendary', 'Небеса', { kind: 'level', level: 16 }),
  H('hat_horns', 'Рожки', '👹', 'epic', 'Тьма', shop('epic')),
  H('hat_crownhat', 'Корона', '👑', 'legendary', 'Роскошь', { kind: 'level', level: 14 }),
  H('hat_santa', 'Колпак Санты', '🎅', 'epic', 'Сезон', shop('epic')),
  H('hat_snowflake', 'Снежинка', '❄️', 'rare', 'Сезон', shop('rare')),
  H('hat_flame', 'Огонь', '🔥', 'epic', 'Стихии', shop('epic')),
  H('hat_brain', 'Мозг', '🧠', 'epic', 'Гик', shop('epic')),
  H('hat_idea', 'Идея', '💡', 'rare', 'Гик', shop('rare')),
  H('hat_unicornhorn', 'Рог', '🦄', 'legendary', 'Мифические', shop('legendary')),
  H('hat_propeller', 'Пропеллер', '🚁', 'epic', 'Ретро', shop('epic')),
  H('hat_galaxy', 'Галактика', '🌌', 'mythic', 'Топ', shop('mythic')),
]

// ─── Очки / на лицо ─────────────────────────────────────────────────────
const E = (id: string, name: string, emoji: string, rarity: Rarity, collection: string, unlock: Unlock): EyewearItem =>
  ({ id, slot: 'eyewear', name, emoji, rarity, collection, unlock })

export const EYEWEAR_ITEMS: EyewearItem[] = [
  E('eye_none', 'Без очков', '', 'common', 'Базовые', { kind: 'starter' }),
  E('eye_glasses', 'Очки', '👓', 'common', 'Базовые', { kind: 'starter' }),
  E('eye_shades', 'Тёмные очки', '🕶️', 'rare', 'Стиль', { kind: 'level', level: 4 }),
  E('eye_goggles', 'Гогглы', '🥽', 'rare', 'Спорт', shop('rare')),
  E('eye_scuba', 'Маска', '🤿', 'epic', 'Море', shop('epic')),
  E('eye_monocle', 'Монокль', '🧐', 'epic', 'Высший свет', { kind: 'level', level: 11 }),
  E('eye_disguise', 'Маскировка', '🥸', 'rare', 'Шпион', shop('rare')),
  E('eye_theatre', 'Маска театра', '🎭', 'epic', 'Сцена', shop('epic')),
  E('eye_3d', '3D-очки', '🤓', 'rare', 'Гик', shop('rare')),
  E('eye_star', 'Звёздные очки', '🤩', 'legendary', 'Премиум', shop('legendary')),
]

// ─── Эффекты (аура/частицы) ─────────────────────────────────────────────
const FX = (id: string, name: string, particle: string, rarity: Rarity, collection: string, unlock: Unlock, anim: EffectItem['anim'], glow?: string): EffectItem =>
  ({ id, slot: 'effect', name, particle, rarity, collection, unlock, anim, glow })

export const EFFECT_ITEMS: EffectItem[] = [
  FX('fx_none', 'Без эффекта', '', 'common', 'Базовые', { kind: 'starter' }, 'float'),
  FX('fx_sparkle', 'Искры', '✨', 'rare', 'Магия', { kind: 'level', level: 3 }, 'float', 'rgba(247,207,111,.6)'),
  FX('fx_hearts', 'Сердечки', '💗', 'rare', 'Милое', shop('rare'), 'rise', 'rgba(240,101,149,.5)'),
  FX('fx_flame', 'Пламя', '🔥', 'epic', 'Стихии', { kind: 'level', level: 12 }, 'rise', 'rgba(242,118,42,.6)'),
  FX('fx_snow', 'Снег', '❄️', 'rare', 'Сезон', shop('rare'), 'rise', 'rgba(116,192,252,.5)'),
  FX('fx_stars', 'Звёзды', '⭐', 'epic', 'Космос', shop('epic'), 'orbit', 'rgba(247,207,111,.6)'),
  FX('fx_bolt', 'Молнии', '⚡', 'epic', 'Стихии', { kind: 'level', level: 15 }, 'pulse', 'rgba(255,224,77,.6)'),
  FX('fx_bubbles', 'Пузыри', '🫧', 'rare', 'Море', shop('rare'), 'rise', 'rgba(116,192,252,.5)'),
  FX('fx_leaves', 'Листья', '🍃', 'rare', 'Природа', shop('rare'), 'float', 'rgba(127,176,105,.5)'),
  FX('fx_confetti', 'Конфетти', '🎊', 'epic', 'Праздник', { kind: 'badge', badge: 'popular' }, 'rise', 'rgba(255,93,158,.5)'),
  FX('fx_rainbow', 'Радуга', '🌈', 'legendary', 'Космос', { kind: 'level', level: 21 }, 'orbit', 'rgba(155,108,255,.5)'),
  FX('fx_crown', 'Сияние', '👑', 'legendary', 'Роскошь', shop('legendary'), 'orbit', 'rgba(247,207,111,.7)'),
  FX('fx_aura', 'Тёмная аура', '🟣', 'mythic', 'Топ', shop('mythic'), 'pulse', 'rgba(155,108,255,.7)'),
]

// ─── Питомцы (компаньоны) ───────────────────────────────────────────────
const C = (id: string, name: string, emoji: string, rarity: Rarity, collection: string, unlock: Unlock): CompanionItem =>
  ({ id, slot: 'companion', name, emoji, rarity, collection, unlock })

export const COMPANION_ITEMS: CompanionItem[] = [
  C('comp_none', 'Без питомца', '', 'common', 'Базовые', { kind: 'starter' }),
  C('comp_dog', 'Щенок', '🐶', 'common', 'Питомцы', { kind: 'starter' }),
  C('comp_cat', 'Котёнок', '🐱', 'rare', 'Питомцы', { kind: 'level', level: 4 }),
  C('comp_chick', 'Птенчик', '🐤', 'rare', 'Питомцы', shop('rare')),
  C('comp_turtle', 'Черепашка', '🐢', 'rare', 'Питомцы', shop('rare')),
  C('comp_bee', 'Пчёлка', '🐝', 'rare', 'Питомцы', shop('rare')),
  C('comp_fox', 'Лисёнок', '🦊', 'rare', 'Питомцы', { kind: 'level', level: 7 }),
  C('comp_dragon', 'Дракончик', '🐉', 'epic', 'Мифические', { kind: 'level', level: 13 }),
  C('comp_unicorn', 'Единорожек', '🦄', 'epic', 'Мифические', shop('epic')),
  C('comp_ghost', 'Привидение', '👻', 'epic', 'Тьма', shop('epic')),
  C('comp_robot', 'Дрон', '🤖', 'epic', 'Кибер', shop('epic')),
  C('comp_alien', 'Инопланетянин', '👾', 'epic', 'Космос', shop('epic')),
  C('comp_star', 'Звёздочка', '🌟', 'legendary', 'Космос', { kind: 'level', level: 18 }),
  C('comp_phoenix', 'Феникс', '🔥', 'legendary', 'Стихии', shop('legendary')),
  C('comp_panda', 'Пандочка', '🐼', 'rare', 'Питомцы', shop('rare')),
  C('comp_owl', 'Совёнок', '🦉', 'legendary', 'Топ', shop('legendary')),
  C('comp_dino', 'Динозаврик', '🦕', 'mythic', 'Топ', shop('mythic')),
]

// ─── Баннеры (тёмные/сочные — белый текст всегда читается) ──────────────
const B = (id: string, name: string, rarity: Rarity, collection: string, unlock: Unlock, bg: string, anim?: BannerItem['anim']): BannerItem =>
  ({ id, slot: 'banner', name, rarity, collection, unlock, bg, anim })

const HL = 'radial-gradient(120% 120% at 12% 0%, rgba(255,255,255,.28), rgba(255,255,255,0) 55%),'
export const BANNER_ITEMS: BannerItem[] = [
  B('banner_blue', 'Электрик', 'common', 'Базовые', { kind: 'starter' }, HL + 'linear-gradient(135deg,#4a90ff 0%,#3a82f7 56%,#2256d8 100%)'),
  B('banner_midnight', 'Полночь', 'common', 'Базовые', { kind: 'starter' }, HL + 'linear-gradient(135deg,#1b2a4a,#0e1730)'),
  B('banner_mint', 'Мята', 'common', 'Базовые', { kind: 'starter' }, HL + 'linear-gradient(135deg,#2bb39a,#117a8b)'),
  B('banner_ocean', 'Океан', 'rare', 'Природа', { kind: 'level', level: 5 }, HL + 'linear-gradient(135deg,#2f9bd6,#1f5fa0,#123a66)'),
  B('banner_sunset', 'Закат', 'rare', 'Природа', { kind: 'level', level: 3 }, HL + 'linear-gradient(135deg,#ff8a5c,#ff5d7e,#7a3b8f)'),
  B('banner_sakura', 'Сакура', 'rare', 'Природа', { kind: 'level', level: 8 }, HL + 'linear-gradient(135deg,#e06595,#a83b6e,#5c2347)'),
  B('banner_forest', 'Чаща', 'rare', 'Природа', shop('rare'), HL + 'linear-gradient(135deg,#2f7d4f,#14502e)'),
  B('banner_aurora', 'Аврора', 'epic', 'Космос', { kind: 'level', level: 7 }, HL + 'linear-gradient(135deg,#1f8f6e,#2f6bf0,#7b3bd0)'),
  B('banner_cosmos', 'Космос', 'epic', 'Космос', { kind: 'level', level: 10 }, HL + 'radial-gradient(circle at 30% 20%,#3b2d6e,#140f2e)'),
  B('banner_volcano', 'Вулкан', 'epic', 'Стихии', { kind: 'level', level: 12 }, HL + 'linear-gradient(135deg,#e2574c,#7a1f17,#2a0d0d)'),
  B('banner_storm', 'Гроза', 'epic', 'Стихии', shop('epic'), HL + 'linear-gradient(135deg,#46566e,#27303f)'),
  B('banner_emerald', 'Изумруд', 'epic', 'Роскошь', { kind: 'badge', badge: 'collector' }, HL + 'linear-gradient(135deg,#1f8f46,#0c4a26)'),
  B('banner_matrix', 'Матрица', 'epic', 'Кибер', { kind: 'level', level: 16 }, HL + 'linear-gradient(135deg,#0d2a16,#1f8f46,#0d2a16)', 'drift'),
  B('banner_retrowave', 'Ретровейв', 'legendary', 'Кибер', { kind: 'level', level: 18 }, HL + 'linear-gradient(180deg,#2a1145 0%,#7a2b8f 55%,#ff5d9e 100%)'),
  B('banner_gold', 'Золото', 'legendary', 'Роскошь', { kind: 'level', level: 15 }, HL + 'linear-gradient(135deg,#caa12e,#7a5a12,#1a1408)'),
  B('banner_galaxy', 'Галактика', 'legendary', 'Космос', shop('legendary'), HL + 'radial-gradient(circle at 70% 30%,#5c3bc0,#1a1140 60%,#0a0718)'),
  B('banner_blackgold', 'Чёрное золото', 'mythic', 'Премиум', { kind: 'premium' }, HL + 'linear-gradient(135deg,#1a1408,#3a2f12,#caa12e)', 'shimmer'),
  B('banner_nebula', 'Туманность', 'mythic', 'Премиум', { kind: 'premium' }, HL + 'radial-gradient(circle at 40% 30%,#ff5d9e,#7b3bd0 45%,#140f2e)', 'drift'),
]

// ─── Титулы ─────────────────────────────────────────────────────────────
const T = (id: string, text: string, rarity: Rarity, collection: string, unlock: Unlock): TitleItem =>
  ({ id, slot: 'title', name: text, text, rarity, collection, unlock })

export const TITLE_ITEMS: TitleItem[] = [
  T('title_player', 'Игрок', 'common', 'Базовые', { kind: 'starter' }),
  T('title_rookie', 'Новичок', 'common', 'Базовые', { kind: 'starter' }),
  T('title_explorer', 'Исследователь', 'rare', 'Достижения', { kind: 'badge', badge: 'explorer' }),
  T('title_collector', 'Коллекционер', 'epic', 'Достижения', { kind: 'badge', badge: 'collector' }),
  T('title_soul', 'Душа компании', 'epic', 'Достижения', { kind: 'badge', badge: 'popular' }),
  T('title_nightowl', 'Ночная сова', 'rare', 'Стиль', { kind: 'level', level: 5 }),
  T('title_petkeeper', 'Хранитель Шарика', 'rare', 'Игры', { kind: 'level', level: 6 }),
  T('title_lucky', 'Везунчик', 'rare', 'Стиль', shop('rare')),
  T('title_bluffmaster', 'Мастер блефа', 'rare', 'Игры', { kind: 'level', level: 8 }),
  T('title_cardking', 'Король карт', 'epic', 'Игры', { kind: 'level', level: 9 }),
  T('title_champion', 'Чемпион', 'epic', 'Стиль', { kind: 'level', level: 10 }),
  T('title_strategist', 'Стратег', 'epic', 'Игры', shop('epic')),
  T('title_pro', 'Про', 'rare', 'Стиль', shop('rare')),
  T('title_tryhard', 'Свитчер', 'epic', 'Стиль', shop('epic')),
  T('title_guru', 'Гуру игр', 'legendary', 'Стиль', { kind: 'level', level: 15 }),
  T('title_speedrunner', 'Спидранер', 'legendary', 'Стиль', { kind: 'level', level: 20 }),
  T('title_legend', 'Легенда хаба', 'legendary', 'Стиль', { kind: 'level', level: 25 }),
  T('title_immortal', 'Бессмертный', 'legendary', 'Стиль', shop('legendary')),
  T('title_goated', 'ГОАТ', 'mythic', 'Стиль', { kind: 'level', level: 30 }),
  T('title_vip', 'VIP', 'legendary', 'Топ', shop('legendary')),
  T('title_mythic', 'Мифический', 'mythic', 'Топ', shop('mythic')),
  T('title_founder', 'Основатель', 'mythic', 'Премиум', { kind: 'premium' }),
  T('title_whale', 'Кит', 'mythic', 'Премиум', { kind: 'premium' }),
]

export const COSMETICS: Cosmetic[] = [
  ...AVATAR_ITEMS, ...FRAME_ITEMS, ...HAT_ITEMS, ...EYEWEAR_ITEMS,
  ...EFFECT_ITEMS, ...COMPANION_ITEMS, ...BANNER_ITEMS, ...TITLE_ITEMS,
]

const BY_ID = new Map<string, Cosmetic>(COSMETICS.map(c => [c.id, c]))
export function cosmeticById(id: string | null | undefined): Cosmetic | undefined {
  return id ? BY_ID.get(id) : undefined
}
export function itemsForSlot(slot: Slot): Cosmetic[] {
  return COSMETICS.filter(c => c.slot === slot)
}

/** Слот → дефолтный (стартовый) предмет, когда у игрока ничего не надето. */
export const DEFAULT_EQUIP: Record<Slot, string> = {
  avatar: 'fox',
  frame: 'frame_none',
  hat: 'hat_none',
  eyewear: 'eye_none',
  effect: 'fx_none',
  companion: 'comp_none',
  banner: 'banner_blue',
  title: 'title_player',
}

/** Полный «образ» игрока — что надето во всех визуальных слотах. */
export interface Look {
  avatar: string
  frame: string
  hat: string
  eyewear: string
  effect: string
  companion: string
}

export const EMPTY_LOOK: Look = {
  avatar: DEFAULT_EQUIP.avatar,
  frame: DEFAULT_EQUIP.frame,
  hat: DEFAULT_EQUIP.hat,
  eyewear: DEFAULT_EQUIP.eyewear,
  effect: DEFAULT_EQUIP.effect,
  companion: DEFAULT_EQUIP.companion,
}

export interface OwnerCtx {
  level: number
  badges: Set<string>
  /** Явно полученные/купленные предметы. */
  owned: Set<string>
}

/** Открыт ли предмет игроку (доступен для надевания). */
export function isOwned(item: Cosmetic, ctx: OwnerCtx): boolean {
  if (ctx.owned.has(item.id)) return true
  switch (item.unlock.kind) {
    case 'starter': return true
    case 'level': return ctx.level >= item.unlock.level
    case 'badge': return ctx.badges.has(item.unlock.badge)
    case 'shop': return false
    case 'premium': return false
  }
}

/** Можно ли купить предмет за Game (товар магазина и ещё не куплен). */
export function shopPrice(item: Cosmetic): number | null {
  return item.unlock.kind === 'shop' ? item.unlock.price : null
}

/** Подпись условия для запертого предмета. */
export function unlockLabel(item: Cosmetic, badgeName: (id: string) => string): string {
  switch (item.unlock.kind) {
    case 'starter': return ''
    case 'level': return `Уровень ${item.unlock.level}`
    case 'badge': return `Значок «${badgeName(item.unlock.badge)}»`
    case 'shop': return `${item.unlock.price} Game`
    case 'premium': return 'Скоро'
  }
}
