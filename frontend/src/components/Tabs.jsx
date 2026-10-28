// The tab strip used on detail pages. Arrow keys move between tabs, as the
// WAI-ARIA tabs pattern expects; the panel is rendered by the caller with
// tabPanelProps(id) from utils/workspace.js.
export default function Tabs({ tabs, current, onChange, label, counts = {} }) {
  const onKeyDown = (e) => {
    const index = tabs.findIndex((t) => t.id === current)
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = tabs[(index + step + tabs.length) % tabs.length]
    onChange(next.id)
    document.getElementById(`tab-${next.id}`)?.focus()
  }

  return (
    <div className="tabs" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          id={`tab-${t.id}`}
          aria-selected={current === t.id}
          aria-controls={`panel-${t.id}`}
          tabIndex={current === t.id ? 0 : -1}
          className={`tab-btn ${current === t.id ? 'is-active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {counts[t.id] !== undefined && <span className="tab-count num">{counts[t.id]}</span>}
        </button>
      ))}
    </div>
  )
}
