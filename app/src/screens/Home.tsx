import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useStore } from '../store'
import { Avatar } from '../art/Avatar'
import { GameTileIcon } from '../art/GameTileIcon'
import { PlayIcon } from '../art/icons'
import { levelInfo } from '@shared/progression'
import { cosmeticById } from '@shared/cosmetics'
import type { BannerItem, TitleItem } from '@shared/cosmetics'
import { CATEGORIES, categoryRu, type Category } from '@shared/games'
import type { GameCard, Quest } from '@shared/types'
import { shareInvite } from '../telegram'
import { isOnline } from '../util'

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

/** «5 игр», «31 игра», «2 игры» — русские формы множественного числа. */
function ruGames(n: number): string {
  const d10 = n % 10, d100 = n % 100
  const word = d10 === 1 && d100 !== 11 ? 'игра'
    : d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14) ? 'игры'
    : 'игр'
  return `${n} ${word}`
}

type Filter = Category | 'all' | 'fav'

export function Home() {
  const catalog = useStore(s => s.catalog)
  const profile = useStore(s => s.profile)
  const recent = useStore(s => s.recent)
  const favorites = useStore(s => s.favorites)
  const friends = useStore(s => s.friends)
  const quests = useStore(s => s.quests)
  const meta = useStore(s => s.meta)
  const toggleFavorite = useStore(s => s.toggleFavorite)
  const openGameSheet = useStore(s => s.openGameSheet)
  const setTab = useStore(s => s.setTab)
  const launch = useStore(s => s.launch)

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const recentCards = recent.map(id => catalog.find(g => g.id === id)).filter(Boolean) as GameCard[]

  // Глобальные чарты: топ по запускам всех игроков (пустые в новых инсталляциях).
  const popular = useMemo(() => {
    return catalog
      .map(g => ({ g, n: meta[g.id]?.opens ?? 0 }))
      .filter(x => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 8)
      .map(x => x.g)
  }, [catalog, meta])

  const q = query.trim().toLowerCase()
  const browsing = q !== '' || filter !== 'all'
  const filtered = catalog.filter(g => {
    if (filter === 'fav' && !favorites.includes(g.id)) return false
    if (filter !== 'all' && filter !== 'fav' && g.category !== filter) return false
    if (q && !g.name.toLowerCase().includes(q) && !g.tagline.toLowerCase().includes(q)) return false
    return true
  })

  const featured = recentCards[0] ?? catalog[0]
  const grid = browsing ? filtered : catalog.filter(g => g.id !== featured?.id)
  const onlineFriends = friends.filter(f => f.playing || isOnline(f.lastSeen)).slice(0, 8)

  // «Похоже на X»: игры той же категории, что и последняя запущенная,
  // которые игрок ещё не пробовал. Считается на клиенте, свежие сверху чартов.
  const similar = useMemo(() => {
    const anchor = recentCards[0]
    if (!anchor) return []
    const tried = new Set(recent)
    return catalog
      .filter(g => g.category === anchor.category && g.id !== anchor.id && !tried.has(g.id))
      .sort((a, b) => (meta[b.id]?.opens ?? 0) - (meta[a.id]?.opens ?? 0))
      .slice(0, 6)
  }, [catalog, recentCards, recent, meta])

  return (
    <div className="tab-page stagger">
      {profile && <PlayerBanner onOpen={() => setTab('profile')} />}

      <GameOfWeekCard />

      {profile && <FestivalCard />}
      {profile && <SeasonCard />}
      {profile && quests.length > 0 && <QuestsCard />}
      {profile && <WeeklyCard />}

      <div className="search-row">
        <span className="search-ic">🔍</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Найти игру…"
          aria-label="Поиск по играм"
          enterKeyHint="search"
        />
        {query && <button className="search-x" onClick={() => setQuery('')} aria-label="Очистить">✕</button>}
      </div>

      <div className="cat-chips">
        <button className={`chip-cat ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Все</button>
        <button className={`chip-cat ${filter === 'fav' ? 'active' : ''}`} onClick={() => setFilter('fav')}>⭐ Избранное</button>
        {CATEGORIES.map(c => (
          <button key={c.id} className={`chip-cat ${filter === c.id ? 'active' : ''}`} onClick={() => setFilter(c.id)}>
            {c.emoji} {c.ru}
          </button>
        ))}
      </div>

      {!browsing && onlineFriends.length > 0 && (
        <>
          <div className="sec"><h2>Друзья в сети 🟢</h2></div>
          <div className="strip">
            {onlineFriends.map(f => {
              const liveId = f.playing ?? f.lastGame
              const game = liveId ? catalog.find(g => g.id === liveId) : null
              const label = f.playing ? `играет · зайти` : game ? `в ${game.name} · зайти` : 'в сети'
              return (
                <button
                  key={f.id} className="chip-game chip-friend" style={game ? gameStyle(game) : undefined}
                  onClick={() => { if (game) launch(game); else setTab('friends') }}
                  aria-label={game ? `${f.name}: ${game.name}, зайти` : f.name}
                >
                  <Avatar look={f.look} seed={f.id} size={34} />
                  <span className="of-tx">
                    <span className="nm">{f.name.split(' ')[0]}</span>
                    <span className="of-sub">{f.playing && game ? `🟢 в ${game.name}` : label}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {!browsing && recentCards.length > 0 && (
        <>
          <div className="sec"><h2>Продолжить</h2></div>
          <div className="strip">
            {recentCards.map(g => (
              <button key={g.id} className="chip-game" style={gameStyle(g)} onClick={() => launch(g)}>
                <GameTileIcon id={g.id} emoji={g.emoji} size={36} />
                <span className="nm">{g.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {!browsing && popular.length > 0 && (
        <>
          <div className="sec"><h2>Популярное <img src="https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f525.png" alt="🔥" style={{ width: 19, height: 19, verticalAlign: -3, display: 'inline-block' }} /></h2></div>
          <div className="strip">
            {popular.map(g => (
              <button key={g.id} className="chip-game" style={gameStyle(g)} onClick={() => launch(g)}>
                <GameTileIcon id={g.id} emoji={g.emoji} size={36} />
                <span className="nm">{g.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {!browsing && similar.length > 0 && (
        <>
          <div className="sec"><h2>Похоже на «{recentCards[0]!.name}»</h2></div>
          <div className="strip">
            {similar.map(g => (
              <button key={g.id} className="chip-game" style={gameStyle(g)} onClick={() => launch(g)}>
                <GameTileIcon id={g.id} emoji={g.emoji} size={36} />
                <span className="nm">{g.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {!browsing && featured && (
        <>
          <div className="sec"><h2>{recentCards.length ? 'Снова в деле' : 'Начни здесь'}</h2></div>
          <button className="feature" style={gameStyle(featured)} onClick={() => launch(featured)}>
            <GameTileIcon id={featured.id} emoji={featured.emoji} size={76} />
            <span className="ft">
              <span className="t">{featured.name}</span>
              <span className="s">{featured.tagline}</span>
              <span className="play"><PlayIcon /> Играть</span>
            </span>
          </button>
        </>
      )}

      <div className="sec">
        <h2>{browsing ? 'Найдено' : 'Все игры'}</h2>
        <span className="sub">{ruGames(browsing ? filtered.length : catalog.length)}</span>
      </div>
      {grid.length === 0 && (
        <div className="empty">
          <div className="em">{filter === 'fav' ? '⭐' : '🔎'}</div>
          <div className="t">{filter === 'fav' ? 'В избранном пусто' : 'Ничего не нашлось'}</div>
          <div className="s">{filter === 'fav' ? 'Отмечай игры звёздочкой, и они соберутся здесь.' : 'Попробуй другое название или сними фильтры.'}</div>
        </div>
      )}
      <div className="game-grid">
        {grid.map(g => (
          <div key={g.id} className="game-card" style={gameStyle(g)} onClick={() => launch(g)} role="button" tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') launch(g) }} aria-label={`Открыть ${g.name}`}>
            <button
              className={`gc-star ${favorites.includes(g.id) ? 'on' : ''}`}
              onClick={e => { e.stopPropagation(); void toggleFavorite(g.id) }}
              aria-label={favorites.includes(g.id) ? 'Убрать из избранного' : 'В избранное'}
            >★</button>
            {recent[0] === g.id ? <span className="gc-flag">Недавнее</span>
              : g.adult ? <span className="gc-flag gc-flag--18">18+</span> : null}
            <span className="gc-icon"><GameTileIcon id={g.id} emoji={g.emoji} size={58} /></span>
            <span className="gc-title">{g.name}</span>
            <span className="gc-sub">{g.tagline}</span>
            <span className="gc-foot">
              <span className="gc-play"><PlayIcon /> Играть</span>
              <button className="gc-info" onClick={e => { e.stopPropagation(); openGameSheet(g.id) }} aria-label={`Об игре ${g.name}`}>i</button>
            </span>
          </div>
        ))}
      </div>

      <GameSheet />
    </div>
  )
}

/** Карточка игры: описание, статистика, оценка, избранное, запуск. */
function GameSheet() {
  const id = useStore(s => s.gameSheet)
  const catalog = useStore(s => s.catalog)
  const meta = useStore(s => s.meta)
  const ratings = useStore(s => s.ratings)
  const favorites = useStore(s => s.favorites)
  const follows = useStore(s => s.follows)
  const botUsername = useStore(s => s.botUsername)
  const rate = useStore(s => s.rate)
  const toggleFavorite = useStore(s => s.toggleFavorite)
  const toggleFollow = useStore(s => s.toggleFollow)
  const openGameSheet = useStore(s => s.openGameSheet)
  const launch = useStore(s => s.launch)

  const g = id ? catalog.find(x => x.id === id) : null
  if (!g) return null

  const m = meta[g.id] ?? { opens: 0, likes: 0, dislikes: 0, followers: 0, playing: 0 }
  const votes = m.likes + m.dislikes
  const likePct = votes > 0 ? Math.round((m.likes / votes) * 100) : null
  const my = ratings[g.id]
  const fav = favorites.includes(g.id)
  const followed = follows.includes(g.id)
  const playersRu = g.players === 'solo' ? 'Одиночная' : g.players === 'multi' ? 'С друзьями' : 'Один и с друзьями'

  return (
    <div className="scrim" onClick={() => openGameSheet(null)}>
      <div className="sheet" onClick={e => e.stopPropagation()} style={gameStyle(g)}>
        <div className="grip" />
        <div className="gsheet-head">
          <GameTileIcon id={g.id} emoji={g.emoji} size={64} />
          <div className="tx">
            <h2>{g.name}</h2>
            <div className="s">{g.tagline}</div>
          </div>
        </div>
        <div className="gsheet-tags">
          <span className="tag-pill">{categoryRu(g.category)}</span>
          <span className="tag-pill">{playersRu}</span>
          {g.adult && <span className="tag-pill warn">18+</span>}
        </div>
        <p className="soft">{g.blurb}</p>
        <div className="gsheet-stats">
          {m.playing > 0 && <span>🟢 {m.playing} в игре</span>}
          <span>🚀 {m.opens.toLocaleString('ru')} {m.opens === 1 ? 'запуск' : 'запусков'}</span>
          <span>{likePct !== null ? `👍 ${likePct}% (${votes})` : '👍 Оцени первым'}</span>
        </div>
        <div className="rate-row">
          <button className={`rate-btn ${my === 1 ? 'on-like' : ''}`} onClick={() => void rate(g.id, my === 1 ? 0 : 1)}>
            👍 Нравится{m.likes > 0 ? ` · ${m.likes}` : ''}
          </button>
          <button className={`rate-btn ${my === -1 ? 'on-dislike' : ''}`} onClick={() => void rate(g.id, my === -1 ? 0 : -1)}>
            👎 Не очень{m.dislikes > 0 ? ` · ${m.dislikes}` : ''}
          </button>
        </div>
        <div className="rate-row" style={{ marginTop: 10 }}>
          <button className={`rate-btn ${fav ? 'on-fav' : ''}`} onClick={() => void toggleFavorite(g.id)}>
            {fav ? '⭐ В избранном' : '☆ В избранное'}
          </button>
          <button className={`rate-btn ${followed ? 'on-fav' : ''}`} onClick={() => void toggleFollow(g.id)}>
            {followed ? '🔔 Слежу' : '🔕 Следить'}{m.followers > 0 ? ` · ${m.followers}` : ''}
          </button>
        </div>
        <button
          className="rate-btn fav-row"
          onClick={() => shareInvite(
            `https://t.me/${botUsername}?startapp=${g.id}`,
            `Играю в «${g.name}» в Game is Game — залетай! 🎮`,
          )}
        >📤 Поделиться с друзьями</button>
        <button className="btn accent" style={{ width: '100%', marginTop: 10 }} onClick={() => { openGameSheet(null); launch(g) }}>
          <PlayIcon /> Играть
        </button>
      </div>
    </div>
  )
}

