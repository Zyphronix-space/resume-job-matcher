import { useEffect, useId, useRef } from 'react'
import { CloseIcon } from '../icons.jsx'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Focus moves into the dialog when it opens, Tab cycles inside it, Escape
// closes it, and focus returns to whatever opened it.
export default function GlassModal({ title, onClose, children, width }) {
  const dialogRef = useRef(null)
  const titleId = useId()
  // Parents pass inline arrow functions; keep the latest in a ref so the
  // effect below runs once per open, not on every parent render.
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    const previouslyFocused = document.activeElement
    const dialog = dialogRef.current
    const firstField = dialog?.querySelector('input, textarea, select')
    ;(firstField || dialog)?.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') { onCloseRef.current?.(); return }
      if (e.key !== 'Tab' || !dialog) return
      const items = [...dialog.querySelectorAll(FOCUSABLE)]
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previouslyFocused?.focus?.()
    }
  }, [])

  return (
    <div className="glass-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div
        ref={dialogRef}
        className="glass-modal"
        style={width ? { maxWidth: width } : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        <div className="glass-modal-header">
          {title && <h2 className="glass-modal-title" id={titleId}>{title}</h2>}
          {onClose && (
            <button type="button" className="glass-modal-close" onClick={onClose} aria-label="Close">
              <CloseIcon size={16} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
