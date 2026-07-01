import { useState } from 'react'
import { useStore } from '../store'
import { Avatar } from '../art/Avatar'
import { GameTileIcon } from '../art/GameTileIcon'
import { CopyIcon, ShareIcon, PlusIcon, CloseIcon } from '../art/icons'
import { copyText, shareInvite } from '../telegram'
import { timeAgo, isOnline, gameById } from '../util'
import { REFERRER_REWARD, REFERRED_BONUS, inviteLink } from '@shared/referrals'
import type { Friend } from '@shared/types'

type Seg = 'friends' | 'board' | 'feed'
const GIFT_PRESETS = [50, 100, 250, 500]

const GIFT_ERRORS: Record<string, string> = {
  too_poor: 'Не хватает Game',
  limit: 'Лимит: 5 подарков в день',
  not_friends: 'Вы не в друзьях',
  bad_amount: 'От 10 до 1000 Game',
}
const MEDALS = ['🥇', '🥈', '🥉']

const ADD_ERRORS: Record<string, string> = {
  not_found: 'Код не найден',
  self: 'Это твой код 🙂',
  already: 'Уже в друзьях',
}

export function Friends() {
  const profile = useStore(s => s.profile)
  const invited = useStore(s => s.invited)
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
  const [giftFor, setGiftFor] = useState<Friend | null>(null)

  const myCode = profile?.friendCode ?? '------'
  // Одна ссылка на всё: новому игроку засчитает приглашение (+Game обоим),
  // уже играющего просто добавит в друзья.
  const inviteUrl = inviteLink(botUsername, myCode)
  const shareText = `Залетай в Game is Game — все наши игры в одном месте! Получишь +${REFERRED_BONUS} Game на старте 🎁 Мой код: ${myCode}`
  const onCopy = async () => { const ok = await copyText(myCode); showToast(ok ? 'Код скопирован ✨' : myCode) }
  const onShare = () => shareInvite(inviteUrl, shareText)

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
          <div className="invite-card">
            <div className="ic-top">
              <span className="ic-gift">🎁</span>
              <div>
                <div className="ic-head">Зови друзей — получай Game</div>
                <div className="ic-sub">+{REFERRER_REWARD} тебе и +{REFERRED_BONUS} другу за каждого нового игрока по твоей ссылке</div>
              </div>
            </div>
            {invited > 0 && (
              <div className="ic-stats">
                Приглашено: <b>{invited}</b> · Заработано: <b>{invited * REFERRER_REWARD} Game</b>
              </div>
            )}
            <button className="cbtn" onClick={onShare}><ShareIcon /> Пригласить друга</button>
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
                <button className="iconbtn" style={{ width: 36, height: 36, fontSize: 17 }} onClick={() => setGiftFor(f)} aria-label={`Подарить Game: ${f.name}`}>🎁</button>
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
                  {game && <GameTileIcon id={game.id} emoji={game.emoji} size={34} />}
                </div>
              )
            })}
          </div>
        )
      )}

      {giftFor && <GiftSheet friend={giftFor} onClose={() => setGiftFor(null)} />}
    </div>
  )
}

/** Шторка «Подарить Game»: пресеты суммы, перевод с баланса дарителя. */
function GiftSheet({ friend, onClose }: { friend: Friend; onClose(): void }) {
  const profile = useStore(s => s.profile)
  const gift = useStore(s => s.gift)
  const showToast = useStore(s => s.showToast)
  const [amount, setAmount] = useState(100)
  const [busy, setBusy] = useState(false)
  const coins = profile?.coins ?? 0

  const send = async () => {
    if (busy) return
    setBusy(true)
    const r = await gift(friend.id, amount)
    setBusy(false)
    if (r.ok) {
      showToast(`Подарок отправлен: ${friend.name} +${amount} Game 🎁`)
      onClose()
    } else {
      showToast(GIFT_ERRORS[r.error ?? ''] ?? 'Не получилось отправить')
    }
  }

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="grip" />
        <div className="gsheet-head">
          <Avatar look={friend.look} seed={friend.id} size={52} />
          <div className="tx">
            <h2>Подарить Game</h2>
            <div className="s">{friend.name} обрадуется 🎁</div>
          </div>
        </div>
        <div className="gift-presets">
          {GIFT_PRESETS.map(v => (
            <button key={v} className={`chip-cat ${amount === v ? 'active' : ''}`} onClick={() => setAmount(v)} disabled={v > coins}>
              {v} G
            </button>
          ))}
        </div>
        <p className="soft" style={{ marginTop: 8 }}>У тебя {coins.toLocaleString('ru')} Game. Подарок спишется с твоего баланса, до 5 подарков в день.</p>
        <button className="btn accent" style={{ width: '100%', marginTop: 6 }} onClick={() => void send()} disabled={busy || amount > coins}>
          🎁 Подарить {amount} Game
        </button>
      </div>
    </div>
  )
}
