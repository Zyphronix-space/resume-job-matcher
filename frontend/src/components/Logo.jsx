// The mark is two overlapping sheets, a resume and a job description. The
// overlap is the only filled shape, because the match is where they overlap.
// One color (currentColor or the accent), no gradient, so it holds up at
// 16px and in both themes.
export default function Logo({ size = 22, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <rect x="2.75" y="2.75" width="12" height="15" rx="1.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9.25" y="6.25" width="12" height="15" rx="1.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9.25" y="6.25" width="5.5" height="11.5" fill="var(--accent)" />
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
