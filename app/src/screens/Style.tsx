import { useState } from 'react'
import { useStore } from '../store'
import { Avatar } from '../art/Avatar'
import { LockIcon, CheckIcon } from '../art/icons'
import { levelInfo } from '@shared/progression'
import { RARITY, cosmeticById, SLOTS, SLOT_RU, RECOLOR_COST, RECOLOR_STEPS, hueFilter } from '@shared/cosmetics'
import type { Slot, Cosmetic, BannerItem, TitleItem, Look, ColorItem } from '@shared/cosmetics'
import { colorOf } from '@shared/avatars'
import type { CosmeticState, Profile } from '@shared/types'
import { t } from '../i18n'

function bannerBg(id: string): string {
  const c = cosmeticById(id)
  return c && c.slot === 'banner' ? (c as BannerItem).bg : ''
}
export function profileLook(p: Profile): Look {
  return { color: p.color, face: p.face, frame: p.frame, hat: p.hat, eyewear: p.eyewear, effect: p.effect, companion: p.companion, recolors: p.recolors }
}

const NONE_IDS = new Set(['frame_none', 'hat_none', 'eye_none', 'fx_none', 'comp_none'])

export function Style() {
  const profile = useStore(s => s.profile)
  const wardrobe = useStore(s => s.wardrobe)
  const equip = useStore(s => s.equip)
  const buy = useStore(s => s.buy)
  const recolor = useStore(s => s.recolor)
  const setTab = useStore(s => s.setTab)
  const showToast = useStore(s => s.showToast)
  const [slot, setSlot] = useState<Slot>('color')

  if (!profile) {
    return <div className="tab-page"><div className="empty"><div className="em">✨</div><div className="t">{t('Загрузка стиля…')}</div></div></div>
  }

  const lv = levelInfo(profile.xp)
  const titleText = (cosmeticById(profile.title) as TitleItem | undefined)?.text ?? t('Игрок')
  const items = (wardrobe?.items ?? []).filter(i => i.item.slot === slot)
  const coins = wardrobe?.coins ?? profile.coins
  const look = profileLook(profile)

  const onPick = async (s: CosmeticState) => {
    if (s.equipped) return
    if (s.owned) { void equip(slot, s.item.id); return }
    if (s.price != null) {
      if (coins < s.price) { showToast(t('Не хватает Game 💰, загляни в Магазин')); return }
      const ok = await buy(s.item.id, s.item.name)
      if (ok) void equip(slot, s.item.id)
      return
    }
    showToast(s.lockLabel ? `${t('Откроется:')} ${t(s.lockLabel)}` : t('Этот предмет закрыт 🔒'))
  }

  return (
    <div className="tab-page stagger">
      <div className="topbar">
        <div className="hello"><div className="hi">{t('Хаб')}</div><div className="nm">{t('Аватар')}</div></div>
        <button className="coin-chip" onClick={() => setTab('shop')} aria-label={t('Магазин')}><span className="coin">G</span>{coins.toLocaleString('ru')}</button>
      </div>

      {/* живое превью всего образа */}
      <div className="banner preview" style={{ background: bannerBg(profile.banner) || undefined }}>
        <div className="banner-top">
          <Avatar look={look} seed={profile.id} size={64} ring={false} />
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div className="nm2">{profile.name}</div>
            <div className="tag2">{titleText}</div>
          </div>
          <span style={{ fontSize: 13, fontWeight: 900, background: 'rgba(255,255,255,.2)', padding: '6px 12px', borderRadius: 999, boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,.35)' }}>
            {t('Ур.')} {lv.level}
          </span>
        </div>
      </div>

      <div className="slot-strip">
        {SLOTS.map(s => (
          <button key={s} className={`slot-chip ${slot === s ? 'on' : ''}`} onClick={() => setSlot(s)}>{t(SLOT_RU[s])}</button>
        ))}
      </div>

      {slot === 'color' && (() => {
        // §10.6 перекраска тела: повороты оттенка активного цвета за 🪙 (0 — сброс).
        const bodyHex = colorOf(profile.color, profile.id).hex
        const rarity = (cosmeticById(profile.color) as ColorItem | undefined)?.rarity ?? 'common'
        const curHue = profile.recolors?.[profile.color] ?? 0
        return (
          <div className="recolor-row">
            <div className="rr-head">🎨 {t('Перекрасить тело')} <span className="sub">{RECOLOR_COST[rarity]} G · {t('сброс бесплатно')}</span></div>
            <div className="rr-sw-row">
              {Array.from({ length: RECOLOR_STEPS }, (_, i) => i * 30).map(h => (
                <button key={h} className={`rr-sw ${curHue === h ? 'on' : ''}`} onClick={() => void recolor(profile.color, h)}
                  style={{ background: bodyHex, filter: hueFilter(h) }} aria-label={h === 0 ? t('оригинал') : `${t('оттенок')} ${h}°`} />
              ))}
            </div>
          </div>
        )
      })()}

      {!wardrobe ? (
        <div className="empty"><div className="em">✨</div><div className="t">{t('Открываем гардероб…')}</div></div>
      ) : (
        <div className="cos-grid">
          {items.map(s => <CosmeticCell key={s.item.id} state={s} look={look} seed={profile.id} onPick={() => onPick(s)} />)}
        </div>
      )}
    </div>
  )
}

function CosmeticCell({ state, look, seed, onPick }: { state: CosmeticState; look: Look; seed: number; onPick(): void }) {
  const { item, owned, equipped, price, lockLabel } = state
  const rc = RARITY[item.rarity]
  const buyable = !owned && price != null
  return (
    <button
      className={`cos ${equipped ? 'eq' : ''} ${owned ? '' : 'locked'}`}
      style={{ ['--rar' as string]: rc.color }}
      onClick={onPick}
      aria-label={item.name}
    >
      <span className="cos-art"><Swatch item={item} look={look} seed={seed} /></span>
      <span className="cos-name">{t(item.name)}</span>
      <span className="cos-rar" style={{ color: rc.color }}>{t(rc.label)}</span>
      {equipped && <span className="cos-check"><CheckIcon /></span>}
      {buyable && <span className="cos-buy"><span className="coin">G</span>{price}</span>}
      {!owned && !buyable && (
        <span className="cos-lock"><LockIcon /><span>{lockLabel ? t(lockLabel) : ''}</span></span>
      )}
    </button>
  )
}

// Свотч показывает предмет НА персонаже игрока, чтобы было видно, как он сидит.
export function Swatch({ item, look, seed }: { item: Cosmetic; look: Look; seed: number }) {
  if (NONE_IDS.has(item.id)) return <span className="sw-none">{t('нет')}</span>
  if (item.slot === 'color') return <Avatar color={item.id} face={look.face} seed={seed} size={50} />
  if (item.slot === 'face') return <Avatar color={look.color} face={item.id} seed={seed} size={50} />
  if (item.slot === 'banner') return <span className="sw-banner" style={{ background: (item as BannerItem).bg }} />
  if (item.slot === 'title') return <span className="sw-title">{(item as TitleItem).text}</span>
  return <Avatar look={{ ...look, [item.slot]: item.id }} seed={seed} size={50} />
}
