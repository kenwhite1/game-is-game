import { useEffect, useState } from 'react'
import { useStore, type Tab } from './store'
import { Home } from './screens/Home'
import { Friends } from './screens/Friends'
import { Activity } from './screens/Activity'
import { Style } from './screens/Style'
import { Profile } from './screens/Profile'
import { BrandLogo } from './screens/Logo'
import { TabIcons, CheckIcon } from './art/icons'

const TABS: { key: Tab; ru: string }[] = [
  { key: 'home', ru: 'Дом' },
  { key: 'friends', ru: 'Друзья' },
  { key: 'activity', ru: 'Лента' },
  { key: 'style', ru: 'Стиль' },
  { key: 'profile', ru: 'Профиль' },
]

export function App() {
  const ready = useStore(s => s.ready)
  const init = useStore(s => s.init)
  const tab = useStore(s => s.tab)
  const setTab = useStore(s => s.setTab)
  const toast = useStore(s => s.toast)

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
          {tab === 'friends' && <Friends />}
          {tab === 'activity' && <Activity />}
          {tab === 'style' && <Style />}
          {tab === 'profile' && <Profile />}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}

      <nav className="nav">
        <div className="nav-inner">
          {TABS.map(t => (
            <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)} aria-label={t.ru}>
              {TabIcons[t.key]}
              <span>{t.ru}</span>
            </button>
          ))}
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
  const saveProfile = useStore(s => s.saveProfile)
  const setTab = useStore(s => s.setTab)
  const [name, setName] = useState(profile.name)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    await saveProfile({ name: name.trim() || profile.name })
    setBusy(false)
    onDone()
  }
  const toStyle = () => { onDone(); setTab('style') }

  return (
    <>
      <h2>Имя профиля</h2>
      <div className="kicker" style={{ margin: '14px 0 8px' }}>Имя</div>
      <input className="input" value={name} maxLength={40} onChange={e => setName(e.target.value)} placeholder="Как тебя зовут" style={{ width: '100%', letterSpacing: 0 }} />
      <button className="btn block" style={{ marginTop: 16 }} onClick={save} disabled={busy}>
        <CheckIcon /> Сохранить
      </button>
      <button className="btn block ghost" style={{ marginTop: 10 }} onClick={toStyle}>
        ✨ Сменить образ
      </button>
    </>
  )
}