/** Задания дня: три квеста, прогресс и кнопка «Забрать» за выполненные. */
function QuestRow({ q, onReroll }: { q: Quest; onReroll?: () => void }) {
  const claimQuest = useStore(s => s.claimQuest)
  return (
    <div className="q-row">
      <span className="q-emoji">{q.emoji}</span>
      <div className="q-tx">
        <div className="q-name">{q.title}</div>
        <div className="q-bar"><div className="q-fill" style={{ width: `${Math.round((q.progress / q.target) * 100)}%` }} /></div>
      </div>
      {q.claimed
        ? <span className="q-done">✓</span>
        : q.done
          ? <button className="q-claim" onClick={() => void claimQuest(q.id)}>+{q.reward} G</button>
          : <span className="q-right">
              <span className="q-prog">{q.progress}/{q.target}</span>
              {onReroll && <button className="q-reroll" onClick={onReroll} aria-label="Заменить задание">♻</button>}
            </span>}
    </div>
  )
}

function QuestsCard() {
  const quests = useStore(s => s.quests)
  const rerollsLeft = useStore(s => s.rerollsLeft)
  const rerollQuest = useStore(s => s.rerollQuest)
  const unclaimed = quests.filter(q => q.done && !q.claimed).length
  return (
    <div className="card quests">
      <div className="q-head">
        <span className="q-title-main">Задания дня</span>
        <span className="q-sub">{unclaimed > 0 ? `можно забрать: ${unclaimed}` : rerollsLeft > 0 ? 'замена: 1 бесплатно' : 'новые каждый день'}</span>
      </div>
      {quests.map(q => (
        <QuestRow key={q.id} q={q} onReroll={() => void rerollQuest(q.id)} />
      ))}
    </div>
  )
}

