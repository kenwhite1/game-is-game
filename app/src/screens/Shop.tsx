import { useState } from 'react'
import { useStore } from '../store'
import { Swatch, profileLook } from './Style'
import { CheckIcon, LockIcon } from '../art/icons'
import { RARITY, SLOT_RU, SLOTS } from '@shared/cosmetics'
import { PACKS } from '@shared/wallet'
import type { Slot } from '@shared/cosmetics'
import type { CosmeticState, Look } from '@shared/types'
import type { DailyDeal } from '@shared/shop'

type Filter = 'all' | Slot

export function Shop() {
  const profile = useStore(s => s.profile)
  const wardrobe = useStore(s => s.wardrobe)
  const buy = useStore(s => s.buy)
  const equip = useStore(s => s.equip)
  const showToast = useStore(s => s.showToast)
  const openSheet = useStore(s => s.openSheet)
  const loadMarket = useStore(s => s.loadMarket)
  const loadCollections = useStore(s => s.loadCollections)
  const [filter, setFilter] = useState<Filter>('all')

  if (!profile) {
    return <div className="tab-page"><div className="empty"><div className="em">🛍️</div><div className="t">Загрузка магазина…</div></div></div>
  }
  const coins = wardrobe?.coins ?? profile.coins
  const look = profileLook(profile)

  // В магазине показываем товары (shop) и премиум-тизеры (скоро).
  const all = (wardrobe?.items ?? []).filter(i => i.item.unlock.kind === 'shop' || i.item.unlock.kind === 'premium')
  const items = filter === 'all' ? all : all.filter(i => i.item.slot === filter)
  // сначала доступные к покупке, потом купленные, потом «скоро»
  const order = (i: CosmeticState) => (i.owned ? 1 : i.price != null ? 0 : 2)
  items.sort((a, b) => order(a) - order(b))

  const onTap = async (s: CosmeticState) => {
    if (s.owned) { showToast('Уже куплено — надень во вкладке «Аватар»'); return }
    if (s.price == null) { showToast('Скоро в продаже ✨'); return }
    if (coins < s.price) { showToast('Не хватает Game 💰'); return }
    const ok = await buy(s.item.id, s.item.name)
    if (ok) void equip(s.item.slot, s.item.id)
  }

  const byId = new Map((wardrobe?.items ?? []).map(i => [i.item.id, i]))
  const onDeal = async (d: DailyDeal) => {
    const s = byId.get(d.itemId)
    if (!s) return
    if (s.owned) { showToast('Уже куплено — надень во вкладке «Аватар»'); return }
    if (coins < d.price) { showToast('Не хватает Game 💰'); return }
    const ok = await buy(s.item.id, s.item.name)
    if (ok) void equip(s.item.slot, s.item.id)
  }

  return (
    <div className="tab-page stagger">
      <div className="topbar">
        <div className="hello"><div className="hi">Хаб</div><div className="nm">Магазин</div></div>
        <span className="coin-chip" style={{ cursor: 'default' }}><span className="coin">G</span>{coins.toLocaleString('ru')}</span>
      </div>

      <div className="shop-hero">
        <div className="shop-hero-t">Магазин стиля</div>
        <div className="shop-hero-s">Зарабатывай Game в играх и собирай редкие образы</div>
      </div>

      {wardrobe && wardrobe.daily.length > 0 && (
        <>
          <div className="sec"><h2>Витрина дня</h2><span className="sub">новое каждый день</span></div>
          <div className="deal-row">
            {wardrobe.daily.map(d => {
              const s = byId.get(d.itemId)
              if (!s) return null
              const rc = RARITY[s.item.rarity]
              return (
                <button key={d.itemId} className={`deal ${s.owned ? 'owned' : ''}`} style={{ ['--rar' as string]: rc.color }} onClick={() => void onDeal(d)} aria-label={s.item.name}>
                  {d.leaving && <span className="deal-tag">уходит скоро</span>}
                  {d.discountPct > 0 && <span className="deal-off">−{d.discountPct}%</span>}
                  <span className="cos-art"><Swatch item={s.item} look={look} seed={profile.id} /></span>
                  <span className="cos-name">{s.item.name}</span>
                  {s.owned ? (
                    <span className="cos-owned"><CheckIcon /> Куплено</span>
                  ) : (
                    <span className="deal-price">
                      {d.discountPct > 0 && <s>{d.base}</s>}
                      <span className="coin">G</span>{d.price}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 4, marginBottom: 4 }}>
        <button className="btn ghost" style={{ flex: 1 }} onClick={() => { void loadMarket(); openSheet('market') }}>🏷️ Барахолка</button>
        <button className="btn ghost" style={{ flex: 1 }} onClick={() => { void loadCollections(); openSheet('collections') }}>🧩 Коллекции</button>
      </div>

      <TopUp />

      <div className="sec"><h2>Косметика</h2></div>

      <div className="slot-strip">
        <button className={`slot-chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>Всё</button>
        {SLOTS.map(s => (
          <button key={s} className={`slot-chip ${filter === s ? 'on' : ''}`} onClick={() => setFilter(s)}>{SLOT_RU[s]}</button>
        ))}
      </div>

      {!wardrobe ? (
        <div className="empty"><div className="em">🛍️</div><div className="t">Открываем витрину…</div></div>
      ) : items.length === 0 ? (
        <div className="empty"><div className="em">🛍️</div><div className="t">Здесь пусто</div><div className="s">В этой категории пока нет товаров.</div></div>
      ) : (
        <div className="cos-grid">
          {items.map(s => <ShopCell key={s.item.id} state={s} look={look} seed={profile.id} onTap={() => onTap(s)} />)}
        </div>
      )}
    </div>
  )
}

/** Пакеты Game за Telegram Stars: счёт открывается прямо в Mini App. */
function TopUp() {
  const buyCoins = useStore(s => s.buyCoins)
  const boughtPacks = useStore(s => s.boughtPacks)
  return (
    <>
      <div className="sec"><h2>Пополнить баланс</h2><span className="sub">за Telegram Stars</span></div>
      <div className="pack-row">
        {PACKS.map(p => {
          const first = !boughtPacks.includes(p.id) // §4.5: первая покупка удваивает монеты
          return (
            <button key={p.id} className={`pack ${first ? 'pack-2x' : ''}`} onClick={() => void buyCoins(p.id)} aria-label={`${p.title}: ${p.coins} Game за ${p.stars} Stars${first ? ', первая покупка ×2' : ''}`}>
              <span className="pack-emoji">{p.emoji}</span>
              <span className="pack-coins"><span className="coin">G</span>{p.coins.toLocaleString('ru')}</span>
              <span className="pack-stars">⭐ {p.stars}</span>
              {first ? <span className="pack-tag pack-first">×2 первая</span> : p.tag && <span className="pack-tag">{p.tag}</span>}
            </button>
          )
        })}
      </div>
    </>
  )
}

function ShopCell({ state, look, seed, onTap }: { state: CosmeticState; look: Look; seed: number; onTap(): void }) {
  const { item, owned, price } = state
  const rc = RARITY[item.rarity]
  const soon = !owned && price == null
  return (
    <button className={`cos ${owned ? 'owned' : ''}`} style={{ ['--rar' as string]: rc.color }} onClick={onTap} aria-label={item.name}>
      <span className="cos-art"><Swatch item={item} look={look} seed={seed} /></span>
      <span className="cos-name">{item.name}</span>
      <span className="cos-rar" style={{ color: rc.color }}>{rc.label}</span>
      {owned ? (
        <span className="cos-owned"><CheckIcon /> Куплено</span>
      ) : soon ? (
        <span className="cos-soon"><LockIcon /> Скоро</span>
      ) : (
        <span className="cos-price"><span className="coin">G</span>{price}</span>
      )}
    </button>
  )
}
