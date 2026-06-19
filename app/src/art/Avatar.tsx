import type { CSSProperties } from 'react'
import { avatarOf } from '@shared/avatars'
import { cosmeticById } from '@shared/cosmetics'
import type { FrameItem, EffectItem, Look } from '@shared/cosmetics'

type Props = Partial<Look> & {
  /** Готовый образ (друзья/лента/лидеры). Имеет приоритет над отдельными props. */
  look?: Look
  size?: number
  seed?: number
  ring?: boolean
}

function emojiOf(id: string | undefined): string {
  const c = id ? cosmeticById(id) : undefined
  return c && (c.slot === 'hat' || c.slot === 'eyewear' || c.slot === 'companion') ? (c as { emoji: string }).emoji : ''
}

// Аватар = персонаж + надетые слои (рамка, очки, шляпа, питомец, эффект).
// Аксессуары позиционируются в долях от размера, поэтому «сидят» на персонаже
// при любом масштабе. Питомец и эффект показываются только на крупных аватарах.
export function Avatar(props: Props) {
  const { look, size = 44, seed = 0, ring = true } = props
  const ids = {
    avatar: look?.avatar ?? props.avatar,
    frame: look?.frame ?? props.frame,
    hat: look?.hat ?? props.hat,
    eyewear: look?.eyewear ?? props.eyewear,
    effect: look?.effect ?? props.effect,
    companion: look?.companion ?? props.companion,
  }
  const a = avatarOf(ids.avatar, seed)
  const emojiSize = Math.round(size * 0.52)
  const dim: CSSProperties = { width: size, height: size, fontSize: emojiSize }

  const fr = ids.frame && ids.frame !== 'frame_none' ? (cosmeticById(ids.frame) as FrameItem | undefined) : undefined
  const hat = emojiOf(ids.hat)
  const eye = emojiOf(ids.eyewear)
  const comp = emojiOf(ids.companion)
  const fx = ids.effect && ids.effect !== 'fx_none' ? (cosmeticById(ids.effect) as EffectItem | undefined) : undefined
  const big = size >= 36

  const circle = fr && fr.slot === 'frame'
    ? (
      <span className={`av-frame ${fr.anim ? `fr-${fr.anim}` : ''}`} style={{ background: fr.bg, boxShadow: fr.glow ? `0 0 14px ${fr.glow}` : undefined }}>
        {/* тонкое внутреннее кольцо цвета персонажа сохраняется под любой рамкой */}
        <span className="av av--bare" style={{ ...dim, ['--av-ring']: a.ring } as CSSProperties}><span>{a.emoji}</span></span>
      </span>
    )
    : (
      <span className="av" style={{ ...dim, ...(ring ? ({ ['--av-ring']: a.ring } as CSSProperties) : {}) }}>
        <span>{a.emoji}</span>
      </span>
    )

  if (!hat && !eye && !comp && !(fx && big)) return circle

  return (
    <span className="av-stack" style={{ width: size, height: size }}>
      {fx && big && <FxLayer fx={fx} size={size} />}
      {circle}
      {eye && <span className="acc acc-eye" style={{ fontSize: Math.round(size * 0.46) }}>{eye}</span>}
      {hat && <span className="acc acc-hat" style={{ fontSize: Math.round(size * 0.6) }}>{hat}</span>}
      {comp && big && <span className="acc acc-comp" style={{ fontSize: Math.round(size * 0.46) }}>{comp}</span>}
    </span>
  )
}

function FxLayer({ fx, size }: { fx: EffectItem; size: number }) {
  const ps = Math.round(size * 0.32)
  return (
    <span className={`fx fx-${fx.anim}`} style={{ boxShadow: fx.glow ? `0 0 18px ${fx.glow}` : undefined }}>
      {fx.particle && (
        <>
          <span className="fx-p p1" style={{ fontSize: ps }}>{fx.particle}</span>
          <span className="fx-p p2" style={{ fontSize: Math.round(ps * 0.85) }}>{fx.particle}</span>
        </>
      )}
    </span>
  )
}
