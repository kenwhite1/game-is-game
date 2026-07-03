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
import { PASS_PREMIUM_STARS } from '@shared/wallet'

const TABS: { key: Tab; ru: string }[] = [
  { key: 'home', ru: 'Дом' },
  { key: 'shop', ru: 'Магазин' },
  { key: 'style', ru: 'Аватар' },
  { key: 'friends', ru: 'Друзья' },
  { key: 'profile', ru: 'Профиль' },
]

export function App() {
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
            <div className="soft" style={{ fontWeight: 800, fontSize: 15, marginTop: 8 }}>Открываем игровую…</div>
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
            {TABS.map(t => (
              <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)} aria-label={t.ru}>
                {TabIcons[t.key]}
              </button>
            ))}
          </div>
          <div className="nav-group">
            <button className="tab" onClick={toggleSound} aria-label="Звук">
              {soundOn ? <SoundOnIcon /> : <SoundOffIcon />}
            </button>
            <button className="tab" onClick={() => openSheet('help')} aria-label="Помощь"><HelpIcon /></button>
            {profile && (
              <button className="railcoin" onClick={() => setTab('style')} aria-label="Магазин стиля">
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
      </div>
    </div>
  )
}

function Festival() {
  const f = useStore(s => s.festival)
  const claimQuest = useStore(s => s.claimEventQuest)
  const claimCommunity = useStore(s => s.claimCommunity)
  const buy = useStore(s => s.buyEventItem)
  if (!f) return <p className="soft">Событие завершилось.</p>
  const days = Math.max(0, Math.ceil((f.endsMs - Date.now()) / 86_400_000))
  const cpct = Math.min(100, Math.round((f.community.value / f.community.target) * 100))
  return (
    <>
      <div className="sp-head">
        <div>
          <h2 style={{ marginBottom: 2 }}>{f.emoji} {f.name}</h2>
          <div className="soft" style={{ fontSize: 12.5, fontWeight: 800 }}>осталось {days} дн.</div>
        </div>
        <span className="fest-tokens">🎟 {f.tokens}</span>
      </div>

      <div className="kicker" style={{ margin: '4px 0 8px' }}>Общая цель</div>
      <div className="fest-comm">
        <div className="fest-comm-t">{f.community.title}</div>
        <div className="q-bar" style={{ marginTop: 6 }}><div className="q-fill" style={{ width: `${cpct}%`, background: 'linear-gradient(90deg,#ffd166,#ff7a00)' }} /></div>
        <div className="fest-comm-f">
          <span>{f.community.value.toLocaleString('ru')} / {f.community.target.toLocaleString('ru')}</span>
          {f.community.reached && (f.community.claimed
            ? <span className="soft" style={{ fontWeight: 900 }}>✓ {f.community.rewardName}</span>
            : <button className="q-claim" onClick={() => void claimCommunity()}>Забрать «{f.community.rewardName}»</button>)}
        </div>
      </div>

      <div className="kicker" style={{ margin: '16px 0 8px' }}>Задания события</div>
      {f.quests.map(q => (
        <div className="q-row" key={q.id} style={{ borderTop: 'none' }}>
          <span className="q-emoji">{q.emoji}</span>
          <div className="q-tx">
            <div className="q-name" style={{ color: 'var(--ink)' }}>{q.title}</div>
            <div className="q-bar"><div className="q-fill" style={{ width: `${Math.round((q.progress / q.target) * 100)}%` }} /></div>
          </div>
          {q.claimed
            ? <span className="q-done" style={{ color: 'var(--green-deep)' }}>✓</span>
            : q.done
              ? <button className="q-claim" onClick={() => void claimQuest(q.id)}>+{q.tokens} 🎟</button>
              : <span className="q-prog" style={{ color: 'var(--ink-soft)' }}>{q.progress}/{q.target}</span>}
        </div>
      ))}

      <div className="kicker" style={{ margin: '16px 0 8px' }}>Магазин события</div>
      <div className="fest-shop">
        {f.shop.map(s => (
          <button key={s.itemId} className={`fest-item ${s.owned ? 'owned' : ''}`} disabled={s.owned} onClick={() => void buy(s.itemId)}>
            <span className="fest-item-n">{s.name}</span>
            {s.owned ? <span className="fest-item-p owned">Куплено</span> : <span className="fest-item-p">🎟 {s.tokens}</span>}
          </button>
        ))}
      </div>
    </>
  )
}

/** Иконка-подпись награды тира пропуска. */
function rewardChip(reward: { kind: string; amount?: number; count?: number; itemId?: string } | null): string {
  if (!reward) return '—'
  if (reward.kind === 'coins') return `${reward.amount} G`
  if (reward.kind === 'freeze') return `❄ ${reward.count}`
  return cosmeticById(reward.itemId ?? '')?.name ?? 'Предмет'
}

