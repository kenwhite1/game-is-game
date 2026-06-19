import { GameIcon } from './GameIcon'

type IconId = 'uno' | 'croco' | 'mafia' | 'pet'

// Игры с готовыми 3D-маскотами (картинки). Крокоша пока на векторной иконке.
const IMG: Partial<Record<IconId, string>> = { uno: 'uno', mafia: 'mafia', pet: 'pet' }

export function GameTileIcon({ id, size = 62 }: { id: IconId; size?: number }) {
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
  return (
    <span className="gi-img gi-img--svg" style={{ width: size, height: size }}>
      <GameIcon id={id} size={Math.round(size * 0.86)} onBadge />
    </span>
  )
}
