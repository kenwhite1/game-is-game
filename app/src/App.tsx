import { useEffect, useState } from 'react'
import { useStore, type Tab } from './store'
import { Home } from './screens/Home'
import { Shop } from './screens/Shop'
import { Friends } from './screens/Friends'
import { Style } from './screens/Style'
import { Profile } from './screens/Profile'
import { BrandLogo } from './screens/Logo'
import { TabIcons, CheckIcon, SoundOnIcon, SoundOffIcon, HelpIcon } from './art/icons'
import { validUsername, normalizeUsername } from '@shared/username'
import { cosmeticById } from '@shared/cosmetics'
import { t, useLang, setLang, getLang, toggleLang, tSeason } from './i18n'
import { api } from './api'
import { PASS_PREMIUM_STARS, PASS_PLUS_STARS, PASS_PLUS_TIERS, TIER_BOOST_STARS, TIER_BOOST_TIERS } from '@shared/wallet'

const TABS: { key: Tab; ru: string }[] = [
  { key: 'home', ru: 'Дом' },
  { key: 'shop', ru: 'Магазин' },
  { key: 'style', ru: 'Аватар' },
  { key: 'friends', ru: 'Друзья' },
  { key: 'profile', ru: 'Профиль' },
]

export function App() {
  useLang() // перерисовать всё дерево при смене языка
  const ready = useStore(s => s.ready)
  const init = useStore(s => s.init)
  const tab = useStore(s => s.tab)
  const setTab = useStore(s => s.setTab)
  const toast = useStore(s => s.toast)
  const soundOn = useStore(s => s.soundOn)
  const toggleSound = useStore(s => s.toggleSound)
  const openSheet = useStore(s => s.openSheet)
  const profile = useStore(s => s.profile)

  useEffect(() => { void init() }, [init])

  if (!ready) {
    return (
      <div className="app">
        <div className="splash">
          <div className="splash-inner">
            <BrandLogo />
            <div className="soft" style={{ fontWeight: 800, fontSize: 15, marginTop: 8 }}>{t('Открываем игровую…')}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="page">
        <div className="tab-host" key={tab}>
          {tab === 'home' && <Home />}
          {tab === 'shop' && <Shop />}
          {tab === 'style' && <Style />}
          {tab === 'friends' && <Friends />}
          {tab === 'profile' && <Profile />}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}

      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-group">
            {TABS.map(tb => (
              <button key={tb.key} className={`tab ${tab === tb.key ? 'active' : ''}`} onClick={() => setTab(tb.key)} aria-label={t(tb.ru)}>
                {TabIcons[tb.key]}
              </button>
            ))}
          </div>
          <div className="nav-group">
            <button
              className="tab lang-tab"
              onClick={() => { const next = toggleLang(); void api.setLang(next).catch(() => {}).then(() => useStore.getState().refreshCatalog()) }}
              aria-label={t('Язык')}
              title={t('Язык')}
              style={{ fontWeight: 900, fontSize: 12, letterSpacing: 0.5 }}
            >
              {getLang().toUpperCase()}
            </button>
            <button className="tab" onClick={toggleSound} aria-label={t('Звук')}>
              {soundOn ? <SoundOnIcon /> : <SoundOffIcon />}
            </button>
            <button className="tab" onClick={() => openSheet('help')} aria-label={t('Помощь')}><HelpIcon /></button>
            {profile && (
              <button className="railcoin" onClick={() => setTab('style')} aria-label={t('Магазин стиля')}>
                <span className="coin">G</span>
                <span className="railnum">{profile.coins.toLocaleString('ru')}</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      <Sheets />
    </div>
  )
}

function Sheets() {
  const sheet = useStore(s => s.sheet)
  const close = () => useStore.setState({ sheet: null })
  if (!sheet) return null
  return (
    <div className="scrim" onClick={close}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="grip" />
        {sheet === 'about' && <About />}
        {sheet === 'help' && <Help />}
        {sheet === 'settings' && <Settings />}
        {sheet === 'editProfile' && <EditProfile onDone={close} />}
        {sheet === 'season' && <SeasonPass />}
        {sheet === 'festival' && <Festival />}
        {sheet === 'boards' && <Boards />}
        {sheet === 'market' && <Market />}
        {sheet === 'clan' && <Clan />}
        {sheet === 'collections' && <Collections />}
      </div>
    </div>
  )
}

function Collections() {
  const collections = useStore(s => s.collections)
  const claim = useStore(s => s.claimCollection)
  if (collections.length === 0) return <p className="soft">{t('Загрузка коллекций…')}</p>
  return (
    <>
      <h2 style={{ marginBottom: 2 }}>{t('Коллекции')}</h2>
      <p className="soft" style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 12 }}>{t('Собери все предметы коллекции и получи бонус Game.')}</p>
      <div className="lb-list">
        {collections.map(c => {
          const pct = Math.round((c.owned / c.total) * 100)
          const claimable = c.complete && !c.claimed
          return (
            <div className={`col-row ${claimable ? 'can' : ''}`} key={c.name}>
              <div className="col-tx">
                <div className="col-nm">{c.name} <span className="col-cnt">{c.owned}/{c.total}</span></div>
                <div className="ach-bar" style={{ marginTop: 5 }}><div className="ach-fill" style={{ width: `${pct}%`, background: c.complete ? 'linear-gradient(90deg,#34c759,#1f8f46)' : undefined }} /></div>
              </div>
              {c.claimed
                ? <span className="col-done">✓</span>
                : claimable
                  ? <button className="q-claim" onClick={() => void claim(c.name)}>+{c.bonus} G</button>
                  : <span className="col-bonus">+{c.bonus} G</span>}
            </div>
          )
        })}
      </div>
    </>
  )
}

