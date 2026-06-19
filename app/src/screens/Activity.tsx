import { useState } from 'react'
import { useStore } from '../store'
import { Avatar } from '../art/Avatar'
import { GameTileIcon } from '../art/GameTileIcon'
import { timeAgo, gameById } from '../util'

type IconId = 'uno' | 'croco' | 'mafia' | 'pet'
const MEDALS = ['🥇', '🥈', '🥉']

export function Activity() {
  const leaderboard = useStore(s => s.leaderboard)
  const activity = useStore(s => s.activity)
  const catalog = useStore(s => s.catalog)
  const [view, setView] = useState<'board' | 'feed'>('board')

  return (
    <div className="tab-page stagger">
      <div className="topbar">
        <div className="hello"><div className="hi">Хаб</div><div className="nm">Лента</div></div>
      </div>

      <div className="seg">
        <button className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}>🏆 Лидеры</button>
        <button className={view === 'feed' ? 'on' : ''} onClick={() => setView('feed')}>⚡ Активность</button>
      </div>

      {view === 'board' ? (
        leaderboard.length === 0 ? (
          <Empty em="🏆" t="Таблица пустеет" s="Добавь друзей и запускай игры — здесь появится рейтинг по опыту." />
        ) : (
          leaderboard.map((r, i) => (
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
        )
      ) : activity.length === 0 ? (
        <Empty em="⚡" t="Тихо пока" s="Когда ты или друзья запускаете игры, события появятся здесь." />
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
      )}
    </div>
  )
}

function Empty({ em, t, s }: { em: string; t: string; s: string }) {
  return (
    <div className="empty">
      <div className="em">{em}</div>
      <div className="t">{t}</div>
      <div className="s">{s}</div>
    </div>
  )
}
