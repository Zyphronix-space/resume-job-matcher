import { useEffect, useRef, useState } from 'react'
import { ChevronDownIcon } from '../icons.jsx'

// A custom glass dropdown, not a native <select> — browsers render a
// native select's open option list with the OS's own styling and ignore
// almost all CSS on it, which is exactly the "looks off" white popup this
// replaces. Same value/onChange(value) contract as a controlled input.
export default function GlassSelect({ label, value, onChange, options, placeholder = 'Select…', className = '' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onClickAway = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false) }
    const onEscape = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClickAway)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClickAway)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  const current = options.find((o) => String(o.value) === String(value))

  return (
    <div className={`glass-field ${className}`} ref={rootRef}>
      {label && <span className="glass-field-label">{label}</span>}
      <div className="glass-select">
        <button
          type="button"
          className="glass-select-trigger"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={current ? '' : 'is-placeholder'}>{current ? current.label : placeholder}</span>
          <ChevronDownIcon size={15} className={`glass-select-chevron ${open ? 'is-open' : ''}`} />
        </button>
        {open && (
          <ul className="glass-select-menu" role="listbox">
            {options.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={String(o.value) === String(value)}
                  className={`glass-select-option ${String(o.value) === String(value) ? 'is-selected' : ''}`}
                  onClick={() => { onChange(o.value); setOpen(false) }}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
