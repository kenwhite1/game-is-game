import { create } from 'zustand'
import type { GameCard, Profile, ProfileDetail, Friend, ActivityItem, LeaderRow, Wardrobe, Slot } from '@shared/types'
import { GAMES, defaultLink } from '@shared/games'
import { api } from './api'
import { haptic, openGame as openGameLink, getStartParam, inTelegram } from './telegram'
import { playSfx, isSoundOn, setSoundOn } from './sound'

// Статичный каталог на случай, если сервер недоступен (гость, офлайн).
const STATIC_CATALOG: GameCard[] = GAMES.map(g => ({ ...g, link: defaultLink(g.bot) }))

export type Tab = 'home' | 'shop' | 'style' | 'friends' | 'profile'
type Sheet = 'about' | 'help' | 'settings' | 'editProfile' | null

interface S {
  ready: boolean
  tab: Tab
  profile: Profile | null
  catalog: GameCard[]
  recent: string[]
  detail: ProfileDetail | null
  friends: Friend[]
  activity: ActivityItem[]
  leaderboard: LeaderRow[]
  /** Сколько новых игроков пришло по моей ссылке-приглашению. */
  invited: number
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
  openSheet(s: Sheet): void
  toggleSound(): void
  showToast(msg: string): void

  loadSocial(): Promise<void>
  loadDetail(): Promise<void>
  loadWardrobe(): Promise<void>
  equip(slot: Slot, itemId: string): Promise<void>
  buy(itemId: string, name: string): Promise<boolean>
  addFriend(code: string): Promise<{ ok: boolean; error?: string; name?: string }>
  removeFriend(id: number): Promise<void>
  saveProfile(patch: { name: string }): Promise<void>
}

let toastTimer: ReturnType<typeof setTimeout> | null = null

export const useStore = create<S>((set, get) => ({
  ready: false,
  tab: 'home',
  profile: null,
  catalog: STATIC_CATALOG,
  recent: [],
  detail: null,
  friends: [],
  activity: [],
  leaderboard: [],
  invited: 0,
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
        botUsername: r.botUsername || get().botUsername,
        ready: true,
      })
      startParam = r.startParam
      referral = r.referral ?? null
    } catch {
      // гость или офлайн: показываем меню из публичного каталога или статики
      try {
        const r = await api.catalog()
        set({ catalog: r.catalog?.length ? r.catalog : STATIC_CATALOG, ready: true })
      } catch {
        set({ ready: true })
      }
      startParam = getStartParam()
    }

    // Код из диплинка: add_<CODE> (в друзья) или ref_<CODE> (приглашение).
    const inviteCode = startParam?.startsWith('add_') || startParam?.startsWith('ref_')
      ? startParam.slice(4)
      : null

    if (referral) {
      // Сервер уже засчитал приглашение: бонус начислен, дружба создана.
      set({ tab: 'friends' })
      void get().loadSocial()
      get().showToast(`${referral.by} пригласил(а) тебя: +${referral.bonus} Game 🎁`)
    } else if (inviteCode && get().profile) {
      // Старый игрок пришёл по ссылке: бонуса нет, но в друзья добавим.
      const res = await get().addFriend(inviteCode)
      if (res.ok) {
        set({ tab: 'friends' })
        get().showToast(`${res.name ?? 'Друг'} теперь в друзьях 🎉`)
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
    if (tab === 'profile') void get().loadDetail()
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
    }).catch(() => {})
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
    set({ toast: msg })
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => set({ toast: null }), 2400)
  },

  async loadSocial() {
    try {
      const r = await api.social()
      set({ friends: r.friends, activity: r.activity, leaderboard: r.leaderboard, invited: r.invited ?? 0, socialLoaded: true })
    } catch { /* офлайн — оставляем что есть */ }
  },

  async loadDetail() {
    try {
      const detail = await api.profileDetail()
      set({ detail, profile: detail.profile })
    } catch { /* офлайн */ }
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

  async buy(itemId, name) {
    try {
      const r = await api.buy(itemId)
      set({ profile: r.profile, wardrobe: r.wardrobe, socialLoaded: false, detail: null })
      haptic('success')
      get().showToast(`«${name}» куплено 🎉`)
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

  async saveProfile(patch) {
    try {
      const r = await api.updateProfile(patch)
      set({ profile: r.profile, sheet: null })
      // обновим производные данные
      void get().loadDetail()
      set({ socialLoaded: false })
      haptic('success')
      get().showToast('Профиль обновлён ✨')
    } catch {
      haptic('warn')
      get().showToast('Не удалось сохранить')
    }
  },
}))
