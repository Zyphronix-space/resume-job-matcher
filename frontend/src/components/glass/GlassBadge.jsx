const STATUS_VARIANT = {
  Shortlisted: 'success', Offer: 'success', Interview: 'warning', Screening: 'neutral',
  Applied: 'default', Rejected: 'danger', Open: 'success', Draft: 'neutral', Closed: 'danger',
}

export default function GlassBadge({ variant, status, children, className = '' }) {
  const resolved = variant || (status && STATUS_VARIANT[status]) || 'default'
  const classes = ['glass-badge', resolved !== 'default' && `glass-badge-${resolved}`, className].filter(Boolean).join(' ')
  return <span className={classes}>{children ?? status}</span>
}
