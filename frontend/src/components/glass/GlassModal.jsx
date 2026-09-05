import { useEffect } from 'react'
import { CloseIcon } from '../icons.jsx'

export default function GlassModal({ title, onClose, children, width }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="glass-modal-overlay" onClick={onClose}>
      <div
        className="glass-modal"
        style={width ? { maxWidth: width } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass-modal-header">
          {title && <h2 className="glass-modal-title">{title}</h2>}
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
