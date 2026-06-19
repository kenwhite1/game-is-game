// Аккуратные интерфейсные иконки (тонкая линия, currentColor).
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export function SoundOnIcon() {
  return (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8 8 0 0 1 0 12" />
    </svg>
  )
}
export function SoundOffIcon() {
  return (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" />
      <path d="M22 9l-5 6M17 9l5 6" />
    </svg>
  )
}
export function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" {...S}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle cx="12" cy="7.6" r="0.4" fill="currentColor" />
    </svg>
  )
}
export function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" {...S}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.4 9.2a2.6 2.6 0 0 1 5 .9c0 1.8-2.4 2.2-2.4 4" />
      <circle cx="12" cy="16.8" r="0.5" fill="currentColor" />
    </svg>
  )
}
export function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}
