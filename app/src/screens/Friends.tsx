import { useState } from 'react'
import { useStore } from '../store'
import { Avatar } from '../art/Avatar'
import { GameTileIcon } from '../art/GameTileIcon'
import { CopyIcon, ShareIcon, PlusIcon, CloseIcon } from '../art/icons'
import { copyText, shareInvite } from '../telegram'
import { timeAgo, isOnline, gameById } from '../util'

type IconId = 'uno' | 'croco' | 'mafia' | 'pet'
type Seg = 'friends' | 'board' | 'feed'
const MEDALS = ['🥇', '🥈', '🥉']

const ADD_ERRORS: Record<string, string> = {
  not_found: 'Код не найден',
  self: 'Это твой код 🙂',
  already: 'Уже в друзьях',
}

export function Friends() {
  const profile = useStore(s => s.profile)
  const friends = useStore(s => s.friends)
  const leaderboard = useStore(s => s.leaderboard)
  const activity = useStore(s => s.activity)
  const catalog = useStore(s => s.catalog)
  const botUsername = useStore(s => s.botUsername)
  const addFriend = useStore(s => s.addFriend)
  const removeFriend = useStore(s => s.removeFriend)
  const showToast = useStore(s => s.showToast)

  const [seg, setSeg] = useState<Seg>('friends')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const myCode = profile?.friendCode ?? '------'
  const inviteUrl = `https://t.me/${botUsername}?startapp=add_${myCode}`
  const onCopy = async () => { const ok = await copyText(myCode); showToast(ok ? 'Код скопирован ✨' : myCode) }
  const onShare = () => shareInvite(inviteUrl, `Залетай в Game is Game — все наши игры в одном месте! Мой код: ${myCode}`)

  const onAdd = async () => {
    const c = code.trim().toUpperCase()
    if (c.length < 3 || busy) return
    setBusy(true); setErr(null)
    const res = await addFriend(c)
    setBusy(false)
    if (res.ok) { setCode(''); showToast(`${res.name ?? 'Друг'} добавлен 🎉`) }
    else setErr(ADD_ERRORS[res.error ?? ''] ?? 'Не получилось')
  }

  return (
    <div className="tab-page stagger">
      <div className="topbar">
        <div className="hello"><div className="hi">Хаб</div><div className="nm">Друзья</div></div>
      </div>

      <div className="seg">
        <button className={seg === 'friends' ? 'on' : ''} onClick={() => setSeg('friends')}>👥 Друзья</button>
        <button className={seg === 'board' ? 'on' : ''} onClick={() => setSeg('board')}>🏆 Лидеры</button>
        <button className={seg === 'feed' ? 'on' : ''} onClick={() => setSeg('feed')}>⚡ Лента</button>
      </div>

      {seg === 'friends' && (
        <>
          <div className="code-card">
            <div className="lab">Твой код друга</div>
            <div className="code">{myCode}</div>
            <div className="acts">
              <button className="cbtn" onClick={onCopy}><CopyIcon /> Копировать</button>
              <button className="cbtn" onClick={onShare}><ShareIcon /> Поделиться</button>
            </div>
          </div>

          <div className="card">
            <div className="kicker" style={{ marginBottom: 10 }}>Добавить друга</div>
            <div className="field">
              <input
                className="input" placeholder="Код, напр. K7M2QX" value={code} maxLength={12} autoCapitalize="characters"
                onChange={e => { setCode(e.target.value.toUpperCase()); setErr(null) }}
                onKeyDown={e => { if (e.key === 'Enter') void onAdd() }}
              />
              <button className="btn" onClick={onAdd} disabled={busy || code.trim().length < 3} aria-label="Добавить"><PlusIcon /></button>
            </div>
            {err && <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 800, marginTop: 8 }}>{err}</div>}
          </div>

          <div className="sec"><h2>Мои друзья</h2><span className="sub">{friends.length}</span></div>
          {friends.length === 0 ? (
            <div className="empty"><div className="em">🫂</div><div className="t">Пока никого</div><div className="s">Поделись кодом или добавь друга — и играйте вместе.</div></div>
          ) : friends.map(f => {
            const game = gameById(catalog, f.lastGame)
            const online = isOnline(f.lastSeen)
            return (
              <div className="row" key={f.id}>
                <Avatar look={f.look} seed={f.id} size={44} />
                <div className="tx">
                  <div className="t">{f.name}</div>
                  <div className="s">
                    <span className={`dot ${online ? 'on' : 'off'}`} />
                    {online ? 'в сети' : f.lastSeen ? `был(а) ${timeAgo(f.lastSeen)}` : 'давно не заходил(а)'}
                    {game ? ` · ${game.name}` : ''}
                  </div>
                </div>
                <span className="lvl-badge">Ур. {f.level}</span>
                <button className="iconbtn" style={{ width: 36, height: 36, color: 'var(--red)' }} onClick={() => removeFriend(f.id)} aria-label="Удалить из друзей"><CloseIcon /></button>
              </div>
            )
          })}
        </>
      )}

      {seg === 'board' && (
        leaderboard.length === 0 ? (
          <div className="empty"><div className="em">🏆</div><div className="t">Таблица пустеет</div><div className="s">Добавь друзей и запускай игры — появится рейтинг по опыту.</div></div>
        ) : leaderboard.map((r, i) => (
          <div className={`lb-row ${r.isMe ? 'me' : ''}`} key={r.id}>
            <span className={`rank ${i < 3 ? 'top' : ''}`}>{i < 3 ? MEDALS[i] : i + 1}</span>
            <Avatar look={r.look} seed={r.id} size={40} />
            <div className="tx">
              <div className="t">{r.name}{r.isMe ? ' · ты' : ''}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-soft)' }}>Уровень {r.level}</div>
            </div>
            <span className="xp2">{r.xp} XP</span>
          </div>
        ))
      )}

      {seg === 'feed' && (
        activity.length === 0 ? (
          <div className="empty"><div className="em">⚡</div><div className="t">Тихо пока</div><div className="s">Когда ты или друзья запускаете игры, события появятся здесь.</div></div>
        ) : (
          <div className="card" style={{ paddingTop: 6, paddingBottom: 6 }}>
            {activity.map(a => {
              const game = gameById(catalog, a.gameId)
              return (
                <div className="act" key={a.id}>
                  <Avatar look={a.look} seed={a.userId} size={38} />
                  <div className="tx">
                    <div className="t"><b>{a.name}</b> открыл(а) {game ? game.name : 'игру'}</div>
                    <div className="when">{timeAgo(a.ts)}</div>
                  </div>
                  {game && <GameTileIcon id={game.id as IconId} size={34} />}
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