function SeasonPass() {
  const season = useStore(s => s.season)
  const claim = useStore(s => s.claimSeasonTier)
  const buyPremium = useStore(s => s.buyPremium)
  if (!season) return <p className="soft">Загрузка сезона…</p>
  const daysLeft = Math.max(0, Math.ceil((season.endsMs - Date.now()) / 86_400_000))
  return (
    <>
      <div className="sp-head">
        <div>
          <h2 style={{ marginBottom: 2 }}>{season.season.name}</h2>
          <div className="soft" style={{ fontSize: 12.5, fontWeight: 800 }}>Тир {season.tier}/{season.tiers} · осталось {daysLeft} дн.</div>
        </div>
        {season.premium
          ? <span className="sp-prem on">Премиум ✨</span>
          : <button className="sp-prem" onClick={() => void buyPremium()}>Премиум · {PASS_PREMIUM_STARS} ⭐</button>}
      </div>
      <div className="sp-legend"><span>Тир</span><span>Бесплатно</span><span>Премиум</span></div>
      <div className="sp-track">
        {season.rows.map(r => (
          <div className={`sp-row ${r.unlocked ? 'on' : ''}`} key={r.tier}>
            <span className="sp-tier">{r.tier}</span>
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
  if (!reward) return <span className="sp-cell empty">—</span>
  return (
    <button className={`sp-cell ${claimed ? 'claimed' : can ? 'can' : ''}`} disabled={!can} onClick={onClaim}>
      <span className="sp-rw">{rewardChip(reward)}</span>
      {claimed ? <span className="sp-tag">✓</span> : can ? <span className="sp-tag">забрать</span> : locked ? <span className="sp-tag">🔒</span> : null}
    </button>
  )
}

function About() {
  const catalog = useStore(s => s.catalog)
  return (
    <>
      <div className="splash-inner" style={{ marginBottom: 6 }}><BrandLogo size="small" /></div>
      <h2>Game is Game</h2>
      <p className="soft">Один аккаунт — все наши игры. Открываешь хаб, выбираешь игру, и она запускается сразу. Друзья, уровни и значки общие для всех игр.</p>
      <div style={{ marginTop: 8 }}>
        {catalog.map(g => (
          <div className="setting" key={g.id}>
            <div className="tx"><div className="t">{g.name}</div><div className="s">{g.blurb}</div></div>
          </div>
        ))}
      </div>
      <button className="btn block" style={{ marginTop: 14 }} onClick={() => useStore.setState({ sheet: null })}>Понятно</button>
    </>
  )
}

function Help() {
  return (
    <>
      <h2>Как это работает</h2>
      <p className="soft">Выбери игру в «Доме» — она откроется сразу. Добавляй друзей по коду, соревнуйся в «Ленте» и качай уровень за запуски игр.</p>
      <div style={{ marginTop: 8 }}>
        <div className="cmd"><code>/start</code><span>открыть хаб</span></div>
        <div className="cmd"><code>/play</code><span>открыть хаб</span></div>
        <div className="cmd"><code>/games</code><span>список игр</span></div>
        <div className="cmd"><code>/help</code><span>помощь</span></div>
      </div>
      <button className="btn block" style={{ marginTop: 16 }} onClick={() => useStore.setState({ sheet: null })}>Закрыть</button>
    </>
  )
}

function Settings() {
  const soundOn = useStore(s => s.soundOn)
  const toggleSound = useStore(s => s.toggleSound)
  const openSheet = useStore(s => s.openSheet)
  return (
    <>
      <h2>Настройки</h2>
      <div style={{ marginTop: 8 }}>
        <div className="setting">
          <div className="tx"><div className="t">Звук</div><div className="s">Тихие щелчки в интерфейсе</div></div>
          <button className={`switch ${soundOn ? 'on' : ''}`} onClick={toggleSound} aria-label="Звук"><i /></button>
        </div>
        <button className="setting" style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', borderBottom: '1.5px solid var(--line)' }} onClick={() => openSheet('about')}>
          <div className="tx"><div className="t">Об этом приложении</div><div className="s">Что такое Game is Game</div></div>
        </button>
        <button className="setting" style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }} onClick={() => openSheet('help')}>
          <div className="tx"><div className="t">Помощь</div><div className="s">Как пользоваться хабом</div></div>
        </button>
      </div>
      <div className="soft" style={{ textAlign: 'center', fontSize: 12.5, fontWeight: 700, marginTop: 16 }}>Сделано с любовью ♥</div>
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
    if (!ok) { showToast('Ник: 3–32 символа, латиница, цифры и _'); return }
    setBusy(true)
    const r = await chooseUsername(clean)
    setBusy(false)
    if (!r.ok) {
      showToast(r.error === 'username_taken' ? 'Этот ник уже занят — придумай другой'
        : r.error === 'username_locked' ? 'Ник уже закреплён'
        : 'Недопустимый ник')
    }
  }
  const toStyle = () => { onDone(); setTab('style') }

  return (
    <>
      <h2>Профиль</h2>

      {hasUsername ? (
        <>
          <div className="kicker" style={{ margin: '14px 0 8px' }}>Ник</div>
          <div className="uname-fixed">@{profile.username}</div>
          <p className="soft" style={{ marginTop: 10 }}>Ник берётся из твоего Telegram и общий для всех наших игр.</p>
        </>
      ) : (
        <>
          <div className="kicker" style={{ margin: '14px 0 8px' }}>Придумай ник</div>
          <div className="field">
            <span className="uname-at">@</span>
            <input
              className="input" value={uname} maxLength={32} autoFocus
              onChange={e => setUname(e.target.value)} placeholder="ник"
              autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="done"
              onKeyDown={e => { if (e.key === 'Enter' && ok) void save() }}
            />
          </div>
          <p className="soft" style={{ marginTop: 10 }}>
            В Telegram у тебя нет @username, поэтому выбери свой — 3–32 символа: латиница, цифры и «_».
            Его больше никто не сможет занять.
          </p>
          <button className="btn block" style={{ marginTop: 16 }} onClick={save} disabled={busy || !ok}>
            <CheckIcon /> Закрепить ник
          </button>
        </>
      )}

      <button className="btn block ghost" style={{ marginTop: 10 }} onClick={toStyle}>
        ✨ Сменить образ
      </button>
    </>
  )
}
