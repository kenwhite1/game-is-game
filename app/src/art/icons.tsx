// Аккуратные интерфейсные иконки (тонкая линия, currentColor).
import type { JSX } from 'react'
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
    <svg viewBox="0 0 24 24" {...S}><path d="M9 6l6 6-6 6" /></svg>
  )
}
export function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z" /></svg>
  )
}
export function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" {...S}>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </svg>
  )
}
export function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" {...S}>
      <circle cx="6" cy="12" r="2.4" /><circle cx="18" cy="6" r="2.4" /><circle cx="18" cy="18" r="2.4" />
      <path d="M8.1 11l7.8-4M8.1 13l7.8 4" />
    </svg>
  )
}
export function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M4 20h4l10-10-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" />
    </svg>
  )
}
export function PlusIcon() {
  return (<svg viewBox="0 0 24 24" {...S}><path d="M12 5v14M5 12h14" /></svg>)
}
export function CheckIcon() {
  return (<svg viewBox="0 0 24 24" {...S}><path d="M5 13l4 4L19 7" /></svg>)
}
export function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" {...S}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8l1.4 2.5 2.8-.5.4 2.8 2.5 1.4-1.3 2.5 1.3 2.5-2.5 1.4-.4 2.8-2.8-.5L12 21.2l-1.4-2.5-2.8.5-.4-2.8-2.5-1.4 1.3-2.5-1.3-2.5 2.5-1.4.4-2.8 2.8.5z" />
    </svg>
  )
}
export function CloseIcon() {
  return (<svg viewBox="0 0 24 24" {...S}><path d="M6 6l12 12M18 6L6 18" /></svg>)
}
export function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" {...S}>
      <rect x="5" y="11" width="14" height="9" rx="2.2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}
export function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" />
      <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
      <path d="M12 13v3M9 20h6M10 20v-1.5a2 2 0 0 1 4 0V20" />
    </svg>
  )
}

// ─── Иконки нижней навигации ────────────────────────────────────────────
function HomeNav() {
  return (<svg viewBox="0 0 24 24" {...S}><path d="M4 11.5L12 4l8 7.5" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></svg>)
}
function FriendsNav() {
  return (
    <svg viewBox="0 0 24 24" {...S}>
      <circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.2a3 3 0 0 1 0 5.6M17.5 13.4A5.3 5.3 0 0 1 20.5 18" />
    </svg>
  )
}
function ActivityNav() {
  return (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M3 12h3l2.5 6 4-13 2.5 7H21" />
    </svg>
  )
}
function ProfileNav() {
  return (
    <svg viewBox="0 0 24 24" {...S}>
      <circle cx="12" cy="8.5" r="3.6" /><path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  )
}
function StyleNav() {
  // искра/«магия» — кастомизация образа
  return (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" />
      <path d="M18 14l.9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9L18 14z" />
    </svg>
  )
}
function ShopNav() {
  return (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M6 8h12l-1 11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  )
}

export const TabIcons: Record<string, JSX.Element> = {
  home: <HomeNav />,
  shop: <ShopNav />,
  style: <StyleNav />,
  friends: <FriendsNav />,
  activity: <ActivityNav />,
  profile: <ProfileNav />,
}
