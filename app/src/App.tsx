import { useEffect } from 'react'
import { useStore } from './store'
import { Home } from './screens/Home'
import { HeroFan } from './screens/Logo'
import { GameIcon } from './art/GameIcon'

type IconId = 'uno' | 'croco' | 'mafia' | 'pet'

export function App() {
  const ready = useStore(s => s.ready)
  const init = useStore(s => s.init)

  useEffect(() => { init() }, [init])

  if (!ready) {
    return (
      <div className="app">
        <div className="launcher" style={{ justifyContent: 'center' }}>
          <div className="brand" style={{ animation: 'pop .6s ease both' }}>
            <HeroFan />
            <div className="brand-name">Game<span className="sm">is</span>Game</div>
            <div className="brand-tag">Открываем игровую…</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <Home />
      <Sheets />
    </div>
  )
}

function Sheets() {
  const sheet = useStore(s => s.sheet)
  const catalog = useStore(s => s.catalog)
  const close = () => useStore.setState({ sheet: null })

  if (!sheet) return null

  return (
    <div className="scrim" onClick={close}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-grip" />

        {sheet === 'about' && (
          <>
            <div className="sheet-hero">
              <HeroFan />
              <h2>Game is Game</h2>
            </div>
            <p className="soft" style={{ textAlign: 'center' }}>
              Одно приложение со всеми нашими играми. Выбираешь игру и она открывается сразу.
            </p>
            <div className="about-list">
              {catalog.map(g => (
                <div className="about-row" key={g.id}>
                  <GameIcon id={g.id as IconId} size={42} />
                  <div className="tx">
                    <div className="tt">{g.name}</div>
                    <div className="bb">{g.blurb}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn block lg" style={{ marginTop: 12 }} onClick={close}>Понятно</button>
          </>
        )}

        {sheet === 'help' && (
          <>
            <div className="sheet-hero">
              <HeroFan />
              <h2>Как это работает</h2>
            </div>
            <p className="soft" style={{ textAlign: 'center' }}>
              Нажми на игру в меню, и она запустится сразу. Все игры собраны в одном месте, переключаться между ними легко.
            </p>
            <div style={{ marginTop: 10 }}>
              <div className="cmd"><code>/start</code><span>открыть меню игр</span></div>
              <div className="cmd"><code>/play</code><span>открыть меню игр</span></div>
              <div className="cmd"><code>/games</code><span>список игр</span></div>
              <div className="cmd"><code>/about</code><span>об этом приложении</span></div>
              <div className="cmd"><code>/help</code><span>помощь</span></div>
            </div>
            <button className="btn block lg" style={{ marginTop: 18 }} onClick={close}>Закрыть</button>
          </>
        )}
      </div>
    </div>
  )
}
