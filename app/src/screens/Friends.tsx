import { useState } from 'react'
import { useStore } from '../store'
import { Avatar } from '../art/Avatar'
import { CopyIcon, ShareIcon, PlusIcon, CloseIcon } from '../art/icons'
import { copyText, shareInvite } from '../telegram'
import { timeAgo, isOnline, gameById } from '../util'

const ADD_ERRORS: Record<string, string> = {
  not_found: 'Код не найден',
  self: 'Это твой код 🙂',
  already: 'Уже в друзьях',
}

export function Friends() {
  const profile = useStore(s => s.profile)
  const friends = useStore(s => s.friends)
  const catalog = useStore(s => s.catalog)
  const botUsername = useStore(s => s.botUsername)
  const addFriend = useStore(s => s.addFriend)
  const removeFriend = useStore(s => s.removeFriend)
  const showToast = useStore(s => s.showToast)

  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const myCode = profile?.friendCode ?? '------'
  const inviteUrl = `https://t.me/${botUsername}?startapp=add_${myCode}`

  const onCopy = async () => {
    const ok = await copyText(myCode)
    showToast(ok ? 'Код скопирован ✨' : myCode)
  }
  const onShare = () => shareInvite(inviteUrl, `Залетай в Game is Game — все наши игры в одном месте! Мой код: ${myCode}`)

  const onAdd = async () => {
    const c = code.trim().toUpperCase()
    if (c.length < 3 || busy) return
    setBusy(true); setErr(null)
    const res = await addFriend(c)
    setBusy(false)
    if (res.ok) {
      setCode('')
      showToast(`${res.name ?? 'Друг'} добавлен 🎉`)
    } else {
      setErr(ADD_ERRORS[res.error ?? ''] ?? 'Не получилось')
    }
  }

  return (
    <div className="tab-page stagger">
      <div className="topbar">
        <div className="hello"><div className="hi">Хаб</div><div className="nm">Друзья</div></div>
      </div>

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
            className="input"
            placeholder="Код, напр. K7M2QX"
            value={code}
            maxLength={12}
            autoCapitalize="characters"
            onChange={e => { setCode(e.target.value.toUpperCase()); setErr(null) }}
            onKeyDown={e => { if (e.key === 'Enter') void onAdd() }}
          />
          <button className="btn" onClick={onAdd} disabled={busy || code.trim().length < 3} aria-label="Добавить">
            <PlusIcon />
          </button>
        </div>
        {err && <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 800, marginTop: 8 }}>{err}</div>}
      </div>

      <div className="sec"><h2>Мои друзья</h2><span className="sub">{friends.length}</span></div>

      {friends.length === 0 ? (
        <div className="empty">
          <div className="em">🫂</div>
          <div className="t">Пока никого</div>
          <div className="s">Поделись своим кодом или добавь друга по коду — и играйте вместе.</div>
        </div>
      ) : (
        friends.map(f => {
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
              <button
                className="iconbtn"
                style={{ width: 36, height: 36, color: 'var(--red)' }}
                onClick={() => removeFriend(f.id)}
                aria-label="Удалить из друзей"
              ><CloseIcon /></button>
            </div>
          )
        })
      )}
    </div>
  )
}
