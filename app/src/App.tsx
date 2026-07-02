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
      </div>
    </div>
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
