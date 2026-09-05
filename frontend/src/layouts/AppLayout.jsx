import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Nav from '../components/Nav.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../hooks/useTheme.js'
import { API_URL } from '../utils/apiUrl.js'

export default function AppLayout() {
  const { user, logout } = useAuth()
  const [themeMode, cycleTheme] = useTheme()
  const [apiOnline, setApiOnline] = useState(null)

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/health`, { cache: 'no-store' })
      setApiOnline(res.ok)
    } catch {
      setApiOnline(false)
    }
  }, [])

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 60000)
    return () => clearInterval(interval)
  }, [checkHealth])

  return (
    <>
      <Header apiOnline={apiOnline} themeMode={themeMode} onCycleTheme={cycleTheme} user={user} onSignOut={logout} />
      <Nav role={user?.role} isAdmin={user?.is_admin} />
      <main className="page">
        <Outlet />
      </main>
    </>
  )
}
