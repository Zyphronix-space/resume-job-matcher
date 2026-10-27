import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDownIcon } from '../icons.jsx'

// A custom dropdown, not a native <select>: browsers render a native
// select's open option list with the OS's own styling and ignore almost all
// CSS on it. Same value/onChange(value) contract as a controlled input.
// Keyboard: Enter/Space/ArrowDown opens, arrows move, Escape closes and
// returns focus to the trigger.
export default function GlassSelect({ label, ariaLabel, value, onChange, options, placeholder = 'Select…', className = '' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const listRef = useRef(null)
  const labelId = useId()

  useEffect(() => {
    if (!open) return undefined
    const onClickAway = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
  }, [open])

  useEffect(() => {
    if (!open || !listRef.current) return
    const target = listRef.current.querySelector('[aria-selected="true"]') || listRef.current.querySelector('[role="option"]')
    target?.focus()
  }, [open])

  const current = options.find((o) => String(o.value) === String(value))

  const close = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  const onTriggerKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
    }
  }

  const onListKeyDown = (e) => {
    const items = [...listRef.current.querySelectorAll('[role="option"]')]
    const index = items.indexOf(document.activeElement)
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close() }
    if (e.key === 'Tab') setOpen(false)
    if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(index + 1, items.length - 1)]?.focus() }
    if (e.key === 'ArrowUp') { e.preventDefault(); items[Math.max(index - 1, 0)]?.focus() }
    if (e.key === 'Home') { e.preventDefault(); items[0]?.focus() }
    if (e.key === 'End') { e.preventDefault(); items[items.length - 1]?.focus() }
  }

  return (
    <div className={`glass-field ${className}`} ref={rootRef}>
      {label && <span className="glass-field-label" id={labelId}>{label}</span>}
      <div className="glass-select">
        <button
          ref={triggerRef}
          type="button"
          className="glass-select-trigger"
          onClick={() => setOpen((o) => !o)}
          onKeyDown={onTriggerKeyDown}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={label ? `${labelId} ${labelId}-value` : undefined}
          aria-label={label ? undefined : ariaLabel}
        >
          <span id={`${labelId}-value`} className={current ? '' : 'is-placeholder'}>{current ? current.label : placeholder}</span>
          <ChevronDownIcon size={15} className={`glass-select-chevron ${open ? 'is-open' : ''}`} />
        </button>
        {open && (
          <ul className="glass-select-menu" role="listbox" ref={listRef} onKeyDown={onListKeyDown} aria-labelledby={label ? labelId : undefined} aria-label={label ? undefined : ariaLabel}>
            {options.map((o) => {
              const isSelected = String(o.value) === String(value)
              return (
                <li key={o.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`glass-select-option ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => { onChange(o.value); close() }}
                  >
                    {o.label}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
