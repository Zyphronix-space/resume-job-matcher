import { SunIcon, MoonIcon, SystemIcon, LogOutIcon } from './icons.jsx'
import Logo from './Logo.jsx'

const THEME_ICONS = { light: SunIcon, dark: MoonIcon, system: SystemIcon }

export default function Header({ apiOnline, themeMode, onCycleTheme, user, onSignOut }) {
  const ThemeIcon = THEME_ICONS[themeMode]

  return (
    <header className="app-header">
      <div className="app-header-brand">
        <span className="app-header-icon"><Logo size={26} /></span>
        <span className="app-header-title">Resume Match</span>
      </div>

      <div className="app-header-actions">
        <span className="api-status" title={apiOnline === null ? 'Checking API status' : apiOnline ? 'API is reachable' : 'API is unreachable'}>
          <span className={`api-status-dot ${apiOnline === true ? 'is-online' : apiOnline === false ? 'is-offline' : ''}`} />
          {apiOnline === null ? 'Checking…' : apiOnline ? 'API Online' : 'API Offline'}
        </span>
        {user && <span className="app-header-user" title={user.email}>{user.email}</span>}
        <button
          type="button"
          className="icon-btn"
          onClick={onCycleTheme}
          aria-label={`Theme: ${themeMode}. Tap to change.`}
        >
          <ThemeIcon size={18} />
        </button>
        {user && (
          <button type="button" className="icon-btn" onClick={onSignOut} aria-label="Sign out">
            <LogOutIcon size={17} />
          </button>
        )}
      </div>
    </header>
  )
}
