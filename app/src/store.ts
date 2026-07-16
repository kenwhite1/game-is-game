import { create } from 'zustand'
import type { GameCard, GameMeta, Profile, ProfileDetail, Friend, ActivityItem, LeaderRow, Wardrobe, Slot, RatingValue, Quest } from '@shared/types'
import type { AchievementsPayload } from '@shared/achievements'
import type { CoopView } from '@shared/coop'
import type { FriendStreak } from './api'
import type { SeasonView } from '@shared/season'
import type { FestivalView } from '@shared/festival'
import type { RankedView, Boards } from '@shared/ranked'
import type { MarketView } from '@shared/market'
import type { ClanView, ClanBoardRow } from '@shared/clans'
import type { CollectionView } from '@shared/cosmetics'
import { GAMES, defaultLink } from '@shared/games'
import { api } from './api'
import { haptic, openGame as openGameLink, openInvoice, getStartParam, inTelegram, shareInvite } from './telegram'
import { playSfx, isSoundOn, setSoundOn } from './sound'
import { t, setLang, getLang } from './i18n'

// Статичный каталог на случай, если сервер недоступен (гость, офлайн).
const STATIC_CATALOG: GameCard[] = GAMES.map(g => ({ ...g, link: defaultLink(g.bot) }))

export type Tab = 'home' | 'shop' | 'style' | 'friends' | 'profile'
type Sheet = 'about' | 'help' | 'settings' | 'editProfile' | 'season' | 'festival' | 'boards' | 'market' | 'clan' | 'collections' | null

interface S {
  ready: boolean
  tab: Tab
  profile: Profile | null
  catalog: GameCard[]
  recent: string[]
  favorites: string[]
  ratings: Record<string, RatingValue>
  follows: string[]
  boughtPacks: string[]
  meta: Record<string, GameMeta>
  quests: Quest[]
  weeklyQuests: Quest[]
  rerollsLeft: number
  /** id игры, открытой в карточке-шторке (null = закрыто). */
  gameSheet: string | null
  detail: ProfileDetail | null
  achievements: AchievementsPayload | null
  season: SeasonView | null
  festival: FestivalView | null
  ranked: RankedView | null
  boards: Boards | null
  market: MarketView | null
  clan: ClanView | null
  clanBoard: ClanBoardRow[]
  collections: CollectionView[]
  friends: Friend[]
  activity: ActivityItem[]
  leaderboard: LeaderRow[]
  /** Сколько новых игроков пришло по моей ссылке-приглашению. */
  invited: number
  coop: CoopView[]
  friendStreaks: FriendStreak[]
  socialLoaded: boolean
  wardrobe: Wardrobe | null
  wardrobeLoaded: boolean
  sheet: Sheet
  soundOn: boolean
  toast: string | null
  botUsername: string

  init(): Promise<void>
  setTab(t: Tab): void
  launch(card: GameCard): void
  openGameSheet(id: string | null): void
  toggleFavorite(id: string): Promise<void>
  toggleFollow(id: string): Promise<void>
  rate(id: string, value: RatingValue | 0): Promise<void>
  refreshQuests(): Promise<void>
  claimQuest(id: string): Promise<void>
  rerollQuest(id: string): Promise<void>
  buyCoins(packId: string): Promise<void>
  gift(friendId: number, amount: number): Promise<{ ok: boolean; error?: string }>
  giftCosmetic(friendId: number, itemId: string): Promise<{ ok: boolean; error?: string }>
  coopStart(friendId: number): Promise<void>
  coopClaim(id: number): Promise<void>
  nudgeFriend(friendId: number): Promise<void>
  openSheet(s: Sheet): void
  toggleSound(): void
  showToast(msg: string): void

