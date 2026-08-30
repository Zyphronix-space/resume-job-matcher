// Minimal stroke-based icon set — no emoji, no icon package.
// Every icon takes the same (size, className) shape and uses currentColor.

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function DocumentIcon({ size = 24, className }) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  )
}

export function UploadIcon({ size = 24, className }) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

export function CheckIcon({ size = 24, className }) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M5 12.5 10 17l9-10" />
    </svg>
  )
}

export function WarningIcon({ size = 24, className }) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  )
}

export function CloseIcon({ size = 24, className }) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

export function SunIcon({ size = 24, className }) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.3M12 19.2v2.3M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.3M19.2 12h2.3M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
    </svg>
  )
}

export function MoonIcon({ size = 24, className }) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    </svg>
  )
}

export function SystemIcon({ size = 24, className }) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 0 0 18Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function MatchIcon({ size = 24, className }) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <circle cx="8" cy="12" r="4.5" />
      <circle cx="16" cy="12" r="4.5" />
    </svg>
  )
}

export function ArrowDownIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M12 4v14M6 12l6 6 6-6" />
    </svg>
  )
}

export function ChevronDownIcon({ size = 18, className }) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function TrashIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
    </svg>
  )
}

export function HomeIcon({ size = 20, className }) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4h4v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </svg>
  )
}

export function BriefcaseIcon({ size = 20, className }) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <rect x="3" y="7.5" width="18" height="12" rx="2" />
      <path d="M8 7.5V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1.5" />
      <path d="M3 13h18" />
    </svg>
  )
}

export function BookmarkIcon({ size = 20, className, filled = false }) {
  return (
    <svg width={size} height={size} className={className} {...base} fill={filled ? 'currentColor' : 'none'}>
      <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4-7 4V4.5a1 1 0 0 1 1-1Z" />
    </svg>
  )
}

export function TrackIcon({ size = 20, className }) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M4 6h11M4 12h7M4 18h11" />
      <circle cx="19" cy="6" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="14" cy="18" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function SearchIcon({ size = 18, className }) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.3-4.3" />
    </svg>
  )
}

export function LocationIcon({ size = 14, className }) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  )
}

export function ShieldIcon({ size = 20, className }) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M12 3.5 5 6.5v5c0 5 3 7.8 7 9 4-1.2 7-4 7-9v-5Z" />
      <path d="m9 12 2 2 4-4.5" />
    </svg>
  )
}

export function LogOutIcon({ size = 18, className }) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

export function ExternalLinkIcon({ size = 15, className }) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M14 4h6v6" />
      <path d="M20 4 10 14" />
      <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
    </svg>
  )
}