/** Игра недели: одна игра из каталога, детерминированно ротируется раз в неделю.
 *  Неделя привязана к эпохе Unix (шаг 7 дней), поэтому выбор стабилен всю неделю
 *  и одинаков на всех устройствах — без обращения к серверу. */
function GameOfWeekCard() {
  const catalog = useStore(s => s.catalog)
  const launch = useStore(s => s.launch)
  const openGameSheet = useStore(s => s.openGameSheet)
  const pick = useMemo(() => {
    if (catalog.length === 0) return null
    const week = Math.floor(Date.now() / 604_800_000)
    return catalog[week % catalog.length]
  }, [catalog])
  if (!pick) return null
  return (
    <div
      className="gotw" style={gameStyle(pick)} onClick={() => launch(pick)}
      role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') launch(pick) }}
      aria-label={`Игра недели: ${pick.name}`}
    >
      <span className="gotw-ribbon">⭐ Игра недели</span>
      <button className="gotw-info" onClick={e => { e.stopPropagation(); openGameSheet(pick.id) }} aria-label={`Об игре ${pick.name}`}>i</button>
      <GameTileIcon id={pick.id} emoji={pick.emoji} size={74} />
      <span className="gotw-tx">
        <span className="gotw-name">{pick.name}</span>
        <span className="gotw-tag">{pick.tagline}</span>
        <span className="gotw-play"><PlayIcon /> Играть</span>
      </span>
    </div>
  )
}

