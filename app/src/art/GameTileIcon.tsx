import { GameIcon } from './GameIcon'

type SvgId = 'uno' | 'croco' | 'mafia' | 'pet'

// Игры с готовыми 3D-маскотами (картинки). Крокоша пока на векторной иконке.
const IMG: Partial<Record<string, string>> = { uno: 'uno', mafia: 'mafia', pet: 'pet' }
// Игры с векторной иконкой; у остальных плитка с эмодзи.
const SVG = new Set<string>(['uno', 'croco', 'mafia', 'pet'])

export function GameTileIcon({ id, emoji, size = 62 }: { id: string; emoji?: string; size?: number }) {
  const name = IMG[id]
  if (name) {
    return (
      <span className="gi-img" style={{ width: size, height: size }}>
        <picture>
          <source srcSet={`/games/${name}.webp`} type="image/webp" />
          <img src={`/games/${name}.png`} alt="" draggable={false} />
        </picture>
      </span>
    )
  }
  if (SVG.has(id)) {
    return (
      <span className="gi-img gi-img--svg" style={{ width: size, height: size }}>
        <GameIcon id={id as SvgId} size={Math.round(size * 0.86)} onBadge />
      </span>
    )
  }
  return (
    <span className="gi-img gi-emoji" style={{ width: size, height: size, fontSize: Math.round(size * 0.58) }}>
      {emoji ?? '🎮'}
    </span>
  )
}
