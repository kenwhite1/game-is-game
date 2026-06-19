// Авторские иконки игр: каждая это маленькая премиальная «иконка-приложение»,
// собранная вручную в SVG. Бейдж со скруглением, мягкий свет, глянец и сцена внутри.
type IconId = 'uno' | 'croco' | 'mafia' | 'pet'

const PAL: Record<IconId, { from: string; to: string; rim: string; glow: string }> = {
  uno: { from: '#f5897f', to: '#bb352b', rim: 'rgba(255,200,194,.9)', glow: 'rgba(225,85,75,.55)' },
  croco: { from: '#83d588', to: '#368741', rim: 'rgba(196,240,198,.9)', glow: 'rgba(84,177,90,.5)' },
  mafia: { from: '#a094f6', to: '#4637bd', rim: 'rgba(205,196,255,.9)', glow: 'rgba(108,92,224,.55)' },
  pet: { from: '#ffce74', to: '#d6850f', rim: 'rgba(255,224,170,.95)', glow: 'rgba(242,169,59,.5)' },
}

export function GameIcon({ id, size = 64 }: { id: IconId; size?: number }) {
  const p = PAL[id]
  const u = `gi_${id}`
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" className="game-icon" aria-hidden>
      <defs>
        <linearGradient id={`${u}_bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.from} />
          <stop offset="1" stopColor={p.to} />
        </linearGradient>
        <linearGradient id={`${u}_gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${u}_glow`} cx="0.5" cy="0.42" r="0.6">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* бейдж */}
      <rect x="3" y="3" width="74" height="74" rx="21" fill={p.to} opacity="0.55" />
      <rect x="3" y="2" width="74" height="74" rx="21" fill={`url(#${u}_bg)`} />
      <rect x="3" y="2" width="74" height="74" rx="21" fill={`url(#${u}_glow)`} />
      {/* верхняя световая кромка */}
      <rect x="4" y="3" width="72" height="72" rx="20" fill="none" stroke={p.rim} strokeWidth="1.1" strokeOpacity="0.7" />
      {/* сцена */}
      <g>{ART[id](u)}</g>
      {/* глянец сверху */}
      <rect x="3" y="2" width="74" height="40" rx="21" fill={`url(#${u}_gloss)`} />
    </svg>
  )
}

const ART: Record<IconId, (u: string) => JSX.Element> = {
  // Веер карт
  uno: () => (
    <g transform="translate(40 43)">
      <Card x={-3} rot={-20} fill="#2f93cf" pip="#bfe4f6" />
      <Card x={3} rot={20} fill="#54b15a" pip="#cdeccf" />
      <g transform="rotate(0)">
        <rect x="-15" y="-21" width="30" height="42" rx="6" fill="#fff" />
        <rect x="-15" y="-21" width="30" height="42" rx="6" fill="none" stroke="rgba(20,20,30,.06)" strokeWidth="1" />
        <circle cx="0" cy="0" r="11.5" fill="#e1554b" />
        <circle cx="0" cy="0" r="11.5" fill="none" stroke="#fff" strokeWidth="2.4" />
        <text x="0" y="6.5" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="17" fill="#fff">1</text>
      </g>
    </g>
  ),
  // Мордочка крокодила
  croco: () => (
    <g transform="translate(40 41)">
      {/* нижняя челюсть */}
      <path d="M-22 6 Q-24 16 -10 17 L18 17 Q24 16 23 8 L23 4 Q10 12 -10 8 Z" fill="#2f7a39" />
      {/* верхняя часть головы и морда */}
      <path d="M-23 2 Q-25 -10 -12 -12 Q-4 -13 2 -9 L22 0 Q26 2 24 7 Q22 11 14 10 L-12 7 Q-22 6 -23 2 Z" fill="#5fbf64" />
      <path d="M-23 2 Q-25 -10 -12 -12 Q-4 -13 2 -9 L10 -5 Q-8 -7 -18 0 Q-22 2 -23 2 Z" fill="#7cd281" opacity="0.8" />
      {/* зубы */}
      <path d="M-8 8 l3 5 l3 -5 Z M0 9 l3 5 l3 -5 Z M9 9 l2.5 4.5 l2.5 -4.5 Z" fill="#fff" />
      {/* глаза (на одной высоте) */}
      <circle cx="-13.5" cy="-14" r="6.8" fill="#5fbf64" />
      <circle cx="-2.5" cy="-14" r="6.8" fill="#5fbf64" />
      <circle cx="-13.5" cy="-14" r="4.4" fill="#fff" />
      <circle cx="-2.5" cy="-14" r="4.4" fill="#fff" />
      <circle cx="-12.6" cy="-13.6" r="2.2" fill="#23341f" />
      <circle cx="-1.6" cy="-13.6" r="2.2" fill="#23341f" />
      {/* ноздря */}
      <circle cx="21" cy="2.5" r="1.7" fill="#2f7a39" />
    </g>
  ),
  // Луна и звёзды (серп вырезан маской, чтобы сквозь него был виден сам бейдж)
  mafia: u => (
    <g transform="translate(41 40)">
      <defs>
        <mask id={`${u}_moon`} maskUnits="userSpaceOnUse" x="-20" y="-22" width="42" height="42">
          <circle cx="0" cy="0" r="16" fill="#fff" />
          <circle cx="7.5" cy="-3" r="14" fill="#000" />
        </mask>
      </defs>
      <circle cx="0" cy="0" r="16" fill="#fdeec2" mask={`url(#${u}_moon)`} />
      {/* кратеры на освещённой части */}
      <circle cx="-7" cy="3" r="2.1" fill="#e7cd8e" opacity="0.6" />
      <circle cx="-9.5" cy="-4" r="1.4" fill="#e7cd8e" opacity="0.5" />
      {/* звёзды */}
      <Star x={15} y={-12} r={3.1} />
      <Star x={17.5} y={3} r={2} />
      <Star x={8} y={14} r={1.6} />
    </g>
  ),
  // Питомец-шарик
  pet: () => (
    <g transform="translate(40 42)">
      {/* ушки */}
      <path d="M-16 -10 Q-22 -22 -10 -20 Q-9 -14 -12 -9 Z" fill="#fff4e2" />
      <path d="M16 -10 Q22 -22 10 -20 Q9 -14 12 -9 Z" fill="#fff4e2" />
      <path d="M-15 -12 Q-18 -19 -11 -18 Z" fill="#f4b06a" />
      <path d="M15 -12 Q18 -19 11 -18 Z" fill="#f4b06a" />
      {/* голова */}
      <circle cx="0" cy="2" r="18" fill="#fff4e2" />
      <ellipse cx="0" cy="9" rx="12" ry="9" fill="#fff" opacity="0.55" />
      {/* щёчки */}
      <circle cx="-11" cy="7" r="3.2" fill="#ffc59b" opacity="0.85" />
      <circle cx="11" cy="7" r="3.2" fill="#ffc59b" opacity="0.85" />
      {/* глаза */}
      <circle cx="-6.5" cy="-1" r="2.7" fill="#5a3d22" />
      <circle cx="6.5" cy="-1" r="2.7" fill="#5a3d22" />
      <circle cx="-5.7" cy="-1.9" r="0.9" fill="#fff" />
      <circle cx="7.3" cy="-1.9" r="0.9" fill="#fff" />
      {/* носик и улыбка */}
      <path d="M-2.4 4 h4.8 l-2.4 2.6 Z" fill="#c97b3c" />
      <path d="M-4 8 Q0 12 4 8" fill="none" stroke="#c97b3c" strokeWidth="1.8" strokeLinecap="round" />
    </g>
  ),
}

function Card({ x, rot, fill, pip }: { x: number; rot: number; fill: string; pip: string }) {
  return (
    <g transform={`rotate(${rot}) translate(${x} 0)`}>
      <rect x="-14" y="-20" width="28" height="40" rx="6" fill="#fff" />
      <rect x="-14" y="-20" width="28" height="40" rx="6" fill="none" stroke="rgba(20,20,30,.06)" strokeWidth="1" />
      <rect x="-8" y="-13" width="16" height="26" rx="5" fill={fill} />
      <ellipse cx="0" cy="-6" rx="6" ry="4" fill={pip} opacity="0.7" />
    </g>
  )
}

function Star({ x, y, r }: { x: number; y: number; r: number }) {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2
    const rad = i % 2 === 0 ? r : r * 0.42
    pts.push(`${(x + Math.cos(ang) * rad).toFixed(2)},${(y + Math.sin(ang) * rad).toFixed(2)}`)
  }
  return <polygon points={pts.join(' ')} fill="#fff3cf" />
}
