import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import GlassSidebar from '../components/glass/GlassSidebar.jsx'
import GlassNavbar from '../components/glass/GlassNavbar.jsx'
import CommandPalette from '../components/CommandPalette.jsx'
import {
  BriefcaseIcon, ChartIcon, CommandIcon, DocumentIcon, HomeIcon, LogOutIcon, MoonIcon, NoteIcon,
  PeopleIcon, ReportIcon, SearchIcon, SettingsIcon, ShieldIcon, SunIcon, SystemIcon,
  TrackIcon, UserIcon,
} from '../components/icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../hooks/useTheme.js'
import { API_URL } from '../utils/apiUrl.js'

const RECRUITER_LINKS = [
  { to: '/dashboard', label: 'Dashboard', Icon: HomeIcon },
  { to: '/jobs', label: 'Jobs', Icon: BriefcaseIcon },
  { to: '/candidates', label: 'Candidates', Icon: PeopleIcon },
  { to: '/matching', label: 'Matching', Icon: SearchIcon },
  { to: '/shortlists', label: 'Shortlist', Icon: NoteIcon },
  { to: '/analytics', label: 'Analytics', Icon: ChartIcon },
  { to: '/reports', label: 'Reports', Icon: ReportIcon },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
]

const CANDIDATE_LINKS = [
  { to: '/candidate/dashboard', label: 'Dashboard', Icon: HomeIcon },
  { to: '/profile', label: 'Profile', Icon: UserIcon },
  { to: '/resumes', label: 'Resumes', Icon: DocumentIcon },
  { to: '/matches', label: 'Matches', Icon: TrackIcon },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
]

const THEME_ICONS = { light: SunIcon, dark: MoonIcon, system: SystemIcon }
const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)

export default function AppLayout() {
  const { user, logout } = useAuth()
  const [themeMode, cycleTheme] = useTheme()
  const [apiOnline, setApiOnline] = useState(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const ThemeIcon = THEME_ICONS[themeMode]

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

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const links = user?.role === 'recruiter' ? RECRUITER_LINKS : CANDIDATE_LINKS
  const allLinks = user?.is_admin ? [...links, { to: '/admin', label: 'Admin', Icon: ShieldIcon }] : links

  return (
    <div className="glass-shell">
      <GlassSidebar
        links={allLinks}
        footer={(
          <>
            <button type="button" className="glass-sidebar-link" style={{ width: '100%' }} onClick={logout}>
              <LogOutIcon size={19} />
              <span>Sign out</span>
            </button>
            <nav className="glass-sidebar-legal" aria-label="Legal">
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
            </nav>
          </>
        )}
      />

      <div className="glass-content">
        <GlassNavbar
          title={user?.full_name || user?.email}
          actions={(
            <>
              <button type="button" className="command-palette-trigger" onClick={() => setPaletteOpen(true)}>
                <CommandIcon size={15} />
                Quick actions
                <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
              </button>
              <span className="api-status" title={apiOnline === null ? 'Checking API status' : apiOnline ? 'API is reachable' : 'API is unreachable'}>
                <span className={`api-status-dot ${apiOnline === true ? 'is-online' : apiOnline === false ? 'is-offline' : ''}`} />
                {apiOnline === null ? 'Checking…' : apiOnline ? 'API Online' : 'API Offline'}
              </span>
              {user && <span className="role-badge">{user.role}</span>}
              <button type="button" className="icon-btn" onClick={cycleTheme} aria-label={`Theme: ${themeMode}. Tap to change.`}>
                <ThemeIcon size={17} />
              </button>
            </>
          )}
        />
        <main className="page glass-page">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
