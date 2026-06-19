import type { CSSProperties } from 'react'
import { useStore } from '../store'
import { Avatar } from '../art/Avatar'
import { EditIcon, CopyIcon, SettingsIcon } from '../art/icons'
import { copyText } from '../telegram'
import { levelInfo } from '@shared/progression'
import { bannerBg, titleText } from './Home'
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
          <button onClick={() => setTab('style')} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }} aria-label="Открыть стиль">
            <Avatar
              avatar={profile.avatar} frame={profile.frame} hat={profile.hat}
              eyewear={profile.eyewear} effect={profile.effect} companion={profile.companion}
              seed={profile.id} size={62} ring={false}
            />
          </button>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div className="nm2">{profile.name}</div>
            <div className="tag2">{titleText(profile.title)}</div>
          </div>
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
        <div className="stat"><div className="v">{lv.level}</div><div className="k">Уровень</div></div>
        <div className="stat"><div className="v">{profile.opens}</div><div className="k">Запусков</div></div>
        <div className="stat"><div className="v">{detail?.friendCount ?? 0}</div><div className="k">Друзей</div></div>
      </div>

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
