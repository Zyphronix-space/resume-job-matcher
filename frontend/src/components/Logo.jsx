// The mark is two overlapping sheets, a resume and a job description, on a
// solid accent tile. The overlap is the only filled shape, because the match
// is where they overlap. The tile keeps it legible at 16px and on any
// background; accent and accent-contrast swap it for the dark theme.
// public/favicon.svg is the same drawing with the light-theme colors baked in.
export default function Logo({ size = 22, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <rect width="24" height="24" rx="5.5" fill="var(--accent)" />
      <g fill="none" stroke="var(--accent-contrast)" strokeWidth="1.75">
        <rect x="5" y="4.5" width="9" height="11.5" rx="1.5" />
        <rect x="10" y="8" width="9" height="11.5" rx="1.5" />
      </g>
      <rect x="10" y="8" width="4" height="8" fill="var(--accent-contrast)" />
    </svg>
  )
}

export function Wordmark({ size = 22, className = '' }) {
  return (
    <span className={`wordmark ${className}`}>
      <Logo size={size} className="wordmark-mark" />
      <span className="wordmark-text">Resume<span className="wordmark-strong">Match</span></span>
    </span>
  )
}
