// Иконки игр в стиле «Шарика»: мягкие глянцевые 3D-персонажи и предметы.
// Объёмные радиальные градиенты, блик, румяные щёчки, большие блестящие глаза,
// мягкая контактная тень. Без жёсткого бейджа, как маскоты в TT.
type IconId = 'uno' | 'croco' | 'mafia' | 'pet'

export function GameIcon({ id, size = 64, onBadge = false }: { id: IconId; size?: number; onBadge?: boolean }) {
  const u = `gi_${id}`
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" className="game-icon" aria-hidden>
      <defs>{DEFS[id](u)}</defs>
      {!onBadge && <ellipse cx="40" cy="73" rx="23" ry="5" fill="rgba(74,46,16,.16)" />}
      {ART[id](u)}
    </svg>
  )
}

function Eye({ cx, cy, r = 5 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 1.15} fill="#2a2017" />
      <circle cx={cx - r * 0.32} cy={cy - r * 0.4} r={r * 0.34} fill="#fff" />
      <circle cx={cx + r * 0.28} cy={cy + r * 0.42} r={r * 0.15} fill="#fff" opacity="0.7" />
    </g>
  )
}
function Gloss() {
  return (
    <g>
      <ellipse cx="33" cy="24" rx="15" ry="10" fill="#fff" opacity="0.26" />
      <ellipse cx="27" cy="19" rx="5.5" ry="3.4" fill="#fff" opacity="0.55" />
    </g>
  )
}
function Star({ x, y, r }: { x: number; y: number; r: number }) {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2
    const rad = i % 2 === 0 ? r : r * 0.45
    pts.push(`${(x + Math.cos(ang) * rad).toFixed(2)},${(y + Math.sin(ang) * rad).toFixed(2)}`)
  }
  return <polygon points={pts.join(' ')} fill="#fff6d8" />
}

