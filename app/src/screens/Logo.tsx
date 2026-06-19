// Логотип Game is Game (объёмный 3D-бейдж). Картинка с прозрачным фоном.
export function BrandLogo({ size = 'hero' }: { size?: 'hero' | 'small' }) {
  return (
    <picture>
      <source srcSet="/logo.webp" type="image/webp" />
      <img
        className={size === 'small' ? 'brand-logo brand-logo--sm' : 'brand-logo'}
        src="/logo.png"
        alt="Game is Game"
        draggable={false}
      />
    </picture>
  )
}