function Clan() {
  const clan = useStore(s => s.clan)
  const board = useStore(s => s.clanBoard)
  const createClan = useStore(s => s.createClan)
  const joinClan = useStore(s => s.joinClan)
  const leaveClan = useStore(s => s.leaveClan)
  const claimWeekly = useStore(s => s.claimClanWeekly)
  const [name, setName] = useState('')
  const [tag, setTag] = useState('')

  if (clan) {
    const w = clan.weekly
    const pct = Math.min(100, Math.round((w.value / w.target) * 100))
    return (
      <>
        <div className="sp-head">
          <div>
            <h2 style={{ marginBottom: 2 }}>[{clan.tag}] {clan.name}</h2>
            <div className="soft" style={{ fontSize: 12.5, fontWeight: 800 }}>{clan.memberCount} {t('участников')} · {t('ты')} {clan.role === 'owner' ? t('лидер') : t('участник')}</div>
          </div>
          <button className="btn sm ghost" onClick={() => void leaveClan()}>{t('Выйти')}</button>
        </div>

        <div className="kicker" style={{ margin: '4px 0 8px' }}>{t('Общая цель недели')}</div>
        <div className="fest-comm">
          <div className="fest-comm-t">{getLang() === 'en' ? `Launch ${w.target} games together this week` : `Вместе запустите ${w.target} игр за неделю`}</div>
          <div className="q-bar" style={{ marginTop: 6 }}><div className="q-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#5ad0a0,#3a82f7)' }} /></div>
          <div className="fest-comm-f">
            <span>{w.value} / {w.target}</span>
            {w.reached && (w.claimed
              ? <span className="soft" style={{ fontWeight: 900 }}>✓ +{w.reward} G {t('получено')}</span>
              : <button className="q-claim" onClick={() => void claimWeekly()}>{t('Забрать')} +{w.reward} G</button>)}
          </div>
        </div>

        <div className="kicker" style={{ margin: '16px 0 8px' }}>{t('Состав')}</div>
        <div className="lb-list">
          {clan.members.map(m => (
            <div className="lb-row2" key={m.id}>
              <span className="rank">{m.role === 'owner' ? '👑' : ''}</span>
              <span className="lb-nm">{m.name}</span>
              <span className="lb-val">GG {m.ggScore}</span>
            </div>
          ))}
        </div>

        <div className="kicker" style={{ margin: '16px 0 8px' }}>{t('Топ команд')}</div>
        <div className="lb-list">
          {board.map((c, i) => (
            <div className={`lb-row2 ${c.isMine ? 'me' : ''}`} key={c.id}>
              <span className={`rank ${i < 3 ? 'top' : ''}`}>{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
              <span className="lb-nm">[{c.tag}] {c.name} · {c.members}👥</span>
              <span className="lb-val">GG {c.score}</span>
            </div>
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      <h2 style={{ marginBottom: 2 }}>{t('Команды')}</h2>
      <p className="soft" style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 12 }}>{t('Собери команду, бейте общие цели и поднимайтесь в топе.')}</p>

      <div className="kicker" style={{ margin: '4px 0 8px' }}>{t('Создать команду')}</div>
      <div className="field">
        <input className="input" value={name} maxLength={24} onChange={e => setName(e.target.value)} placeholder={t('Название')} style={{ flex: 1 }} />
        <input className="input" value={tag} maxLength={5} onChange={e => setTag(e.target.value.toUpperCase())} placeholder={t('ТЕГ')} style={{ width: 88, textAlign: 'center' }} autoCapitalize="characters" />
      </div>
      <button className="btn block" style={{ marginTop: 10 }} disabled={name.trim().length < 3 || tag.trim().length < 2} onClick={() => void createClan(name, tag)}>
        🛡️ {t('Создать')}
      </button>

      <div className="kicker" style={{ margin: '18px 0 8px' }}>{t('Найти команду')}</div>
      {board.length === 0 ? (
        <p className="soft" style={{ fontSize: 12.5 }}>{t('Пока команд нет, создай первую!')}</p>
      ) : (
        <div className="lb-list">
          {board.map(c => (
            <div className="lb-row2" key={c.id}>
              <span className="lb-nm">[{c.tag}] {c.name} · {c.members}👥 · GG {c.score}</span>
              <button className="btn sm" onClick={() => void joinClan(c.id)}>{t('Вступить')}</button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function Market() {
  const market = useStore(s => s.market)
  const listItem = useStore(s => s.listItem)
  const buyListing = useStore(s => s.buyListing)
  const cancelListing = useStore(s => s.cancelListing)
  const [sellId, setSellId] = useState('')
  const [price, setPrice] = useState('')
  if (!market) return <p className="soft">{t('Загрузка барахолки…')}</p>
  const sell = market.sellable.find(s => s.itemId === sellId)
  return (
    <>
      <h2 style={{ marginBottom: 2 }}>{t('Барахолка')}</h2>
      <p className="soft" style={{ fontSize: 12, fontWeight: 800, marginBottom: 12 }}>{getLang() === 'en' ? `Trade purchased looks for Game. A ${market.feePct}% fee is burned. Earned items can't be sold.` : `Обмен покупными образами за Game. Комиссия ${market.feePct}% сгорает. Заслуги не продаются.`}</p>

      <div className="kicker" style={{ margin: '4px 0 8px' }}>{t('Выставить свой образ')}</div>
      {market.sellable.length === 0 ? (
        <p className="soft" style={{ fontSize: 12.5 }}>{t('Нет торгуемых образов. Купи что-нибудь в магазине.')}</p>
      ) : (
        <div className="mk-sell">
          <select className="input" value={sellId} onChange={e => { setSellId(e.target.value); setPrice('') }} style={{ flex: 1 }}>
            <option value="">{t('Выбери образ…')}</option>
            {market.sellable.map(s => <option key={s.itemId} value={s.itemId}>{t(s.name)} ({t(s.rarity)})</option>)}
          </select>
          <input className="input" type="number" inputMode="numeric" placeholder={sell ? `${sell.floor}-${sell.ceil}` : t('Цена')}
            value={price} onChange={e => setPrice(e.target.value)} style={{ width: 96 }} disabled={!sell} />
          <button className="btn sm" disabled={!sell || !price} onClick={() => { if (sell) { void listItem(sell.itemId, Number(price)); setSellId(''); setPrice('') } }}>{t('Продать')}</button>
        </div>
      )}

      {market.mine.length > 0 && (
        <>
          <div className="kicker" style={{ margin: '16px 0 8px' }}>{t('Мои лоты')}</div>
          {market.mine.map(l => (
            <div className="mk-row" key={l.id}>
              <span className="mk-nm">{t(l.itemName)} <span className="mk-rar">{t(l.rarity)}</span></span>
              <span className="mk-price"><span className="coin">G</span>{l.price}</span>
              <button className="btn sm ghost" onClick={() => void cancelListing(l.id)}>{t('Снять')}</button>
            </div>
          ))}
        </>
      )}

      <div className="kicker" style={{ margin: '16px 0 8px' }}>{t('Лоты игроков')}</div>
      {market.listings.length === 0 ? (
        <div className="empty"><div className="em">🏷️</div><div className="t">{t('Пока пусто')}</div><div className="s">{t('Загляни позже, тут появятся образы игроков.')}</div></div>
      ) : (
        market.listings.map(l => (
          <div className="mk-row" key={l.id}>
            <span className="mk-nm">{t(l.itemName)} <span className="mk-rar">{t(l.rarity)}</span><span className="mk-seller"> · {l.sellerName}</span></span>
            <span className="mk-price"><span className="coin">G</span>{l.price}</span>
            <button className="btn sm" disabled={market.coins < l.price} onClick={() => void buyListing(l.id)}>{t('Купить')}</button>
          </div>
        ))
      )}
    </>
  )
}

function Boards() {
  const boards = useStore(s => s.boards)
  const ranked = useStore(s => s.ranked)
  const [tab, setTab] = useState<'ggScore' | 'weeklyCoins' | 'ggLadder'>('ggScore')
  if (!boards) return <p className="soft">{t('Загрузка рейтингов…')}</p>
  const rows = boards[tab]
  const unit = tab === 'ggScore' ? '' : tab === 'weeklyCoins' ? ' G' : ''
  const TABS = [['ggScore', 'GG Score'], ['ggLadder', t('GG-лига')], ['weeklyCoins', t('Неделя')]] as const
  const medals = ['🥇', '🥈', '🥉']
  return (
    <>
      <h2 style={{ marginBottom: 10 }}>{t('Рейтинги')}</h2>
      {ranked && (
        <div className="lb-self">
          <span>{t('Моя GG-лига:')} <b>{ranked.ladder}</b></span>
          {ranked.games.length > 0 && <span className="soft" style={{ fontWeight: 800 }}>{ranked.games.map(g => `${t(g.name)}: ${t(g.division)}`).join(' · ')}</span>}
        </div>
      )}
      <div className="lb-tabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={`lb-tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="empty"><div className="em">🏆</div><div className="t">{t('Пока пусто')}</div><div className="s">{t('Играй и зарабатывай, рейтинг наполнится.')}</div></div>
      ) : (
        <div className="lb-list">
          {rows.map((r, i) => (
            <div className={`lb-row2 ${r.isMe ? 'me' : ''}`} key={r.id}>
              <span className={`rank ${i < 3 ? 'top' : ''}`}>{i < 3 ? medals[i] : i + 1}</span>
              <span className="lb-nm">{r.name}{r.isMe ? ` · ${t('ты')}` : ''}</span>
              <span className="lb-val">{r.value.toLocaleString('ru')}{unit}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function Festival() {
  const f = useStore(s => s.festival)
  const claimQuest = useStore(s => s.claimEventQuest)
  const claimCommunity = useStore(s => s.claimCommunity)
  const buy = useStore(s => s.buyEventItem)
  if (!f) return <p className="soft">{t('Событие завершилось.')}</p>
  const days = Math.max(0, Math.ceil((f.endsMs - Date.now()) / 86_400_000))
  const cpct = Math.min(100, Math.round((f.community.value / f.community.target) * 100))
  return (
    <>
      <div className="sp-head">
        <div>
          <h2 style={{ marginBottom: 2 }}>{f.emoji} {t(f.name)}</h2>
          <div className="soft" style={{ fontSize: 12.5, fontWeight: 800 }}>{t('осталось')} {days} {t('дн.')}</div>
        </div>
        <span className="fest-tokens">🎟 {f.tokens}</span>
      </div>

      <div className="kicker" style={{ margin: '4px 0 8px' }}>{t('Общая цель')}</div>
      <div className="fest-comm">
        <div className="fest-comm-t">{t(f.community.title)}</div>
        <div className="q-bar" style={{ marginTop: 6 }}><div className="q-fill" style={{ width: `${cpct}%`, background: 'linear-gradient(90deg,#ffd166,#ff7a00)' }} /></div>
        <div className="fest-comm-f">
          <span>{f.community.value.toLocaleString('ru')} / {f.community.target.toLocaleString('ru')}</span>
          {f.community.reached && (f.community.claimed
            ? <span className="soft" style={{ fontWeight: 900 }}>✓ {t(f.community.rewardName)}</span>
            : <button className="q-claim" onClick={() => void claimCommunity()}>{t('Забрать')} «{t(f.community.rewardName)}»</button>)}
        </div>
      </div>

      <div className="kicker" style={{ margin: '16px 0 8px' }}>{t('Задания события')}</div>
      {f.quests.map(q => (
        <div className="q-row" key={q.id} style={{ borderTop: 'none' }}>
          <span className="q-emoji">{q.emoji}</span>
          <div className="q-tx">
            <div className="q-name" style={{ color: 'var(--ink)' }}>{t(q.title)}</div>
            <div className="q-bar"><div className="q-fill" style={{ width: `${Math.round((q.progress / q.target) * 100)}%` }} /></div>
          </div>
          {q.claimed
            ? <span className="q-done" style={{ color: 'var(--green-deep)' }}>✓</span>
            : q.done
              ? <button className="q-claim" onClick={() => void claimQuest(q.id)}>+{q.tokens} 🎟</button>
              : <span className="q-prog" style={{ color: 'var(--ink-soft)' }}>{q.progress}/{q.target}</span>}
        </div>
      ))}

      <div className="kicker" style={{ margin: '16px 0 8px' }}>{t('Магазин события')}</div>
      <div className="fest-shop">
        {f.shop.map(s => (
          <button key={s.itemId} className={`fest-item ${s.owned ? 'owned' : ''}`} disabled={s.owned} onClick={() => void buy(s.itemId)}>
            <span className="fest-item-n">{t(s.name)}</span>
            {s.owned ? <span className="fest-item-p owned">{t('Куплено')}</span> : <span className="fest-item-p">🎟 {s.tokens}</span>}
          </button>
        ))}
      </div>
    </>
  )
}

/** Иконка-подпись награды тира пропуска. */
function rewardChip(reward: { kind: string; amount?: number; count?: number; itemId?: string } | null): string {
  if (!reward) return '·'
  if (reward.kind === 'coins') return `🪙 ${reward.amount}`
  if (reward.kind === 'freeze') return `❄ ${reward.count}`
  return t(cosmeticById(reward.itemId ?? '')?.name ?? 'Предмет')
}

function SeasonPass() {
  const season = useStore(s => s.season)
  const claim = useStore(s => s.claimSeasonTier)
  const buyPremium = useStore(s => s.buyPremium)
  const buyPremiumPlus = useStore(s => s.buyPremiumPlus)
  const buyTierBoost = useStore(s => s.buyTierBoost)
  if (!season) return <p className="soft">{t('Загрузка сезона…')}</p>
  const daysLeft = Math.max(0, Math.ceil((season.endsMs - Date.now()) / 86_400_000))
  const atMax = season.tier >= season.tiers
  const intoTier = season.xp - season.tier * season.xpPerTier
  const toNext = season.xpPerTier - intoTier
  const pct = atMax ? 100 : Math.round((intoTier / season.xpPerTier) * 100)
  const nextRow = season.rows.find(r => r.tier === season.tier + 1)
  const nextReward = nextRow ? (season.premium && nextRow.premium ? nextRow.premium : nextRow.free) : null
  const isMilestone = (t: number) => t % 10 === 0 || t === season.tiers
  return (
    <>
      <div className="sp-hero">
        <div className="sp-hero-top">
          <div>
            <h2 style={{ marginBottom: 2 }}>{tSeason(season.season.name)}</h2>
            <div className="sp-hero-sub">{getLang() === 'en' ? `${daysLeft}d. left · claimable: ${season.claimable}` : `Осталось ${daysLeft} дн. · можно забрать: ${season.claimable}`}</div>
          </div>
          <div className={`sp-tierbadge ${season.premium ? 'prem' : ''}`}>
            <span className="sp-tierbadge-n">{season.tier}</span>
            <span className="sp-tierbadge-l">{t('тир')}</span>
          </div>
        </div>
        <div className="sp-hero-bar"><div className="sp-hero-fill" style={{ width: `${pct}%` }} /></div>
        <div className="sp-hero-foot">
          <span>{atMax ? t('Пропуск пройден 🏆') : (getLang() === 'en' ? `${intoTier}/${season.xpPerTier} XP · to tier ${season.tier + 1}: ${toNext}` : `${intoTier}/${season.xpPerTier} XP · до тира ${season.tier + 1}: ${toNext}`)}</span>
          {nextReward && <span className="sp-hero-next">{t('дальше:')} {rewardChip(nextReward)}</span>}
        </div>
      </div>

      <div className="sp-buys">
        {season.premium
          ? <div className="sp-prem on">{t('Премиум активен ✨')}</div>
          : <>
              <button className="sp-buy" onClick={() => void buyPremium()}>
                <span className="sp-buy-t">{t('Премиум')}</span>
                <span className="sp-buy-d">{t('все награды премиум-трека')}</span>
                <span className="sp-buy-p">{PASS_PREMIUM_STARS} ⭐</span>
              </button>
              <button className="sp-buy hot" onClick={() => void buyPremiumPlus()}>
                <span className="sp-buy-t">{t('Пропуск+ 🔥')}</span>
                <span className="sp-buy-d">{getLang() === 'en' ? `premium and +${PASS_PLUS_TIERS} tiers now` : `премиум и сразу +${PASS_PLUS_TIERS} тиров`}</span>
                <span className="sp-buy-p">{PASS_PLUS_STARS} ⭐</span>
              </button>
            </>}
        {!atMax && (
          <button className="sp-buy boost" onClick={() => void buyTierBoost()}>
            <span className="sp-buy-t">{getLang() === 'en' ? `Boost +${TIER_BOOST_TIERS} tiers 🚀` : `Буст +${TIER_BOOST_TIERS} тиров 🚀`}</span>
            <span className="sp-buy-d">{t('мгновенно продвинуться по пропуску')}</span>
            <span className="sp-buy-p">{TIER_BOOST_STARS} ⭐</span>
          </button>
        )}
      </div>

      <div className="sp-track-title">
        <b>{t('Награды сезона')}</b>
        <span>{getLang() === 'en' ? `tier ${season.tier}/${season.tiers}` : `тир ${season.tier}/${season.tiers}`}</span>
      </div>
      <div className="sp-legend"><span>{t('Тир')}</span><span>{t('Бесплатно')}</span><span>{t('Премиум')}</span></div>
      <div className="sp-track">
        {season.rows.map(r => (
          <div className={`sp-row ${r.unlocked ? 'on' : ''} ${isMilestone(r.tier) ? 'milestone' : ''}`} key={r.tier}>
            <span className="sp-tier">{isMilestone(r.tier) && <span className="sp-star">★</span>}{r.tier}</span>
            <SeasonCell reward={r.free} claimed={r.freeClaimed} can={r.unlocked && !r.freeClaimed && !!r.free}
              onClaim={() => void claim(r.tier, 'free')} />
            <SeasonCell reward={r.premium} claimed={r.premiumClaimed} can={r.unlocked && season.premium && !r.premiumClaimed && !!r.premium}
              locked={!season.premium} onClaim={() => void claim(r.tier, 'premium')} />
          </div>
        ))}
      </div>
    </>
  )
}

function SeasonCell({ reward, claimed, can, locked, onClaim }: {
  reward: { kind: string; amount?: number; count?: number; itemId?: string } | null
  claimed: boolean; can: boolean; locked?: boolean; onClaim(): void
}) {
  if (!reward) return <span className="sp-cell empty">·</span>
  const big = reward.kind === 'item'
  return (
    <button className={`sp-cell ${claimed ? 'claimed' : can ? 'can' : ''} ${big ? 'item' : ''}`} disabled={!can} onClick={onClaim}>
      <span className="sp-rw">{rewardChip(reward)}</span>
      {claimed ? <span className="sp-tag">✓</span> : can ? <span className="sp-tag">{t('забрать')}</span> : locked ? <span className="sp-tag">🔒</span> : null}
    </button>
  )
}

function About() {
  const catalog = useStore(s => s.catalog)
  return (
    <>
      <div className="splash-inner" style={{ marginBottom: 6 }}><BrandLogo size="small" /></div>
      <h2>Game is Game</h2>
      <p className="soft">{t('Один аккаунт, все наши игры. Открываешь хаб, выбираешь игру, и она запускается сразу. Друзья, уровни и значки общие для всех игр.')}</p>
      <div style={{ marginTop: 8 }}>
        {catalog.map(g => (
          <div className="setting" key={g.id}>
            <div className="tx"><div className="t">{t(g.name)}</div><div className="s">{t(g.blurb)}</div></div>
          </div>
        ))}
      </div>
      <button className="btn block" style={{ marginTop: 14 }} onClick={() => useStore.setState({ sheet: null })}>{t('Понятно')}</button>
    </>
  )
}

function Help() {
  return (
    <>
      <h2>{t('Как это работает')}</h2>
      <p className="soft">{t('Выбери игру в «Доме», она откроется сразу. Добавляй друзей по коду, соревнуйся в «Ленте» и качай уровень за запуски игр.')}</p>
      <div style={{ marginTop: 8 }}>
        <div className="cmd"><code>/start</code><span>{t('открыть хаб')}</span></div>
        <div className="cmd"><code>/play</code><span>{t('открыть хаб')}</span></div>
        <div className="cmd"><code>/games</code><span>{t('список игр')}</span></div>
        <div className="cmd"><code>/help</code><span>{t('помощь')}</span></div>
      </div>
      <button className="btn block" style={{ marginTop: 16 }} onClick={() => useStore.setState({ sheet: null })}>{t('Закрыть')}</button>
    </>
  )
}

function Settings() {
  const soundOn = useStore(s => s.soundOn)
  const toggleSound = useStore(s => s.toggleSound)
  const openSheet = useStore(s => s.openSheet)
  const lang = getLang()
  return (
    <>
      <h2>{t('Настройки')}</h2>
      <div style={{ marginTop: 8 }}>
        <div className="setting">
          <div className="tx"><div className="t">{t('Язык')}</div><div className="s">{t('Русский или English')}</div></div>
          <div role="group" aria-label={t('Язык')} style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,.06)', borderRadius: 999, padding: 3 }}>
            {(['ru', 'en'] as const).map(code => (
              <button
                key={code}
                onClick={() => { setLang(code); void api.setLang(code).catch(() => {}).then(() => useStore.getState().refreshCatalog()) }}
                aria-pressed={lang === code}
                style={{
                  border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 13, letterSpacing: 0.5,
                  padding: '6px 14px', borderRadius: 999,
                  background: lang === code ? 'var(--blue, #3a82f7)' : 'transparent',
                  color: lang === code ? '#fff' : 'var(--ink-soft, #6b5a44)',
                }}
              >{code.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <div className="setting">
          <div className="tx"><div className="t">{t('Звук')}</div><div className="s">{t('Тихие щелчки в интерфейсе')}</div></div>
          <button className={`switch ${soundOn ? 'on' : ''}`} onClick={toggleSound} aria-label={t('Звук')}><i /></button>
        </div>
        <button className="setting" style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', borderBottom: '1.5px solid var(--line)' }} onClick={() => openSheet('about')}>
          <div className="tx"><div className="t">{t('Об этом приложении')}</div><div className="s">{t('Что такое Game is Game')}</div></div>
        </button>
        <button className="setting" style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }} onClick={() => openSheet('help')}>
          <div className="tx"><div className="t">{t('Помощь')}</div><div className="s">{t('Как пользоваться хабом')}</div></div>
        </button>
      </div>
      <div className="soft" style={{ textAlign: 'center', fontSize: 12.5, fontWeight: 700, marginTop: 16 }}>{t('Сделано с любовью ♥')}</div>
    </>
  )
}

function EditProfile({ onDone }: { onDone(): void }) {
  const profile = useStore(s => s.profile)!
  const chooseUsername = useStore(s => s.chooseUsername)
  const setTab = useStore(s => s.setTab)
  const showToast = useStore(s => s.showToast)
  const [uname, setUname] = useState('')
  const [busy, setBusy] = useState(false)

  const clean = normalizeUsername(uname)
  const ok = validUsername(uname)
  const hasUsername = !!profile.username

  const save = async () => {
    if (!ok) { showToast(t('Ник: 3-32 символа, латиница, цифры и _')); return }
    setBusy(true)
    const r = await chooseUsername(clean)
    setBusy(false)
    if (!r.ok) {
      showToast(r.error === 'username_taken' ? t('Этот ник уже занят, придумай другой')
        : r.error === 'username_locked' ? t('Ник уже закреплён')
        : t('Недопустимый ник'))
    }
  }
  const toStyle = () => { onDone(); setTab('style') }

  return (
    <>
      <h2>{t('Профиль')}</h2>

      {hasUsername ? (
        <>
          <div className="kicker" style={{ margin: '14px 0 8px' }}>{t('Ник')}</div>
          <div className="uname-fixed">@{profile.username}</div>
          <p className="soft" style={{ marginTop: 10 }}>{t('Ник берётся из твоего Telegram и общий для всех наших игр.')}</p>
        </>
      ) : (
        <>
          <div className="kicker" style={{ margin: '14px 0 8px' }}>{t('Придумай ник')}</div>
          <div className="field">
            <span className="uname-at">@</span>
            <input
              className="input" value={uname} maxLength={32} autoFocus
              onChange={e => setUname(e.target.value)} placeholder={t('ник')}
              autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="done"
              onKeyDown={e => { if (e.key === 'Enter' && ok) void save() }}
            />
          </div>
          <p className="soft" style={{ marginTop: 10 }}>
            {t('В Telegram у тебя нет @username, поэтому выбери свой, 3-32 символа: латиница, цифры и «_». Его больше никто не сможет занять.')}
          </p>
          <button className="btn block" style={{ marginTop: 16 }} onClick={save} disabled={busy || !ok}>
            <CheckIcon /> {t('Закрепить ник')}
          </button>
        </>
      )}

      <button className="btn block ghost" style={{ marginTop: 10 }} onClick={toStyle}>
        ✨ {t('Сменить образ')}
      </button>
    </>
  )
}