  loadSocial(): Promise<void>
  loadDetail(): Promise<void>
  prestige(): Promise<void>
  repairStreak(method: 'pay' | 'play'): Promise<void>
  loadAchievements(): Promise<void>
  loadSeason(): Promise<void>
  claimSeasonTier(tier: number, track: 'free' | 'premium'): Promise<void>
  buyPremium(): Promise<void>
  buyPremiumPlus(): Promise<void>
  buyTierBoost(): Promise<void>
  loadFestival(): Promise<void>
  claimEventQuest(questId: string): Promise<void>
  claimCommunity(): Promise<void>
  buyEventItem(itemId: string): Promise<void>
  loadBoards(): Promise<void>
  loadMarket(): Promise<void>
  listItem(itemId: string, price: number): Promise<void>
  buyListing(listingId: number): Promise<void>
  cancelListing(listingId: number): Promise<void>
  loadCollections(): Promise<void>
  claimCollection(name: string): Promise<void>
  loadClan(): Promise<void>
  createClan(name: string, tag: string): Promise<void>
  joinClan(clanId: number): Promise<void>
  leaveClan(): Promise<void>
  claimClanWeekly(): Promise<void>
  loadWardrobe(): Promise<void>
  equip(slot: Slot, itemId: string): Promise<void>
  recolor(itemId: string, hue: number): Promise<void>
  buy(itemId: string, name: string): Promise<boolean>
  addFriend(code: string): Promise<{ ok: boolean; error?: string; name?: string }>
  removeFriend(id: number): Promise<void>
  acceptChallenge(fromId: number, gameId: string): Promise<{ ok: boolean; reward: number } | null>
  challengeFriend(friend: Friend): void
  chooseUsername(username: string): Promise<{ ok: boolean; error?: string }>
}

let toastTimer: ReturnType<typeof setTimeout> | null = null