function FestivalCard() {
  const festival = useStore(s => s.festival)
  const openSheet = useStore(s => s.openSheet)
  if (!festival) return null
  const claimable = festival.quests.filter(q => q.done && !q.claimed).length + (festival.community.reached && !festival.community.claimed ? 1 : 0)
  const days = Math.max(0, Math.ceil((festival.endsMs - Date.now()) / 86_400_000))
  return (
    <button className="card fest-card" onClick={() => openSheet('festival')}>
      <span className="fest-emoji">{festival.emoji}</span>
      <span className="fest-tx">
        <span className="fest-name">{festival.name}</span>
        <span className="fest-sub">🎟 {festival.tokens} · осталось {days} дн.</span>
      </span>
      {claimable > 0 ? <span className="fest-badge">забрать: {claimable}</span> : <span className="fest-open">Открыть →</span>}
    </button>
  )
}

function SeasonCard() {
  const season = useStore(s => s.season)
  const openSheet = useStore(s => s.openSheet)
  if (!season) return null
  const intoTier = season.xp - season.tier * season.xpPerTier
  const pct = season.tier >= season.tiers ? 100 : Math.round((intoTier / season.xpPerTier) * 100)
  return (
    <button className="card season-card" onClick={() => openSheet('season')}>
      <div className="sc-head">
        <span className="sc-title">{season.season.name} · Пропуск{season.premium ? ' ⭐' : ''}</span>
        {season.claimable > 0
          ? <span className="sc-badge">забрать: {season.claimable}</span>
          : <span className="sc-sub">тир {season.tier}/{season.tiers}</span>}
      </div>
      <div className="sc-bar"><div className="sc-fill" style={{ width: `${pct}%` }} /></div>
      <div className="sc-foot">
        <span>Тир {season.tier} · {season.tier >= season.tiers ? 'максимум' : `${intoTier}/${season.xpPerTier} XP`}</span>
        <span className="sc-open">Открыть →</span>
      </div>
    </button>
  )
}

