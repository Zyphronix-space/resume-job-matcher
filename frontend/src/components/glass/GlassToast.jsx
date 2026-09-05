import { createContext, useCallback, useContext, useState } from 'react'
import { CheckIcon, CloseIcon, WarningIcon } from '../icons.jsx'

const ToastContext = createContext(null)
const ICONS = { success: CheckIcon, error: WarningIcon, info: CheckIcon }
let toastIdCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), [])

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    toastIdCounter += 1
    const id = toastIdCounter
    setToasts((prev) => [...prev, { id, message, type }])
    if (duration) setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="glass-toast-viewport" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || CheckIcon
          return (
            <div className={`glass-toast is-${t.type}`} key={t.id} role="status">
              <span className="glass-toast-icon"><Icon size={16} /></span>
              <span>{t.message}</span>
              <button type="button" className="glass-toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                <CloseIcon size={13} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
