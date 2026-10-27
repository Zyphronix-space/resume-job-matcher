import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import GlassSidebar from '../components/glass/GlassSidebar.jsx'
import GlassNavbar from '../components/glass/GlassNavbar.jsx'
import CommandPalette from '../components/CommandPalette.jsx'
import { Wordmark } from '../components/Logo.jsx'
import {
  BriefcaseIcon, ChartIcon, CommandIcon, DocumentIcon, HomeIcon, LogOutIcon, MoonIcon, NoteIcon,
  PeopleIcon, ReportIcon, SearchIcon, SettingsIcon, ShieldIcon, SunIcon, SystemIcon,
  TrackIcon, UserIcon,
} from '../components/icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../hooks/useTheme.js'
import { API_URL } from '../utils/apiUrl.js'

const RECRUITER_LINKS = [
  { to: '/dashboard', label: 'Overview', Icon: HomeIcon },
  { to: '/jobs', label: 'Jobs', Icon: BriefcaseIcon },
  { to: '/candidates', label: 'Candidates', Icon: PeopleIcon },
  { to: '/matching', label: 'Matching', Icon: SearchIcon },
  { to: '/shortlists', label: 'Shortlist', Icon: NoteIcon },
  { to: '/analytics', label: 'Analytics', Icon: ChartIcon },
  { to: '/reports', label: 'Reports', Icon: ReportIcon },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
]

const CANDIDATE_LINKS = [
  { to: '/candidate/dashboard', label: 'Overview', Icon: HomeIcon },
  { to: '/matches', label: 'Matches', Icon: TrackIcon },
  { to: '/resumes', label: 'Resumes', Icon: DocumentIcon },
  { to: '/profile', label: 'Profile', Icon: UserIcon },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
]

const THEME_ICONS = { light: SunIcon, dark: MoonIcon, system: SystemIcon }
const THEME_LABELS = { light: 'Light', dark: 'Dark', system: 'System' }
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

  const isRecruiter = user?.role === 'recruiter'
  const homeTo = isRecruiter ? '/dashboard' : '/candidate/dashboard'
  const links = isRecruiter ? RECRUITER_LINKS : CANDIDATE_LINKS
  const allLinks = user?.is_admin ? [...links, { to: '/admin', label: 'Admin', Icon: ShieldIcon }] : links

  return (
    <div className="glass-shell">
      <a href="#main" className="skip-link">Skip to content</a>

      <GlassSidebar
        links={allLinks}
        homeTo={homeTo}
        footer={(
          <>
            <div className="glass-sidebar-account">
              <div className="glass-sidebar-account-name">{user?.full_name || user?.email}</div>
              <div className="glass-sidebar-account-meta">
                {isRecruiter ? 'Recruiter' : 'Candidate'}{user?.is_admin ? ', admin' : ''}
              </div>
            </div>
            <button type="button" className="glass-sidebar-link" onClick={logout}>
              <LogOutIcon size={18} />
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
          brand={<Link to={homeTo} aria-label="ResumeMatch dashboard"><Wordmark size={20} /></Link>}
          title={isRecruiter ? 'Recruiter workspace' : 'Candidate workspace'}
          actions={(
            <>
              {apiOnline === false && (
                <span className="api-status" role="status">
                  <span className="api-status-dot" aria-hidden="true" />
                  Can’t reach the server
                </span>
              )}
              <button type="button" className="command-palette-trigger" onClick={() => setPaletteOpen(true)} aria-label="Open quick actions">
                <CommandIcon size={14} />
                <span className="command-palette-trigger-label">Quick actions</span>
                <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={cycleTheme}
                aria-label={`Theme: ${THEME_LABELS[themeMode]}. Switch theme`}
                title={`Theme: ${THEME_LABELS[themeMode]}`}
              >
                <ThemeIcon size={17} />
              </button>
              <button type="button" className="icon-btn mobile-only" onClick={logout} aria-label="Sign out" title="Sign out">
                <LogOutIcon size={17} />
              </button>
            </>
          )}
        />
        <main className="glass-page" id="main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