function WeeklyCard() {
  const weekly = useStore(s => s.weeklyQuests)
  if (weekly.length === 0) return null
  const unclaimed = weekly.filter(q => q.done && !q.claimed).length
  return (
    <div className="card quests weekly">
      <div className="q-head">
        <span className="q-title-main">Задания недели</span>
        <span className="q-sub">{unclaimed > 0 ? `можно забрать: ${unclaimed}` : 'сброс в понедельник'}</span>
      </div>
      {weekly.map(q => <QuestRow key={q.id} q={q} />)}
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
          color={profile.color} face={profile.face} frame={profile.frame} hat={profile.hat}
          eyewear={profile.eyewear} effect={profile.effect} companion={profile.companion}
          recolors={profile.recolors} seed={profile.id} size={58} ring={false}
        />
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <div className="nm2">{profile.username ? `@${profile.username}` : profile.name}</div>
          <div className="tag2">{titleText(profile.title)}</div>
        </div>
        {profile.prestige > 0 && <span className="streak-chip" title={`Престиж ${profile.prestige}`}>⭐ {profile.prestige}</span>}
        {profile.streak > 0 && <span className={`streak-chip ${profile.streakPerfect ? 'streak-gold' : ''}`} title={profile.streakPerfect ? `Идеальная серия: ${profile.streak} дн. — ни одной заморозки` : `Серия: ${profile.streak} дн.`}>🔥 {profile.streak}</span>}
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
