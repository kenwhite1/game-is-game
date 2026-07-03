import { useState, type CSSProperties } from 'react'
import { useStore } from '../store'
import { Avatar } from '../art/Avatar'
import { EditIcon, CopyIcon, SettingsIcon } from '../art/icons'
import { copyText } from '../telegram'
import { levelInfo } from '@shared/progression'
import { bannerBg, titleText } from './Home'
import { TIER_META } from '@shared/achievements'
import type { AchView } from '@shared/achievements'
import type { GameCard } from '@shared/types'

function gameStyle(card?: GameCard): CSSProperties {
  return { '--a': card?.accent ?? 'var(--blue)', '--ad': card?.accentDeep ?? 'var(--blue-deep)' } as CSSProperties
}

export function Profile() {
  const profile = useStore(s => s.profile)
  const detail = useStore(s => s.detail)
  const catalog = useStore(s => s.catalog)
  const openSheet = useStore(s => s.openSheet)
  const setTab = useStore(s => s.setTab)
  const showToast = useStore(s => s.showToast)
  const prestige = useStore(s => s.prestige)
  const repairStreak = useStore(s => s.repairStreak)

  if (!profile) {
    return <div className="tab-page"><div className="empty"><div className="em">👤</div><div className="t">Загрузка профиля…</div></div></div>
  }

  const lv = levelInfo(profile.xp)
  const stats = detail?.stats ?? []
  const badges = detail?.badges ?? []
  const earned = badges.filter(b => b.earned).length
  const maxOpens = Math.max(1, ...stats.map(s => s.opens))

  const onCopy = async () => {
    const ok = await copyText(profile.friendCode)
    showToast(ok ? 'Код скопирован ✨' : profile.friendCode)
  }

  return (
    <div className="tab-page stagger">
      <div className="topbar">
        <div className="hello"><div className="hi">Хаб</div><div className="nm">Профиль</div></div>
        <button className="coin-chip" onClick={() => setTab('style')} aria-label="Магазин стиля"><span className="coin">G</span>{profile.coins.toLocaleString('ru')}</button>
        <button className="iconbtn" onClick={() => openSheet('settings')} aria-label="Настройки"><SettingsIcon /></button>
      </div>

      {/* identity card */}
      <div className="banner" style={{ background: bannerBg(profile.banner) }}>
        <div className="banner-top">
          <button onClick={() => setTab('style')} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }} aria-label="Открыть аватар">
            <Avatar
              color={profile.color} face={profile.face} frame={profile.frame} hat={profile.hat}
              eyewear={profile.eyewear} effect={profile.effect} companion={profile.companion}
              recolors={profile.recolors} seed={profile.id} size={64} ring={false}
            />
          </button>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div className="nm2">{profile.username ? `@${profile.username}` : profile.name}</div>
            <div className="tag2">{titleText(profile.title)}</div>
          </div>
          {profile.prestige > 0 && <span className="streak-chip" title={`Престиж ${profile.prestige}`}>⭐ {profile.prestige}</span>}
          {profile.streak > 0 && <span className={`streak-chip ${profile.streakPerfect ? 'streak-gold' : ''}`} title={profile.streakPerfect ? `Идеальная серия: ${profile.streak} дн. — ни одной заморозки` : `Серия: ${profile.streak} дн.`}>🔥 {profile.streak}</span>}
          <button className="banner-edit" onClick={() => openSheet('editProfile')} aria-label="Редактировать имя">
            <EditIcon />
          </button>
        </div>
        <div className="xp">
          <div className="xp-row">
            <span className="l">Уровень {lv.level}</span>
            <span className="r">{lv.into} / {lv.span} XP</span>
          </div>
          <div className="xp-bar"><div className="xp-fill" style={{ width: `${Math.round(lv.pct * 100)}%` }} /></div>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat"><div className="v">{lv.level}</div><div className="k">Уровень{profile.prestige > 0 ? ` · ⭐${profile.prestige}` : ''}</div></div>
        <div className="stat"><div className="v">🔥 {profile.streak}</div><div className="k">Серия{profile.streakBest > profile.streak ? ` · рек. ${profile.streakBest}` : ''}</div></div>
        <div className="stat"><div className="v">{detail?.friendCount ?? 0}</div><div className="k">Друзей</div></div>
      </div>

      {profile.streakRepair && (
        <div className="repair-card">
          <div className="rc-tx">🔧 Серия <b>{profile.streakRepair.value} дней</b> порвалась — восстанови за 24 ч!</div>
          <div className="rc-btns">
            <button className="btn sm" disabled={!profile.streakRepair.canPlayFree} onClick={() => void repairStreak('play')}>
              {profile.streakRepair.canPlayFree ? '▶ 3 игры — даром' : `▶ Игры ${profile.streakRepair.plays}/${profile.streakRepair.playsNeeded}`}
            </button>
            <button className="btn sm accent" onClick={() => void repairStreak('pay')}>💰 {profile.streakRepair.cost} Game</button>
          </div>
        </div>
      )}

      {lv.level >= 100 && (
        <button className="btn block" style={{ marginBottom: 13, background: 'linear-gradient(135deg,#ffd166,#ff9d00)', boxShadow: '0 4px 0 #d99a1f', color: '#2a1640' }} onClick={() => void prestige()}>
          ⭐ Престиж — сбросить уровень за звезду
        </button>
      )}

      <button className="row" onClick={onCopy} style={{ cursor: 'pointer', textAlign: 'left' }}>
        <div className="tx">
          <div className="s" style={{ color: 'var(--blue-deep)', fontWeight: 900, letterSpacing: 1 }}>КОД ДРУГА</div>
          <div className="t" style={{ fontSize: 19, letterSpacing: 2 }}>{profile.friendCode}</div>
        </div>
        <span className="iconbtn" style={{ width: 38, height: 38, color: 'var(--blue-deep)' }}><CopyIcon /></span>
      </button>

      {stats.some(s => s.opens > 0) && (
        <>
          <div className="sec"><h2>Статистика игр</h2></div>
          <div className="card">
            {stats.map(s => {
              const card = catalog.find(g => g.id === s.id)
              return (
                <div className="gstat" key={s.id} style={gameStyle(card)}>
                  <span className="nm">{card?.name ?? s.id}</span>
                  <span className="track"><span className="bar" style={{ width: `${Math.round((s.opens / maxOpens) * 100)}%` }} /></span>
                  <span className="n">{s.opens}</span>
                </div>
              )
            })}
          </div>
        </>
      )}

      <Achievements />

      <div className="sec"><h2>Значки</h2><span className="sub">{earned} / {badges.length}</span></div>
      <div className="badge-grid">
        {badges.map(b => (
          <div className={`badge ${b.earned ? '' : 'locked'}`} key={b.id}>
            <span className="em">{b.emoji}</span>
            <div style={{ minWidth: 0 }}>
              <div className="bt">{b.name}</div>
              <div className="bd">{b.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Одна «лесенка» достижения: текущий тир, прогресс к следующему, редкость. */
function AchievementCard({ a }: { a: AchView }) {
  const done = a.tierReached >= 0
  const nextIdx = Math.min(a.tierReached + 1, a.rungs.length - 1)
  const maxed = a.tierReached >= a.rungs.length - 1
  const next = a.rungs[nextIdx]
  const cur = done ? a.rungs[a.tierReached] : null
  const tierEmoji = done ? TIER_META[cur!.tier].emoji : '🔒'
  const prevTarget = a.tierReached >= 0 ? a.rungs[a.tierReached].target : 0
  const span = Math.max(1, next.target - (maxed ? 0 : prevTarget))
  const into = Math.min(a.value, next.target) - (maxed ? 0 : prevTarget)
  const pct = maxed ? 100 : Math.max(0, Math.min(100, Math.round((into / span) * 100)))
  const rare = done && a.rarity > 0 && a.rarity < 0.05
  const masked = a.hidden && !done // §6.3: скрытые достижения — «???» до открытия
  return (
    <div className={`ach ${done ? 'on' : ''} ${rare ? 'rare' : ''}`}>
      <span className="ach-em">{masked ? '❓' : tierEmoji}</span>
      <div className="ach-tx">
        <div className="ach-top">
          <span className="ach-title">{done ? cur!.name : masked ? 'Секрет' : a.title}</span>
          {rare && <span className="ach-rare">редкое · {Math.round(a.rarity * 100)}%</span>}
        </div>
        <div className="ach-desc">{masked ? 'Скрытое достижение — открой, чтобы узнать' : maxed ? 'Максимум взят' : a.desc}</div>
        {!masked && (
          <>
            <div className="ach-bar"><div className="ach-fill" style={{ width: `${pct}%` }} /></div>
            <div className="ach-n">{maxed ? `${a.value}` : `${Math.min(a.value, next.target)} / ${next.target}`}</div>
          </>
        )}
      </div>
    </div>
  )
}

/** Взятые и близкие к цели — вперёд; затем по прогрессу. */
function byProgress(x: AchView, y: AchView): number {
  if ((y.tierReached >= 0 ? 1 : 0) !== (x.tierReached >= 0 ? 1 : 0)) return y.tierReached - x.tierReached
  const px = x.value / (x.rungs[Math.min(x.tierReached + 1, x.rungs.length - 1)].target || 1)
  const py = y.value / (y.rungs[Math.min(y.tierReached + 1, y.rungs.length - 1)].target || 1)
  return py - px
}

function Achievements() {
  const ach = useStore(s => s.achievements)
  const catalog = useStore(s => s.catalog)
  const [open, setOpen] = useState<Set<string>>(new Set())
  if (!ach || ach.items.length === 0) return null

  // Кросс-игровые (без gameId) — отдельной сеткой; уровня игры — по играм.
  const cross = ach.items.filter(a => !a.gameId).sort(byProgress)
  const byGame = new Map<string, AchView[]>()
  for (const a of ach.items) {
    if (!a.gameId) continue
    const list = byGame.get(a.gameId) ?? []
    list.push(a)
    byGame.set(a.gameId, list)
  }
  const cardOf = new Map(catalog.map(c => [c.id, c]))
  // Порядок игр: сперва с прогрессом, затем по каталогу.
  const games = [...byGame.keys()]
    .map((id, i) => {
      const items = byGame.get(id)!
      const earned = items.reduce((n, a) => n + Math.max(0, a.tierReached + 1), 0)
      const total = items.reduce((n, a) => n + a.rungs.length, 0)
      const mastered = items.some(a => a.id === `${id}_master` && a.tierReached >= 0)
      return { id, items, earned, total, mastered, i }
    })
    .sort((a, b) => (b.earned - a.earned) || (a.i - b.i))
  const toggle = (id: string) => setOpen(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  return (
    <>
      <div className="sec">
        <h2>Достижения</h2>
        <span className="sub">GG {ach.score.toLocaleString('ru')} · {ach.unlocked}/{ach.total}</span>
      </div>
      <div className="ach-grid">
        {cross.map(a => <AchievementCard key={a.id} a={a} />)}
      </div>

      <div className="sec"><h2>По играм</h2><span className="sub">{games.length} игр</span></div>
      <div className="ach-games">
        {games.map(g => {
          const card = cardOf.get(g.id)
          const isOpen = open.has(g.id)
          return (
            <div className="ach-game" key={g.id}>
              <button className={`ach-game-h ${g.mastered ? 'mst' : ''}`} onClick={() => toggle(g.id)} style={gameStyle(card)}>
                <span className="em">{card?.emoji ?? '🎮'}</span>
                <span className="nm">{card?.name ?? g.id}</span>
                {g.mastered && <span className="crown">💎</span>}
                <span className="cnt">{g.earned}/{g.total}</span>
                <span className="chev">{isOpen ? '▾' : '▸'}</span>
              </button>
              {isOpen && (
                <div className="ach-grid" style={{ marginTop: 10 }}>
                  {[...g.items].sort(byProgress).map(a => <AchievementCard key={a.id} a={a} />)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
