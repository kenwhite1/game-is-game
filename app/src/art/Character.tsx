// «Бубл» - фирменный персонаж Game is Game. Оригинальный мягкий маскот:
// округлое тело-капля, блик, румяные щёки, сменные глаза-рот (face) и
// настраиваемый цвет (color). Аксессуары крепятся снаружи (см. Avatar.tsx)
// в фиксированных точках, поэтому всегда «сидят» ровно.
import type { JSX } from 'react'

// Затемнённый оттенок для нижней тени тела (умножение на коэффициент).
function shade(hex: string, k = 0.82): string {
  const h = hex.replace('#', '')
  const r = Math.round(parseInt(h.slice(0, 2), 16) * k)
  const g = Math.round(parseInt(h.slice(2, 4), 16) * k)
  const b = Math.round(parseInt(h.slice(4, 6), 16) * k)
  return `rgb(${r},${g},${b})`
}

const EYE = '#2c2218'

// Набор «лиц» - пары глаза+рот. id хранится в косметике (слот face).
function faceArt(id: string): JSX.Element {
  switch (id) {
    case 'happy':
      return (
        <g fill="none" stroke={EYE} strokeWidth="4" strokeLinecap="round">
          <path d="M34 45q4 -5 8 0" /><path d="M58 45q4 -5 8 0" />
          <path d="M42 55q8 9 16 0" strokeWidth="3" />
        </g>
      )
    case 'wink':
      return (
        <g>
          <circle cx="38" cy="46" r="4" fill={EYE} />
          <path d="M58 46q4 -5 8 0" fill="none" stroke={EYE} strokeWidth="4" strokeLinecap="round" />
          <path d="M43 57q7 6 14 0" fill="none" stroke={EYE} strokeWidth="3" strokeLinecap="round" />
        </g>
      )
    case 'cute':
      return (
        <g>
          <ellipse cx="38" cy="46" rx="5" ry="6" fill={EYE} /><circle cx="36" cy="44" r="1.6" fill="#fff" />
          <ellipse cx="62" cy="46" rx="5" ry="6" fill={EYE} /><circle cx="60" cy="44" r="1.6" fill="#fff" />
          <path d="M45 57q5 4 10 0" fill="none" stroke={EYE} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      )
    case 'surprised':
      return (
        <g>
          <circle cx="38" cy="46" r="5" fill={EYE} /><circle cx="62" cy="46" r="5" fill={EYE} />
          <ellipse cx="50" cy="60" rx="4" ry="5" fill={EYE} />
        </g>
      )
    case 'sleepy':
      return (
        <g stroke={EYE} strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M33 46h10" /><path d="M57 46h10" /><path d="M46 58h8" />
        </g>
      )
    case 'cool':
      return (
        <g>
          <rect x="31" y="42" width="16" height="7" rx="3" fill={EYE} />
          <rect x="53" y="42" width="16" height="7" rx="3" fill={EYE} />
          <path d="M44 59q6 3 12 0" fill="none" stroke={EYE} strokeWidth="3" strokeLinecap="round" />
        </g>
      )
    case 'starry':
      return (
        <g>
          <Star x={38} y={46} r={6} /><Star x={62} y={46} r={6} />
          <path d="M44 58q6 5 12 0" fill="none" stroke={EYE} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      )
    case 'love':
      return (
        <g>
          <Heart x={38} y={46} r={6} /><Heart x={62} y={46} r={6} />
          <path d="M44 58q6 4 12 0" fill="none" stroke={EYE} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      )
    case 'uwu':
      return (
        <g stroke={EYE} strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M34 47q4 -5 8 0" /><path d="M58 47q4 -5 8 0" />
          <path d="M44 56q3 4 6 0q3 4 6 0" strokeWidth="2.6" />
        </g>
      )
    case 'angry':
      return (
        <g>
          <path d="M33 40l10 4" stroke={EYE} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M67 40l-10 4" stroke={EYE} strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="38" cy="48" r="3.6" fill={EYE} /><circle cx="62" cy="48" r="3.6" fill={EYE} />
          <path d="M44 60q6 -4 12 0" fill="none" stroke={EYE} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      )
    case 'dizzy':
      return (
        <g stroke={EYE} strokeWidth="2.4" fill="none">
          <path d="M34 42l8 8M42 42l-8 8" strokeLinecap="round" />
          <path d="M58 42l8 8M66 42l-8 8" strokeLinecap="round" />
          <path d="M45 59q5 3 10 0" strokeWidth="2.6" strokeLinecap="round" />
        </g>
      )
    default: // smile
      return (
        <g>
          <circle cx="38" cy="46" r="4.2" fill={EYE} /><circle cx="62" cy="46" r="4.2" fill={EYE} />
          <path d="M43 56q7 7 14 0" fill="none" stroke={EYE} strokeWidth="3" strokeLinecap="round" />
        </g>
      )
  }
}

function Star({ x, y, r }: { x: number; y: number; r: number }) {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2
    const rad = i % 2 === 0 ? r : r * 0.45
    pts.push(`${(x + Math.cos(ang) * rad).toFixed(1)},${(y + Math.sin(ang) * rad).toFixed(1)}`)
  }
  return <polygon points={pts.join(' ')} fill={EYE} />
}
function Heart({ x, y, r }: { x: number; y: number; r: number }) {
  return <path d={`M${x} ${y + r * 0.7} C ${x - r * 1.3} ${y - r * 0.4}, ${x - r * 0.3} ${y - r}, ${x} ${y - r * 0.2} C ${x + r * 0.3} ${y - r}, ${x + r * 1.3} ${y - r * 0.4}, ${x} ${y + r * 0.7} Z`} fill="#e2574c" />
}

// stroke-only пути в face используют currentColor через group? Зададим явно.
export function Character({ color, face, size = 64 }: { color: string; face: string; size?: number }) {
  const dark = shade(color, 0.8)
  const uid = `ch_${face}_${color.replace('#', '')}`
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className="character">
      <defs>
        <radialGradient id={`${uid}_b`} cx="0.4" cy="0.32" r="0.85">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
        <clipPath id={`${uid}_c`}>
          <path d="M50 9c19 0 32 14 32 35 0 26-14 47-32 47S18 70 18 44C18 23 31 9 50 9Z" />
        </clipPath>
      </defs>
      {/* контактная тень */}
      <ellipse cx="50" cy="92" rx="24" ry="5" fill="rgba(74,46,16,.16)" />
      {/* тело */}
      <path d="M50 9c19 0 32 14 32 35 0 26-14 47-32 47S18 70 18 44C18 23 31 9 50 9Z" fill={`url(#${uid}_b)`} stroke={dark} strokeWidth="1.5" />
      {/* блик и тень внутри тела */}
      <g clipPath={`url(#${uid}_c)`}>
        <ellipse cx="36" cy="26" rx="16" ry="11" fill="#fff" opacity="0.28" />
        <ellipse cx="30" cy="20" rx="6" ry="3.6" fill="#fff" opacity="0.5" />
        <ellipse cx="50" cy="100" rx="40" ry="22" fill={dark} opacity="0.45" />
      </g>
      {/* щёки */}
      <ellipse cx="30" cy="56" rx="6" ry="4" fill="rgba(232,93,93,.32)" />
      <ellipse cx="70" cy="56" rx="6" ry="4" fill="rgba(232,93,93,.32)" />
      {/* лицо */}
      {faceArt(face)}
    </svg>
  )
}
