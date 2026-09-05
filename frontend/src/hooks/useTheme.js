import { useCallback, useEffect, useState } from 'react'

const THEME_STORAGE_KEY = 'recruitai-theme'

function getSystemPrefersDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveTheme(mode) {
  return mode === 'system' ? (getSystemPrefersDark() ? 'dark' : 'light') : mode
}

// The theme toggle is the one preference that stays in the browser's
// localStorage rather than the database — it's a per-device display
// setting, not user data.
export function useTheme() {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) || 'system'
    } catch {
      return 'system'
    }
  })

  useEffect(() => {
    document.body.setAttribute('data-theme', resolveTheme(mode))
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode)
    } catch {
      /* localStorage unavailable — theme just won't persist */
    }
  }, [mode])

  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (mode === 'system') document.body.setAttribute('data-theme', resolveTheme('system'))
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode])

  const cycle = useCallback(() => {
    setMode((m) => (m === 'light' ? 'dark' : m === 'dark' ? 'system' : 'light'))
  }, [])

  return [mode, cycle]
}
