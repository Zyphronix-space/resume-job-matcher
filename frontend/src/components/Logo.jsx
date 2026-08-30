// A custom mark, not a stock icon: a magnifying glass (search / "find") with
// a checkmark inside the lens (a confirmed match), handle drawn as a single
// stroke. Reads as "search resulted in a match" — the app's whole premise.
export default function Logo({ size = 26, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="resume-match-logo-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-strong)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#resume-match-logo-grad)" />
      <circle cx="13.2" cy="13.2" r="6" fill="none" stroke="var(--accent-contrast)" strokeWidth="2.3" />
      <path
        d="M22.4 22.4 17.5 17.5"
        stroke="var(--accent-contrast)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M10.3 13.4 12.4 15.5 16.4 10.9"
        fill="none"
        stroke="var(--accent-contrast)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
