import type { CSSProperties } from 'react'
import { useStore } from '../store'
import { Avatar } from '../art/Avatar'
import { GameTileIcon } from '../art/GameTileIcon'
import { SoundOnIcon, SoundOffIcon, HelpIcon, PlayIcon } from '../art/icons'
import { levelInfo } from '@shared/progression'
import { cosmeticById } from '@shared/cosmetics'
import type { BannerItem, TitleItem } from '@shared/cosmetics'
import type { GameCard } from '@shared/types'

type IconId = 'uno' | 'croco' | 'mafia' | 'pet'

export function bannerBg(id: string): string | undefined {
  const c = cosmeticById(id)
  return c && c.slot === 'banner' ? (c as BannerItem).bg : undefined
}
export function titleText(id: string): string {
  const c = cosmeticById(id)
  return c && c.slot === 'title' ? (c as TitleItem).text : 'Игрок'
}

function glow(hex: string, a = 0.22): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}
function gameStyle(card: GameCard): CSSProperties {
  return { '--a': card.accent, '--ad': card.accentDeep, '--glow': glow(card.accent) } as CSSProperties
}

export function Home() {
  const catalog = useStore(s => s.catalog)
  const profile = useStore(s => s.profile)
  const recent = useStore(s => s.recent)
  const soundOn = useStore(s => s.soundOn)
  const toggleSound = useStore(s => s.toggleSound)
  const openSheet = useStore(s => s.openSheet)
  const setTab = useStore(s => s.setTab)
  const launch = useStore(s => s.launch)

  const firstName = profile?.name ? profile.name.split(' ')[0] : null
  const recentCards = recent.map(id => catalog.find(g => g.id === id)).filter(Boolean) as GameCard[]
  const featured = recentCards[0] ?? catalog[0]
  const rest = catalog.filter(g => g.id !== featured?.id)

  return (
    <div className="tab-page stagger">
      <div className="topbar">
        <div className="hello">
          <div className="hi">{firstName ? 'С возвращением' : 'Привет 👋'}</div>
          <div className="nm">{firstName ?? 'Game is Game'}</div>
        </div>
        {profile && <button className="coin-chip" onClick={() => setTab('style')} aria-label="Магазин стиля"><span className="coin">G</span>{profile.coins.toLocaleString('ru')}</button>}
        <button className="iconbtn" onClick={toggleSound} aria-label="Звук">
          {soundOn ? <SoundOnIcon /> : <SoundOffIcon />}
        </button>
        <button className="iconbtn" onClick={() => openSheet('help')} aria-label="Помощь"><HelpIcon /></button>
      </div>

      {profile && <PlayerBanner onOpen={() => setTab('profile')} />}

      {recentCards.length > 0 && (
        <>
          <div className="sec"><h2>Продолжить</h2></div>
          <div className="strip">
            {recentCards.map(g => (
              <button key={g.id} className="chip-game" style={gameStyle(g)} onClick={() => launch(g)}>
                <GameTileIcon id={g.id as IconId} size={36} />
                <span className="nm">{g.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {featured && (
        <>
          <div className="sec"><h2>{recentCards.length ? 'Снова в деле' : 'Начни здесь'}</h2></div>
          <button className="feature" style={gameStyle(featured)} onClick={() => launch(featured)}>
            <GameTileIcon id={featured.id as IconId} size={76} />
            <span className="ft">
              <span className="t">{featured.name}</span>
              <span className="s">{featured.tagline}</span>
              <span className="play"><PlayIcon /> Играть</span>
            </span>
          </button>
        </>
      )}

      <div className="sec"><h2>Все игры</h2><span className="sub">{catalog.length} игры</span></div>
      {catalog.length === 0 && (
        <div className="empty"><div className="em">🎮</div><div className="t">Игры скоро появятся</div><div className="s">Загружаем игровую — загляни через минуту.</div></div>
      )}
      <div className="game-grid">
        {rest.map(g => (
          <button key={g.id} className="game-card" style={gameStyle(g)} onClick={() => launch(g)} aria-label={`Открыть ${g.name}`}>
            {recent[0] === g.id && <span className="gc-flag">Недавнее</span>}
            <span className="gc-icon"><GameTileIcon id={g.id as IconId} size={58} /></span>
            <span className="gc-title">{g.name}</span>
            <span className="gc-sub">{g.tagline}</span>
            <span className="gc-play"><PlayIcon /> Играть</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function PlayerBanner({ onOpen }: { onOpen(): void }) {
  const profile = useStore(s => s.profile)!
  const lv = levelInfo(profile.xp)
  return (
    <button className="banner" onClick={onOpen} style={{ border: 'none', cursor: 'pointer', background: bannerBg(profile.banner) }}>
      <div className="banner-top">
        <Avatar
          avatar={profile.avatar} frame={profile.frame} hat={profile.hat}
          eyewear={profile.eyewear} effect={profile.effect} companion={profile.companion}
          seed={profile.id} size={56} ring={false}
        />
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <div className="nm2">{profile.name}</div>
          <div className="tag2">{titleText(profile.title)}</div>
        </div>
        <span style={{ fontSize: 13, fontWeight: 900, background: 'rgba(255,255,255,.2)', padding: '6px 12px', borderRadius: 999, boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,.35)' }}>
          Ур. {lv.level}
        </span>
      </div>
      <div className="xp">
        <div className="xp-row">
          <span className="l">Уровень {lv.level}</span>
          <span className="r">{lv.into} / {lv.span} XP</span>
        </div>
        <div className="xp-bar"><div className="xp-fill" style={{ width: `${Math.round(lv.pct * 100)}%` }} /></div>
      </div>
    </button>
  )
}