const DEFS: Record<IconId, (u: string) => JSX.Element> = {
  pet: u => (
    <>
      <radialGradient id={`${u}_body`} cx="0.4" cy="0.3" r="0.85">
        <stop offset="0" stopColor="#ffe39a" /><stop offset="0.62" stopColor="#fcc24f" /><stop offset="1" stopColor="#f0a32c" />
      </radialGradient>
      <radialGradient id={`${u}_ear`} cx="0.5" cy="0.3" r="0.9">
        <stop offset="0" stopColor="#f4ad42" /><stop offset="1" stopColor="#e08a22" />
      </radialGradient>
    </>
  ),
  croco: u => (
    <>
      <radialGradient id={`${u}_body`} cx="0.4" cy="0.28" r="0.9">
        <stop offset="0" stopColor="#a3e69f" /><stop offset="0.6" stopColor="#69c46e" /><stop offset="1" stopColor="#3f9a49" />
      </radialGradient>
      <radialGradient id={`${u}_snout`} cx="0.4" cy="0.3" r="0.9">
        <stop offset="0" stopColor="#bdeeb3" /><stop offset="1" stopColor="#7cc96f" />
      </radialGradient>
    </>
  ),
  mafia: u => (
    <radialGradient id={`${u}_moon`} cx="0.38" cy="0.3" r="0.85">
      <stop offset="0" stopColor="#fff6d8" /><stop offset="0.6" stopColor="#ffe7a6" /><stop offset="1" stopColor="#f3c969" />
    </radialGradient>
  ),
  uno: u => (
    <>
      <linearGradient id={`${u}_red`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f06a60" /><stop offset="1" stopColor="#cf3f34" /></linearGradient>
      <linearGradient id={`${u}_white`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#f1e9dc" /></linearGradient>
    </>
  ),
}

const ART: Record<IconId, (u: string) => JSX.Element> = {
  // Щенок (как Шарик)
  pet: u => (
    <g>
      <path d="M18 30 Q8 30 11 46 Q14 56 24 50 Q22 40 26 33 Z" fill={`url(#${u}_ear)`} />
      <path d="M62 30 Q72 30 69 46 Q66 56 56 50 Q58 40 54 33 Z" fill={`url(#${u}_ear)`} />
      <ellipse cx="30" cy="64" rx="8" ry="7" fill="#fcc24f" />
      <ellipse cx="50" cy="64" rx="8" ry="7" fill="#fcc24f" />
      <path d="M27 64 v4 M30 65 v4 M33 64 v4" stroke="#e79a2a" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M47 64 v4 M50 65 v4 M53 64 v4" stroke="#e79a2a" strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="40" cy="38" rx="26" ry="24" fill={`url(#${u}_body)`} />
      <Gloss />
      <ellipse cx="22" cy="44" rx="5.5" ry="4" fill="#ff8f6e" opacity="0.55" />
      <ellipse cx="58" cy="44" rx="5.5" ry="4" fill="#ff8f6e" opacity="0.55" />
      <path d="M28 28 q4 -3 8 -0.5 M52 28 q-4 -3 -8 -0.5" stroke="#c47a1e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <Eye cx={31} cy={36} /><Eye cx={49} cy={36} />
      <ellipse cx="40" cy="45" rx="4.2" ry="3.4" fill="#3a2a1e" />
      <ellipse cx="38.6" cy="43.8" rx="1.4" ry="1" fill="#fff" opacity="0.6" />
      <path d="M40 48 q-5 6 -10 2 M40 48 q5 6 10 2" stroke="#3a2a1e" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M36.5 49 q3.5 4.5 7 0 q0 4 -3.5 4 q-3.5 0 -3.5 -4 Z" fill="#e8607a" />
      <path d="M30 58 q10 6 20 0" stroke="#b58fd0" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M40 60 l3 3 l-3 3 l-3 -3 Z" fill="#f4c64a" />
    </g>
  ),

  // Крокодильчик
  croco: u => (
    <g>
      <ellipse cx="29" cy="63" rx="7.5" ry="6.5" fill="#5bb45f" />
      <ellipse cx="51" cy="63" rx="7.5" ry="6.5" fill="#5bb45f" />
      <ellipse cx="40" cy="40" rx="25" ry="22" fill={`url(#${u}_body)`} />
      <Gloss />
      <ellipse cx="40" cy="50" rx="15" ry="9" fill={`url(#${u}_snout)`} />
      <path d="M31 52 l2.5 4 l2.5 -4 Z M38 53 l2.5 4 l2.5 -4 Z M45 52 l2.5 4 l2.5 -4 Z" fill="#fff" />
      <path d="M30 49 q10 7 20 0" stroke="#2f7a39" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <circle cx="35" cy="45" r="1.5" fill="#2f7a39" /><circle cx="45" cy="45" r="1.5" fill="#2f7a39" />
      <circle cx="29" cy="26" r="9" fill={`url(#${u}_body)`} />
      <circle cx="51" cy="26" r="9" fill={`url(#${u}_body)`} />
      <Eye cx={29} cy={26} r={5.2} /><Eye cx={51} cy={26} r={5.2} />
      <ellipse cx="20" cy="43" rx="4.5" ry="3.2" fill="#ff8f6e" opacity="0.45" />
      <ellipse cx="60" cy="43" rx="4.5" ry="3.2" fill="#ff8f6e" opacity="0.45" />
      <path d="M30 60 q10 5 20 0" stroke="#b58fd0" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M40 62 l3 3 l-3 3 l-3 -3 Z" fill="#f4c64a" />
    </g>
  ),

  // Сонный месяц со звёздами
  mafia: u => (
    <g>
      <defs>
        <mask id={`${u}_crescent`} maskUnits="userSpaceOnUse" x="6" y="14" width="56" height="56">
          <circle cx="36" cy="42" r="24" fill="#fff" />
          <circle cx="50" cy="35" r="21" fill="#000" />
        </mask>
      </defs>
      <circle cx="36" cy="42" r="24" fill={`url(#${u}_moon)`} mask={`url(#${u}_crescent)`} />
      <ellipse cx="26" cy="28" rx="8" ry="5" fill="#fff" opacity="0.35" mask={`url(#${u}_crescent)`} />
      {/* сонное личико */}
      <path d="M22 40 q3 3 6 0" stroke="#c79a3e" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M30 41 q3 3 6 0" stroke="#c79a3e" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="24" cy="48" rx="3" ry="2.2" fill="#ff9d7e" opacity="0.5" />
      <path d="M27 51 q2.5 2.5 5 0" stroke="#c79a3e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* звёзды */}
      <Star x={58} y={24} r={3.4} /><Star x={21} y={21} r={2.4} /><Star x={62} y={45} r={2} />
    </g>
  ),

  // Глянцевый веер карт
  uno: u => (
    <g transform="translate(40 42)">
      <Card u={u} x={-4} rot={-22} fill="#2f93cf" />
      <Card u={u} x={4} rot={22} fill="#54b15a" />
      <g>
        <rect x="-15" y="-22" width="30" height="44" rx="7" fill={`url(#${u}_white)`} />
        <rect x="-15" y="-22" width="30" height="44" rx="7" fill="none" stroke="rgba(20,20,30,.06)" />
        <circle cx="0" cy="0" r="12" fill={`url(#${u}_red)`} />
        <circle cx="0" cy="0" r="12" fill="none" stroke="#fff" strokeWidth="2.6" />
        <text x="0" y="6.5" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="18" fill="#fff">1</text>
        <ellipse cx="-5" cy="-13" rx="7" ry="4" fill="#fff" opacity="0.5" />
      </g>
    </g>
  ),
}

function Card({ u, x, rot, fill }: { u: string; x: number; rot: number; fill: string }) {
  return (
    <g transform={`rotate(${rot}) translate(${x} 0)`}>
      <rect x="-14" y="-20" width="28" height="40" rx="6" fill={`url(#${u}_white)`} />
      <rect x="-8" y="-13" width="16" height="26" rx="5" fill={fill} />
      <ellipse cx="0" cy="-6" rx="5.5" ry="3.5" fill="#fff" opacity="0.45" />
    </g>
  )
}
