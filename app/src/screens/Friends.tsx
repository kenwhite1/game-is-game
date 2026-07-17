import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { Avatar } from '../art/Avatar'
import { GameTileIcon } from '../art/GameTileIcon'
import { CopyIcon, ShareIcon, PlusIcon, CloseIcon } from '../art/icons'
import { copyText, shareInvite } from '../telegram'
import { timeAgo, isOnline, gameById } from '../util'
import { REFERRER_REWARD, REFERRED_BONUS, inviteLink } from '@shared/referrals'
import { isTradeable } from '@shared/cosmetics'
import { COOP_REWARD } from '@shared/coop'
import type { Friend } from '@shared/types'
import { t, getLang } from '../i18n'

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
  const openSheet = useStore(s => s.openSheet)
  const loadBoards = useStore(s => s.loadBoards)
  const loadClan = useStore(s => s.loadClan)
  const challengeFriend = useStore(s => s.challengeFriend)
  const coop = useStore(s => s.coop)
  const coopStart = useStore(s => s.coopStart)
  const coopClaim = useStore(s => s.coopClaim)
  const friendStreaks = useStore(s => s.friendStreaks)
  const nudgeFriend = useStore(s => s.nudgeFriend)

  const [seg, setSeg] = useState<Seg>('friends')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [giftFor, setGiftFor] = useState<Friend | null>(null)

  const myCode = profile?.friendCode ?? '------'
  // Одна ссылка на всё: новому игроку засчитает приглашение (+Game обоим),
  // уже играющего просто добавит в друзья.
  const inviteUrl = inviteLink(botUsername, myCode)
  const shareText = getLang() === 'en'
    ? `Come to Game is Game - all our games in one place! You'll get +${REFERRED_BONUS} Game to start 🎁 My code: ${myCode}`
    : `Залетай в Game is Game, все наши игры в одном месте! Получишь +${REFERRED_BONUS} Game на старте 🎁 Мой код: ${myCode}`
  const onCopy = async () => { const ok = await copyText(myCode); showToast(ok ? t('Код скопирован ✨') : myCode) }
  const onShare = () => shareInvite(inviteUrl, shareText)

  const onAdd = async () => {
    const c = code.trim().toUpperCase()
    if (c.length < 3 || busy) return
    setBusy(true); setErr(null)
    const res = await addFriend(c)
    setBusy(false)
    if (res.ok) { setCode(''); showToast(`${res.name ?? t('Друг')} ${t('добавлен 🎉')}`) }
    else setErr(t(ADD_ERRORS[res.error ?? ''] ?? 'Не получилось'))
  }

  return (
    <div className="tab-page stagger">
      <div className="topbar">
        <div className="hello"><div className="hi">{t('Хаб')}</div><div className="nm">{t('Друзья')}</div></div>
      </div>

      <div className="seg">
        <button className={seg === 'friends' ? 'on' : ''} onClick={() => setSeg('friends')}>👥 {t('Друзья')}</button>
        <button className={seg === 'board' ? 'on' : ''} onClick={() => setSeg('board')}>🏆 {t('Лидеры')}</button>
        <button className={seg === 'feed' ? 'on' : ''} onClick={() => setSeg('feed')}>⚡ {t('Лента')}</button>
      </div>

      {seg === 'friends' && (
        <>
          <div className="invite-card">
            <div className="ic-top">
              <span className="ic-gift">🎁</span>
              <div>
                <div className="ic-head">{t('Зови друзей, получай Game')}</div>
                <div className="ic-sub">{getLang() === 'en' ? `+${REFERRER_REWARD} for you and +${REFERRED_BONUS} for your friend for every new player via your link` : `+${REFERRER_REWARD} тебе и +${REFERRED_BONUS} другу за каждого нового игрока по твоей ссылке`}</div>
              </div>
            </div>
            {invited > 0 && (
              <div className="ic-stats">
                {t('Приглашено:')} <b>{invited}</b> · {t('Заработано:')} <b>{invited * REFERRER_REWARD} Game</b>
              </div>
            )}
            <button className="cbtn" onClick={onShare}><ShareIcon /> {t('Пригласить друга')}</button>
          </div>

          {friendStreaks.length > 0 && (
            <>
              <div className="sec"><h2>{t('Дружеские серии 🔥🤝')}</h2><span className="sub">{t('играйте в один день')}</span></div>
              <div className="fs-row">
                {friendStreaks.map(f => (
                  <div className={`fs-chip ${f.bothToday ? 'lit' : ''}`} key={f.friendId}>
                    <span className="fs-flame">🔥 {f.current}</span>
                    <span className="fs-name">{f.friendName}</span>
                    {f.canNudge && <button className="fs-nudge" onClick={() => void nudgeFriend(f.friendId)}>{t('пни 👉')}</button>}
                  </div>
                ))}
              </div>
            </>
          )}

          {coop.length > 0 && (
            <>
              <div className="sec"><h2>{t('Кооп-квесты 🤝')}</h2><span className="sub">{t('вместе с другом')}</span></div>
              {coop.map(c => {
                const pct = Math.min(100, Math.round((c.progress / c.target) * 100))
                return (
                  <div className="coop-card" key={c.id}>
                    <div className="cc-top">{getLang() === 'en' ? <>With <b>{c.partnerName}</b>: win {c.target} together this week</> : <>С <b>{c.partnerName}</b>: вместе выиграть {c.target} за неделю</>}</div>
                    <div className="ach-bar"><div className="ach-fill" style={{ width: `${pct}%` }} /></div>
                    <div className="cc-bot">
                      <span>{c.progress} / {c.target}</span>
                      {c.done && !c.claimed && <button className="btn sm accent" onClick={() => void coopClaim(c.id)}>{t('Забрать')} {COOP_REWARD} Game 🤝</button>}
                      {c.claimed && <span className="cc-done">{t('✓ награда забрана')}</span>}
                    </div>
                  </div>
                )
              })}
            </>
          )}

          <div className="code-card">
            <div className="lab">{t('Твой код друга')}</div>
            <div className="code">{myCode}</div>
            <div className="acts">
              <button className="cbtn" onClick={onCopy}><CopyIcon /> {t('Копировать')}</button>
              <button className="cbtn" onClick={onShare}><ShareIcon /> {t('Поделиться')}</button>
            </div>
          </div>

          <div className="card">
            <div className="kicker" style={{ marginBottom: 10 }}>{t('Добавить друга')}</div>
            <div className="field">
              <input
                className="input" placeholder={t('Код, напр. K7M2QX')} value={code} maxLength={12} autoCapitalize="characters"
                onChange={e => { setCode(e.target.value.toUpperCase()); setErr(null) }}
                onKeyDown={e => { if (e.key === 'Enter') void onAdd() }}
              />
              <button className="btn" onClick={onAdd} disabled={busy || code.trim().length < 3} aria-label={t('Добавить')}><PlusIcon /></button>
            </div>
            {err && <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 800, marginTop: 8 }}>{err}</div>}
          </div>

          <button className="btn block ghost" style={{ marginTop: 12 }} onClick={() => { void loadClan(); openSheet('clan') }}>
            🛡️ {t('Команда')}
          </button>

          <div className="sec"><h2>{t('Мои друзья')}</h2><span className="sub">{friends.length}</span></div>
          {friends.length === 0 ? (
            <div className="empty"><div className="em">🫂</div><div className="t">{t('Пока никого')}</div><div className="s">{t('Поделись кодом или добавь друга, и играйте вместе.')}</div></div>
          ) : friends.map(f => {
            const liveGame = gameById(catalog, f.playing)
            const game = liveGame ?? gameById(catalog, f.lastGame)
            const online = !!f.playing || isOnline(f.lastSeen)
            return (
              <div className="row" key={f.id}>
                <Avatar look={f.look} seed={f.id} size={44} />
                <div className="tx">
                  <div className="t">{f.name}</div>
                  <div className="s">
                    <span className={`dot ${online ? 'on' : 'off'}`} />
                    {liveGame ? `${t('играет в')} ${t(liveGame.name)}`
                      : online ? t('в сети') : f.lastSeen ? `${t('был(а)')} ${timeAgo(f.lastSeen)}` : t('давно не заходил(а)')}
                    {!liveGame && game ? ` · ${t(game.name)}` : ''}
                  </div>
                </div>
                <span className="lvl-badge">{t('Ур.')} {f.level}</span>
                <button className="iconbtn" style={{ width: 36, height: 36, fontSize: 16 }} onClick={() => challengeFriend(f)} aria-label={`${t('Бросить вызов:')} ${f.name}`}>⚔️</button>
                <button className="iconbtn" style={{ width: 36, height: 36, fontSize: 16 }} onClick={() => void coopStart(f.id)} aria-label={`${t('Кооп-квест:')} ${f.name}`}>🤝</button>
                <button className="iconbtn" style={{ width: 36, height: 36, fontSize: 17 }} onClick={() => setGiftFor(f)} aria-label={`${t('Подарить Game:')} ${f.name}`}>🎁</button>
                <button className="iconbtn" style={{ width: 36, height: 36, color: 'var(--red)' }} onClick={() => removeFriend(f.id)} aria-label={t('Удалить из друзей')}><CloseIcon /></button>
              </div>
            )
          })}
        </>
      )}

      {seg === 'board' && (
        <button className="btn block" style={{ marginBottom: 12 }} onClick={() => { void loadBoards(); openSheet('boards') }}>
          🏆 {t('Глобальные рейтинги')}
        </button>
      )}
      {seg === 'board' && (
        leaderboard.length === 0 ? (
          <div className="empty"><div className="em">🏆</div><div className="t">{t('Таблица пустеет')}</div><div className="s">{t('Добавь друзей и запускай игры. Появится рейтинг по опыту.')}</div></div>
        ) : leaderboard.map((r, i) => (
          <div className={`lb-row ${r.isMe ? 'me' : ''}`} key={r.id}>
            <span className={`rank ${i < 3 ? 'top' : ''}`}>{i < 3 ? MEDALS[i] : i + 1}</span>
            <Avatar look={r.look} seed={r.id} size={40} />
            <div className="tx">
              <div className="t">{r.name}{r.isMe ? ` · ${t('ты')}` : ''}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-soft)' }}>{t('Уровень')} {r.level}</div>
            </div>
            <span className="xp2">{r.xp} XP</span>
          </div>
        ))
      )}

      {seg === 'feed' && (
        activity.length === 0 ? (
          <div className="empty"><div className="em">⚡</div><div className="t">{t('Тихо пока')}</div><div className="s">{t('Когда ты или друзья запускаете игры, события появятся здесь.')}</div></div>
        ) : (
          <div className="card" style={{ paddingTop: 6, paddingBottom: 6 }}>
            {activity.map(a => {
              if (a.kind) {
                // Мета-событие: достижение / серия.
                const icon = a.kind === 'achievement' ? '🏆' : a.kind === 'streak' ? '🔥' : '✨'
                return (
                  <div className="act" key={a.id}>
                    <Avatar look={a.look} seed={a.userId} size={38} />
                    <div className="tx">
                      <div className="t"><b>{a.name}</b> {a.text}</div>
                      <div className="when">{timeAgo(a.ts)}</div>
                    </div>
                    <span style={{ fontSize: 24 }}>{icon}</span>
                  </div>
                )
              }
              const game = gameById(catalog, a.gameId)
              return (
                <div className="act" key={a.id}>
                  <Avatar look={a.look} seed={a.userId} size={38} />
                  <div className="tx">
                    <div className="t"><b>{a.name}</b> {t('открыл(а)')} {game ? t(game.name) : t('игру')}</div>
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
  const giftCosmetic = useStore(s => s.giftCosmetic)
  const wardrobe = useStore(s => s.wardrobe)
  const loadWardrobe = useStore(s => s.loadWardrobe)
  const showToast = useStore(s => s.showToast)
  const [amount, setAmount] = useState(100)
  const [busy, setBusy] = useState(false)
  const coins = profile?.coins ?? 0
  // Гардероб мог не загрузиться (мы на вкладке «Друзья») - подтянем для списка подарков.
  useEffect(() => { if (!wardrobe) void loadWardrobe() }, [wardrobe, loadWardrobe])
  // §14.2: дарить можно только ТОРГУЕМЫЕ вещи, которыми владеешь (заслуги - bound).
  const giftable = (wardrobe?.items ?? [])
    .filter(i => i.owned && isTradeable(i.item))
    .map(i => i.item)

  const send = async () => {
    if (busy) return
    setBusy(true)
    const r = await gift(friend.id, amount)
    setBusy(false)
    if (r.ok) {
      showToast(`${t('Подарок отправлен:')} ${friend.name} +${amount} Game 🎁`)
      onClose()
    } else {
      showToast(t(GIFT_ERRORS[r.error ?? ''] ?? 'Не получилось отправить'))
    }
  }

  const sendItem = async (itemId: string, name: string) => {
    if (busy) return
    setBusy(true)
    const r = await giftCosmetic(friend.id, itemId)
    setBusy(false)
    if (r.ok) {
      showToast(`${t('Подарок отправлен:')} «${t(name)}» → ${friend.name} 🎁`)
      onClose()
    } else {
      showToast(r.error === 'already_owns' ? t('У друга уже есть этот предмет') : r.error === 'limit' ? t('Лимит подарков-предметов на сегодня') : t('Не получилось подарить предмет'))
    }
  }

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="grip" />
        <div className="gsheet-head">
          <Avatar look={friend.look} seed={friend.id} size={52} />
          <div className="tx">
            <h2>{t('Подарить Game')}</h2>
            <div className="s">{friend.name} {t('обрадуется 🎁')}</div>
          </div>
        </div>
        <div className="gift-presets">
          {GIFT_PRESETS.map(v => (
            <button key={v} className={`chip-cat ${amount === v ? 'active' : ''}`} onClick={() => setAmount(v)} disabled={v > coins}>
              {v} G
            </button>
          ))}
        </div>
        <p className="soft" style={{ marginTop: 8 }}>{getLang() === 'en' ? `You have ${coins.toLocaleString('en-US')} Game. The gift comes out of your balance, up to 5 gifts a day.` : `У тебя ${coins.toLocaleString('ru')} Game. Подарок спишется с твоего баланса, до 5 подарков в день.`}</p>
        <button className="btn accent" style={{ width: '100%', marginTop: 6 }} onClick={() => void send()} disabled={busy || amount > coins}>
          🎁 {t('Подарить')} {amount} Game
        </button>

        {giftable.length > 0 && (
          <>
            <div className="sec" style={{ margin: '16px 2px 8px' }}><h2 style={{ fontSize: 15 }}>{t('Или подари предмет')}</h2><span className="sub">{t('до 3 в день')}</span></div>
            <div className="gift-presets">
              {giftable.map(c => (
                <button key={c.id} className="chip-cat" onClick={() => void sendItem(c.id, c.name)} disabled={busy}>
                  {t(c.name)}
                </button>
              ))}
            </div>
            <p className="soft" style={{ marginTop: 8 }}>{t('Дарить можно только покупные вещи, заслуги остаются с тобой.')}</p>
          </>
        )}
      </div>
    </div>
  )
}
