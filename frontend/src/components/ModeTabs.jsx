const MODES = [
  { id: 'single', label: 'Single analysis' },
  { id: 'compareResumes', label: 'Compare resumes' },
  { id: 'compareJobs', label: 'Compare jobs' },
]

export default function ModeTabs({ mode, onChange, disabled }) {
  return (
    <nav className="mode-tabs" role="tablist" aria-label="Analysis mode">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          role="tab"
          aria-selected={mode === m.id}
          className={`mode-tab ${mode === m.id ? 'is-active' : ''}`}
          onClick={() => !disabled && onChange(m.id)}
          disabled={disabled}
        >
          {m.label}
        </button>
      ))}
    </nav>
  )
}