export const useStore = create<S>((set, get) => ({
  ready: false,
  tab: 'home',
  profile: null,
  catalog: STATIC_CATALOG,
  recent: [],
  favorites: [],
  ratings: {},
  follows: [],
  boughtPacks: [],
  meta: {},
  quests: [],
  weeklyQuests: [],
  rerollsLeft: 1,
  gameSheet: null,
  detail: null,
  achievements: null,
  season: null,
  festival: null,
  ranked: null,
  boards: null,
  market: null,
  clan: null,
  clanBoard: [],
  collections: [],
  friends: [],
  activity: [],
  leaderboard: [],
  invited: 0,
  coop: [],
  friendStreaks: [],
  socialLoaded: false,
  wardrobe: null,
  wardrobeLoaded: false,
  sheet: null,
  soundOn: isSoundOn(),
  toast: null,
  botUsername: 'game_is_game_bot',

  async init() {
    let startParam: string | null = null
    let referral: { by: string; bonus: number } | null = null
    try {
      const r = await api.auth()
      set({
        profile: r.profile,
        catalog: r.catalog?.length ? r.catalog : STATIC_CATALOG,
        recent: r.recent ?? [],
        favorites: r.favorites ?? [],
        ratings: r.ratings ?? {},
        follows: r.follows ?? [],
        boughtPacks: r.boughtPacks ?? [],
        meta: r.meta ?? {},
        quests: r.quests ?? [],
        botUsername: r.botUsername || get().botUsername,
        ready: true,
      })
      // Синхронизация языка: если на этом устройстве выбор ещё не сделан,
      // применяем сохранённый серверный язык (кросс-девайс, общий с ботом).
      try {
        if (!localStorage.getItem('gg_lang') && r.profile?.lang) setLang(r.profile.lang)
      } catch { /* private mode */ }
      startParam = r.startParam
      referral = r.referral ?? null
      // Друзья нужны уже на «Доме» (полка «Друзья в сети»), грузим сразу.
      void get().loadSocial()
      // Догружаем недельные квесты и счётчик рероллов (auth отдаёт только дневные).
      void get().refreshQuests()
      // Прогресс сезонного пропуска для карточки на «Доме».
      void get().loadSeason()
      // Активное событие (если идёт) — для баннера на «Доме».
      void get().loadFestival()
    } catch {
      // гость или офлайн: показываем меню из публичного каталога или статики
      try {
        const r = await api.catalog()
        set({ catalog: r.catalog?.length ? r.catalog : STATIC_CATALOG, meta: r.meta ?? {}, ready: true })
      } catch {
        set({ ready: true })
      }
      startParam = getStartParam()
    }

    // Код из диплинка: add_<CODE> (в друзья) или ref_<CODE> (приглашение).
    const inviteCode = startParam?.startsWith('add_') || startParam?.startsWith('ref_')
      ? startParam.slice(4)
      : null

    // Вызов другу: chl_<gameId>_<fromId> — награда обоим и сразу запуск игры.
    const challenge = startParam?.startsWith('chl_')
      ? (() => {
          const rest = startParam.slice(4)
          const us = rest.lastIndexOf('_')
          if (us <= 0) return null
          const gameId = rest.slice(0, us)
          const fromId = Number(rest.slice(us + 1))
          return Number.isInteger(fromId) && fromId > 0 ? { gameId, fromId } : null
        })()
      : null

    if (referral) {
      // Дружба создана; бонус придёт после квалификации новичка (5 игр).
      set({ tab: 'friends' })
      void get().loadSocial()
      get().showToast(`${referral.by} ${t('пригласил(а) тебя! Сыграй 5 игр и получишь')} +${referral.bonus} Game 🎁`)
    } else if (challenge && get().profile) {
      // Принимаем вызов: награда обоим, затем открываем игру.
      try {
        const r = await get().acceptChallenge(challenge.fromId, challenge.gameId)
        if (r?.ok) get().showToast(`${t('Вызов принят:')} +${r.reward} Game ⚔️`)
      } catch { /* ignore */ }
      const card = get().catalog.find(g => g.id === challenge.gameId)
      if (card && inTelegram) get().launch(card)
    } else if (inviteCode && get().profile) {
      // Старый игрок пришёл по ссылке: бонуса нет, но в друзья добавим.
      const res = await get().addFriend(inviteCode)
      if (res.ok) {
        set({ tab: 'friends' })
        get().showToast(`${res.name ?? t('Друг')} ${t('теперь в друзьях 🎉')}`)
      }
    } else if (startParam && get().catalog.some(g => g.id === startParam) && inTelegram) {
      // Прямая ссылка на игру через хаб: ?startapp=<gameId>
      const card = get().catalog.find(g => g.id === startParam)
      if (card) get().launch(card)
    }
  },

  setTab(tab) {
    if (tab === get().tab) return
    haptic('select')
    set({ tab })
    if (tab === 'friends' && !get().socialLoaded) void get().loadSocial()
    if (tab === 'profile') { void get().loadDetail(); void get().loadAchievements() }
    if ((tab === 'style' || tab === 'shop') && !get().wardrobeLoaded) void get().loadWardrobe()
  },

  launch(card) {
    haptic('heavy')
    if (get().soundOn) playSfx('open')
    set({ recent: [card.id, ...get().recent.filter(id => id !== card.id)] })
    // Открываем игру СРАЗУ, синхронно в обработчике нажатия: Telegram игнорирует
    // openTelegramLink, вызванный с задержкой (теряется «жест пользователя»).
    openGameLink(card.link)
    // Фиксируем открытие на сервере в фоне, не блокируя запуск.
    api.open(card.id).then(r => {
      set({ profile: r.profile, recent: r.recent, socialLoaded: false, detail: null })
      // Запуск мог продвинуть задания дня.
      void get().refreshQuests()
    }).catch(() => {})
  },

  async refreshQuests() {
    try {
      const r = await api.quests()
      set({ quests: r.quests, weeklyQuests: r.weekly, rerollsLeft: r.rerollsLeft })
    } catch { /* офлайн */ }
  },

  async claimQuest(id) {
    try {
      const r = await api.claimQuest(id)
      set({ profile: r.profile, quests: r.quests, weeklyQuests: r.weekly })
      haptic('success')
      if (get().soundOn) playSfx('open')
      get().showToast(`${t('Задание выполнено:')} +${r.reward} Game 🎉`)
    } catch (e) {
      haptic('warn')
      const reason = (e as { message?: string }).message
      get().showToast(reason === 'claimed' ? 'Награда уже получена' : 'Задание ещё не выполнено')
      void get().refreshQuests()
    }
  },

  async rerollQuest(id) {
    try {
      const r = await api.rerollQuest(id)
      set({ quests: r.quests, profile: r.profile, rerollsLeft: r.rerollsLeft })
      haptic('select')
      if (get().soundOn) playSfx('tap')
      get().showToast(r.free ? 'Задание заменено' : `${t('Задание заменено')} · −50 Game`)
    } catch (e) {
      haptic('warn')
      get().showToast((e as { message?: string }).message === 'too_poor' ? 'Не хватает Game на реролл' : 'Не удалось заменить')
    }
  },

  async buyCoins(packId) {
    try {
      const { link } = await api.walletInvoice(packId)
      const opened = openInvoice(link, status => {
        if (status !== 'paid') return
        haptic('success')
        get().showToast('Оплата прошла: Game уже на балансе 🎉')
        // Баланс обновил бот по вебхуку; забираем свежий профиль.
        api.profile().then(r => set({ profile: r.profile, wardrobeLoaded: false })).catch(() => {})
      })
      if (!opened) get().showToast('Пополнение работает внутри Telegram')
    } catch (e) {
      haptic('warn')
      const reason = (e as { message?: string }).message
      get().showToast(reason === 'unavailable' ? 'Пополнение работает внутри Telegram' : 'Не получилось открыть счёт')
    }
  },

  async gift(friendId, amount) {
    try {
      const r = await api.gift(friendId, amount)
      set({ profile: r.profile, friends: r.friends })
      haptic('success')
      return { ok: true }
    } catch (e) {
      haptic('warn')
      return { ok: false, error: (e as { message?: string }).message ?? 'request_failed' }
    }
  },

  async giftCosmetic(friendId, itemId) {
    try {
      await api.giftCosmetic(friendId, itemId)
      // Предмет ушёл из моего гардероба — перезагрузим при следующем открытии.
      set({ wardrobeLoaded: false })
      haptic('success')
      return { ok: true }
    } catch (e) {
      haptic('warn')
      return { ok: false, error: (e as { message?: string }).message ?? 'request_failed' }
    }
  },

  async nudgeFriend(friendId) {
    try {
      await api.nudgeFriend(friendId)
      set({ friendStreaks: get().friendStreaks.map(f => f.friendId === friendId ? { ...f, canNudge: false } : f) })
      haptic('success')
      get().showToast('Друг получил напоминание 🔥🤝')
    } catch {
      haptic('warn')
      get().showToast('Уже напоминал(а) сегодня')
    }
  },

  async coopStart(friendId) {
    try {
      const r = await api.coopStart(friendId)
      set({ coop: r.coop })
      haptic('success')
      get().showToast('Кооп-квест начат 🤝 Играйте вместе!')
    } catch (e) {
      haptic('warn')
      get().showToast((e as { message?: string }).message === 'not_friends' ? 'Сначала добавь в друзья' : 'Не удалось начать')
    }
  },

  async coopClaim(id) {
    try {
      const r = await api.coopClaim(id)
      set({ profile: r.profile, coop: r.coop })
      haptic('success')
      if (get().soundOn) playSfx('open')
      get().showToast('Кооп-награда получена 🤝')
    } catch (e) {
      haptic('warn')
      get().showToast((e as { message?: string }).message === 'not_done' ? 'Цель ещё не достигнута' : 'Не удалось')
    }
  },

  openGameSheet(id) {
    if (id) {
      haptic('tap')
      if (get().soundOn) playSfx('tap')
    }
    set({ gameSheet: id })
  },

  async toggleFavorite(id) {
    // Оптимистично: звёздочка должна отзываться мгновенно.
    const was = get().favorites
    const next = was.includes(id) ? was.filter(f => f !== id) : [id, ...was]
    set({ favorites: next })
    haptic('select')
    try {
      const r = await api.toggleFavorite(id)
      set({ favorites: r.favorites })
    } catch {
      set({ favorites: was })
      get().showToast('Не удалось обновить избранное')
    }
  },

  async toggleFollow(id) {
    const was = get().follows
    const next = was.includes(id) ? was.filter(f => f !== id) : [id, ...was]
    set({ follows: next })
    haptic('select')
    try {
      const r = await api.toggleFollow(id)
      set({ follows: r.follows, meta: r.meta })
      if (r.following) get().showToast('Подпишем на новости этой игры 🔔')
    } catch {
      set({ follows: was })
      get().showToast('Не удалось обновить подписку')
    }
  },

  async rate(id, value) {
    const wasRatings = get().ratings
    const nextRatings = { ...wasRatings }
    if (value === 0) delete nextRatings[id]
    else nextRatings[id] = value
    set({ ratings: nextRatings })
    haptic('select')
    try {
      const r = await api.rate(id, value)
      set({ ratings: r.ratings, meta: r.meta })
    } catch {
      set({ ratings: wasRatings })
      get().showToast('Не удалось сохранить оценку')
    }
  },

  openSheet(sheet) {
    haptic('tap')
    if (get().soundOn) playSfx('tap')
    set({ sheet })
  },

  toggleSound() {
    const next = !get().soundOn
    setSoundOn(next)
    set({ soundOn: next })
    haptic('select')
  },

  showToast(msg) {
    // t() переводит известные строки, а неизвестные (например с интерполяцией) отдаёт как есть.
    set({ toast: t(msg) })
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => set({ toast: null }), 2400)
  },

  async loadSocial() {
    try {
      const r = await api.social()
      set({ friends: r.friends, activity: r.activity, leaderboard: r.leaderboard, invited: r.invited ?? 0, coop: r.coop ?? [], friendStreaks: r.friendStreaks ?? [], socialLoaded: true })
    } catch { /* офлайн — оставляем что есть */ }
  },

  async loadDetail() {
    try {
      const detail = await api.profileDetail()
      set({ detail, profile: detail.profile })
    } catch { /* офлайн */ }
  },

  async prestige() {
    try {
      const r = await api.prestige()
      set({ profile: r.profile })
      void get().loadDetail()
      haptic('success')
      if (get().soundOn) playSfx('open')
      get().showToast(`${t('Престиж')} ${r.profile.prestige} ⭐ ${t('Уровень сброшен, вперёд по новой!')}`)
    } catch (e) {
      haptic('warn')
      get().showToast((e as { message?: string }).message === 'too_low' ? 'Престиж откроется на 100 уровне' : 'Не удалось')
    }
  },

  async repairStreak(method) {
    try {
      const r = await api.repairStreak(method)
      set({ profile: r.profile })
      haptic('success')
      get().showToast(`${t('Серия восстановлена 🔧🔥')} ${r.profile.streak} ${t('дней')}`)
    } catch (e) {
      haptic('warn')
      const msg = (e as { message?: string }).message
      get().showToast(msg === 'too_poor' ? 'Не хватает Game на ремонт' : msg === 'need_plays' ? 'Сыграй 3 матча для бесплатного ремонта' : 'Окно ремонта закрыто')
    }
  },

  async loadAchievements() {
    try {
      set({ achievements: await api.achievements() })
    } catch { /* офлайн */ }
  },

  async loadSeason() {
    try {
      const r = await api.season()
      set({ season: r.season })
    } catch { /* офлайн */ }
  },

  async claimSeasonTier(tier, track) {
    try {
      const r = await api.claimSeasonTier(tier, track)
      set({ season: r.season, profile: r.profile })
      haptic('success')
      if (get().soundOn) playSfx('open')
      const rw = r.reward
      const label = rw.kind === 'coins' ? `+${rw.amount} Game` : rw.kind === 'freeze' ? `+${rw.count} ${t('заморозка')}` : t('предмет')
      get().showToast(`${t('Награда получена:')} ${label} 🎉`)
    } catch (e) {
      haptic('warn')
      const reason = (e as { message?: string }).message
      get().showToast(reason === 'no_premium' ? 'Нужен премиум-пропуск' : reason === 'locked' ? 'Тир ещё не открыт' : 'Награда уже получена')
    }
  },

  async buyPremium() {
    try {
      const { link } = await api.passInvoice()
      const opened = openInvoice(link, status => {
        if (status !== 'paid') return
        haptic('success')
        get().showToast('Премиум-пропуск активирован ✨')
        void get().loadSeason()
      })
      if (!opened) get().showToast('Покупка пропуска работает внутри Telegram')
    } catch {
      haptic('warn')
      get().showToast('Не получилось открыть счёт')
    }
  },

  async buyPremiumPlus() {
    try {
      const { link } = await api.passPlusInvoice()
      const opened = openInvoice(link, status => {
        if (status !== 'paid') return
        haptic('success')
        get().showToast('Пропуск+ активирован ✨ +10 тиров!')
        void get().loadSeason()
      })
      if (!opened) get().showToast('Покупка пропуска работает внутри Telegram')
    } catch {
      haptic('warn')
      get().showToast('Не получилось открыть счёт')
    }
  },

  async buyTierBoost() {
    try {
      const { link } = await api.boostInvoice()
      const opened = openInvoice(link, status => {
        if (status !== 'paid') return
        haptic('success')
        get().showToast('Буст засчитан 🚀 тиры прибавились!')
        void get().loadSeason()
      })
      if (!opened) get().showToast('Буст работает внутри Telegram')
    } catch {
      haptic('warn')
      get().showToast('Не получилось открыть счёт')
    }
  },

  async loadFestival() {
    try {
      const r = await api.festival()
      set({ festival: r.festival })
    } catch { /* офлайн */ }
  },

  async loadBoards() {
    try {
      const [b, r] = await Promise.all([api.boards(), api.ranked()])
      set({ boards: b.boards, ranked: r.ranked })
    } catch { /* офлайн */ }
  },

  async loadMarket() {
    try {
      const r = await api.market()
      set({ market: r.market })
    } catch { /* офлайн */ }
  },

  async listItem(itemId, price) {
    try {
      const r = await api.listItem(itemId, price)
      set({ market: r.market, wardrobeLoaded: false })
      haptic('success')
      get().showToast('Лот выставлен 🏷️')
    } catch (e) {
      haptic('warn')
      const m = (e as { message?: string }).message
      get().showToast(m === 'trade_hold' ? 'Сыграй больше игр, чтобы торговать' : m === 'bad_price' ? 'Цена вне допустимых границ' : m === 'rate_limit' ? 'Лимит лотов на сегодня' : 'Не удалось выставить')
    }
  },

  async buyListing(listingId) {
    try {
      const r = await api.buyListing(listingId)
      set({ market: r.market, profile: r.profile, wardrobeLoaded: false })
      haptic('success')
      if (get().soundOn) playSfx('open')
      get().showToast('Куплено на барахолке 🎉')
    } catch (e) {
      haptic('warn')
      const m = (e as { message?: string }).message
      get().showToast(m === 'too_poor' ? 'Не хватает Game' : m === 'gone' ? 'Лот уже продан' : 'Не удалось купить')
    }
  },

  async cancelListing(listingId) {
    try {
      const r = await api.cancelListing(listingId)
      set({ market: r.market, wardrobeLoaded: false })
      haptic('tap')
      get().showToast('Лот снят')
    } catch { haptic('warn'); get().showToast('Не удалось снять лот') }
  },

  async loadCollections() {
    try {
      const r = await api.collections()
      set({ collections: r.collections })
    } catch { /* офлайн */ }
  },

  async claimCollection(name) {
    try {
      const r = await api.claimCollection(name)
      set({ collections: r.collections, profile: r.profile })
      haptic('success')
      if (get().soundOn) playSfx('open')
      get().showToast(`${t('Коллекция собрана:')} +${r.bonus} Game 🎉`)
    } catch (e) {
      haptic('warn')
      get().showToast((e as { message?: string }).message === 'claimed' ? 'Уже получено' : 'Коллекция ещё не собрана')
    }
  },

  async loadClan() {
    try {
      const r = await api.clan()
      set({ clan: r.clan, clanBoard: r.board })
    } catch { /* офлайн */ }
  },

  async createClan(name, tag) {
    try {
      const r = await api.clanCreate(name, tag)
      set({ clan: r.clan, clanBoard: r.board, profile: r.profile })
      haptic('success')
      get().showToast(`${t('Команда')} «${r.clan.name}» ${t('создана 🛡️')}`)
    } catch (e) {
      haptic('warn')
      const m = (e as { message?: string }).message
      get().showToast(m === 'tag_taken' ? 'Такой тег занят' : m === 'in_clan' ? 'Ты уже в команде' : 'Проверь название и тег')
    }
  },

  async joinClan(clanId) {
    try {
      const r = await api.clanJoin(clanId)
      set({ clan: r.clan, clanBoard: r.board })
      haptic('success')
      get().showToast(`${t('Ты в команде')} «${r.clan.name}» 🎉`)
    } catch (e) {
      haptic('warn')
      const m = (e as { message?: string }).message
      get().showToast(m === 'full' ? 'В команде нет мест' : m === 'in_clan' ? 'Ты уже в команде' : 'Не удалось вступить')
    }
  },

  async leaveClan() {
    try {
      const r = await api.clanLeave()
      set({ clan: r.clan, clanBoard: r.board })
      haptic('tap')
      get().showToast('Ты покинул(а) команду')
    } catch { haptic('warn') }
  },

  async claimClanWeekly() {
    try {
      const r = await api.clanClaimWeekly()
      set({ clan: r.clan, profile: r.profile })
      haptic('success')
      get().showToast('Награда команды получена 🎉')
    } catch (e) {
      haptic('warn')
      get().showToast((e as { message?: string }).message === 'claimed' ? 'Уже получено' : 'Цель ещё не достигнута')
    }
  },

  async claimEventQuest(questId) {
    try {
      const r = await api.claimEventQuest(questId)
      set({ festival: r.festival })
      haptic('success')
      if (get().soundOn) playSfx('open')
      get().showToast(`${t('Награда события:')} +${r.tokens} 🎟`)
    } catch (e) {
      haptic('warn')
      get().showToast((e as { message?: string }).message === 'claimed' ? 'Уже получено' : 'Задание ещё не выполнено')
    }
  },

  async claimCommunity() {
    try {
      const r = await api.claimCommunity()
      set({ festival: r.festival, wardrobeLoaded: false })
      haptic('success')
      get().showToast('Награда сообщества получена 🎉')
    } catch (e) {
      haptic('warn')
      get().showToast((e as { message?: string }).message === 'claimed' ? 'Уже получено' : 'Цель ещё не достигнута')
    }
  },

  async buyEventItem(itemId) {
    try {
      const r = await api.buyEventItem(itemId)
      set({ festival: r.festival, wardrobeLoaded: false })
      haptic('success')
      get().showToast('Куплено за 🎟')
    } catch (e) {
      haptic('warn')
      get().showToast((e as { message?: string }).message === 'too_poor' ? 'Не хватает 🎟' : 'Не удалось купить')
    }
  },

  async loadWardrobe() {
    try {
      const wardrobe = await api.cosmetics()
      set({ wardrobe, wardrobeLoaded: true })
    } catch { /* офлайн */ }
  },

  async equip(slot, itemId) {
    try {
      const r = await api.equip(slot, itemId)
      // обновляем профиль (баннер/рамка/титул живьём) и гардероб; соц-данные
      // и детали профиля пересчитаем при следующем заходе.
      set({ profile: r.profile, wardrobe: r.wardrobe, socialLoaded: false, detail: null })
      haptic('success')
    } catch (e) {
      haptic('warn')
      const reason = (e as { message?: string }).message
      get().showToast(reason === 'locked' ? 'Этот предмет ещё закрыт' : 'Не удалось надеть')
    }
  },

  async recolor(itemId, hue) {
    try {
      const r = await api.recolor(itemId, hue)
      set({ profile: r.profile, wardrobe: r.wardrobe, socialLoaded: false, detail: null })
      haptic('success')
    } catch (e) {
      haptic('warn')
      get().showToast((e as { message?: string }).message === 'too_poor' ? 'Не хватает Game на перекраску' : 'Не удалось перекрасить')
    }
  },

  async buy(itemId, name) {
    try {
      const r = await api.buy(itemId)
      set({ profile: r.profile, wardrobe: r.wardrobe, socialLoaded: false, detail: null })
      haptic('success')
      get().showToast(`«${t(name)}» ${t('куплено 🎉')}`)
      return true
    } catch (e) {
      haptic('warn')
      get().showToast((e as { message?: string }).message === 'too_poor' ? 'Не хватает Game' : 'Покупка не удалась')
      return false
    }
  },

  async addFriend(code) {
    try {
      const r = await api.addFriend(code)
      set({ friends: r.friends, socialLoaded: true })
      haptic('success')
      return { ok: true, name: r.friend.name }
    } catch (e) {
      haptic('warn')
      return { ok: false, error: (e as { message?: string }).message ?? 'request_failed' }
    }
  },

  async removeFriend(id) {
    try {
      const r = await api.removeFriend(id)
      set({ friends: r.friends })
      haptic('tap')
    } catch { /* ignore */ }
  },

  async acceptChallenge(fromId, gameId) {
    try {
      const r = await api.acceptChallenge(fromId, gameId)
      set({ profile: r.profile })
      return { ok: true, reward: r.reward }
    } catch { return null }
  },

  challengeFriend(friend) {
    const profile = get().profile
    if (!profile) return
    // Игра для вызова: последняя игра друга либо флагман каталога.
    const gameId = friend.playing ?? friend.lastGame ?? get().catalog[0]?.id
    const card = get().catalog.find(g => g.id === gameId)
    if (!card) return
    haptic('tap')
    shareInvite(
      `https://t.me/${get().botUsername}?startapp=chl_${card.id}_${profile.id}`,
      getLang() === 'en'
        ? `I challenge you in “${card.name}” 🎮 Who wins?`
        : `Бросаю тебе вызов в «${card.name}» 🎮 Кто кого?`,
    )
  },

  async chooseUsername(username) {
    try {
      const r = await api.setUsername(username)
      set({ profile: r.profile, sheet: null, socialLoaded: false })
      // обновим производные данные (профиль, лидерборд показывают ник)
      void get().loadDetail()
      haptic('success')
      get().showToast(`${t('Ник')} @${r.profile.username} ${t('закреплён ✨')}`)
      return { ok: true }
    } catch (e) {
      haptic('warn')
      return { ok: false, error: (e as { message?: string }).message ?? 'request_failed' }
    }
  },
}))
