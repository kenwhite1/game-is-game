import type { CSSProperties } from 'react'
import { useStore } from '../store'
import { BrandLogo } from './Logo'
import { GameIcon } from '../art/GameIcon'
import { SoundOnIcon, SoundOffIcon, InfoIcon, HelpIcon, ChevronIcon } from '../art/icons'
import { APP_TAG } from '../brand'
import type { GameCard } from '@shared/types'

type IconId = 'uno' | 'croco' | 'mafia' | 'pet'

export function Home() {
  const catalog = useStore(s => s.catalog)
  const profile = useStore(s => s.profile)
  const recent = useStore(s => s.recent)
  const soundOn = useStore(s => s.soundOn)
  const toggleSound = useStore(s => s.toggleSound)
  const openSheet = useStore(s => s.openSheet)
  const recentTop = recent[0] ?? null
  const firstName = profile?.name ? profile.name.split(' ')[0] : null

  return (
    <div className="launcher rise">
      <div className="topbar">
        <div className="brandmark">GG</div>
        <div className="topbar-actions">
          <button className="icon-btn" onClick={toggleSound} aria-label={soundOn ? 'Выключить звук' : 'Включить звук'}>
            {soundOn ? <SoundOnIcon /> : <SoundOffIcon />}
          </button>
          <button className="icon-btn" onClick={() => openSheet('help')} aria-label="Помощь"><HelpIcon /></button>
        </div>
      </div>

      <div className="brand">
        <BrandLogo />
        <div className="brand-tag">{APP_TAG}</div>
      </div>

      {firstName && <div className="greet">С возвращением, <b>{firstName}</b></div>}

      <div className="section-label">Выбери игру</div>

      <div className="game-list">
        {catalog.map(g => (
          <GameRow key={g.id} game={g} recent={g.id === recentTop} />
        ))}
      </div>

      <div className="foot">
        <button className="foot-btn" onClick={() => openSheet('about')}><InfoIcon /> Об этом</button>
        <button className="foot-btn" onClick={() => openSheet('help')}><HelpIcon /> Помощь</button>
      </div>

      <div className="foot-note">Сделано с любовью <span className="heart">♥</span></div>
    </div>
  )
}

function GameRow({ game, recent }: { game: GameCard; recent: boolean }) {
  const launch = useStore(s => s.launch)
  const style = { '--a': game.accent, '--glow': hexGlow(game.accent) } as CSSProperties
  return (
    <button className="game-row" style={style} onClick={() => launch(game)} aria-label={`Открыть: ${game.name}`}>
      <span className="gi-wrap"><GameIcon id={game.id as IconId} size={60} /></span>
      <span className="gr-text">
        <span className="gr-title">{game.name}{recent && <span className="recent-chip">Недавнее</span>}</span>
        <span className="gr-sub">{game.tagline}</span>
      </span>
      <span className="gr-go"><ChevronIcon /></span>
    </button>
  )
}

// мягкое цветное свечение из hex акцента
function hexGlow(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},.42)`
}
