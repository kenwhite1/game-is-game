import { useState } from 'react'
import { useStore } from '../store'
import { Avatar } from '../art/Avatar'
import { LockIcon, CheckIcon } from '../art/icons'
import { levelInfo } from '@shared/progression'
import { RARITY, cosmeticById, SLOTS, SLOT_RU } from '@shared/cosmetics'
import type { Slot, Cosmetic, BannerItem, TitleItem, Look } from '@shared/cosmetics'
import type { CosmeticState } from '@shared/types'

function bannerBg(id: string): string {
  const c = cosmeticById(id)
  return c && c.slot === 'banner' ? (c as BannerItem).bg : ''
}
function profileLook(p: { avatar: string; frame: string; hat: string; eyewear: string; effect: string; companion: string }): Look {
  return { avatar: p.avatar, frame: p.frame, hat: p.hat, eyewear: p.eyewear, effect: p.effect, companion: p.companion }
}

export function Style() {
  const profile = useStore(s => s.profile)
  const wardrobe = useStore(s => s.wardrobe)
  const equip = useStore(s => s.equip)
  const buy = useStore(s => s.buy)
  const showToast = useStore(s => s.showToast)
  const [slot, setSlot] = useState<Slot>('avatar')

  if (!profile) {
    return <div className="tab-page"><div className="empty"><div className="em">✨</div><div className="t">Загрузка стиля…</div></div></div>
  }

  const lv = levelInfo(profile.xp)
  const titleText = (cosmeticById(profile.title) as TitleItem | undefined)?.text ?? 'Игрок'
  const items = (wardrobe?.items ?? []).filter(i => i.item.slot === slot)
  const coins = wardrobe?.coins ?? profile.coins

  const onPick = async (s: CosmeticState) => {
    if (s.equipped) return
    if (s.owned) { void equip(slot, s.item.id); return }
    if (s.price != null) {
      if (coins < s.price) { showToast('Не хватает Game 💰'); return }
      const ok = await buy(s.item.id, s.item.name)
      if (ok) void equip(slot, s.item.id) // купил — сразу надеваем
      return
    }
    showToast(s.lockLabel ? `Откроется: ${s.lockLabel}` : 'Этот предмет закрыт 🔒')
  }

  return (
    <div className="tab-page stagger">
      <div className="topbar">
        <div className="hello"><div className="hi">Хаб</div><div className="nm">Стиль</div></div>
        <span className="coin-chip" style={{ cursor: 'default' }}><span className="coin">G</span>{coins.toLocaleString('ru')}</span>
      </div>

      {/* live preview — весь образ целиком */}
      <div className="banner preview" style={{ background: bannerBg(profile.banner) || undefined }}>
        <div className="banner-top">
          <Avatar look={profileLook(profile)} seed={profile.id} size={62} ring={false} />
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div className="nm2">{profile.name}</div>
            <div className="tag2">{titleText}</div>
          </div>
          <span style={{ fontSize: 13, fontWeight: 900, background: 'rgba(255,255,255,.2)', padding: '6px 12px', borderRadius: 999, boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,.35)' }}>
            Ур. {lv.level}
          </span>
        </div>
      </div>

      <div className="slot-strip">
        {SLOTS.map(s => (
          <button key={s} className={`slot-chip ${slot === s ? 'on' : ''}`} onClick={() => setSlot(s)}>{SLOT_RU[s]}</button>
        ))}
      </div>

      {!wardrobe ? (
        <div className="empty"><div className="em">✨</div><div className="t">Открываем гардероб…</div></div>
      ) : (
        <div className="cos-grid">
          {items.map(s => <CosmeticCell key={s.item.id} state={s} look={profileLook(profile)} seed={profile.id} onPick={() => onPick(s)} />)}
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
      <span className="cos-name">{item.name}</span>
      <span className="cos-rar" style={{ color: rc.color }}>{rc.label}</span>
      {equipped && <span className="cos-check"><CheckIcon /></span>}
      {buyable && <span className="cos-buy"><span className="coin">G</span>{price}</span>}
      {!owned && !buyable && (
        <span className="cos-lock"><LockIcon /><span>{lockLabel}</span></span>
      )}
    </button>
  )
}

const NONE_IDS = new Set(['frame_none', 'hat_none', 'eye_none', 'fx_none', 'comp_none'])

// Свотч показывает предмет НА персонаже игрока, чтобы было видно, как он сидит.
function Swatch({ item, look, seed }: { item: Cosmetic; look: Look; seed: number }) {
  if (NONE_IDS.has(item.id)) return <span className="sw-none">нет</span>
  if (item.slot === 'avatar') return <Avatar avatar={item.id} seed={seed} size={50} />
  if (item.slot === 'banner') return <span className="sw-banner" style={{ background: (item as BannerItem).bg }} />
  if (item.slot === 'title') return <span className="sw-title">{(item as TitleItem).text}</span>
  // надеваемые: показываем поверх текущего образа в этом слоте
  return <Avatar look={{ ...look, [item.slot]: item.id }} seed={seed} size={50} />
}
