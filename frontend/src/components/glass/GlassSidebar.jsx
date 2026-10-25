import { Link, NavLink } from 'react-router-dom'
import { Wordmark } from '../Logo.jsx'

export default function GlassSidebar({ links, footer, homeTo = '/' }) {
  return (
    <aside className="glass-sidebar">
      <Link to={homeTo} className="glass-sidebar-brand" aria-label="ResumeMatch dashboard">
        <Wordmark size={20} />
      </Link>

      <nav className="glass-sidebar-nav" aria-label="Main">
        {links.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `glass-sidebar-link ${isActive ? 'is-active' : ''}`}>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {footer && <div className="glass-sidebar-footer">{footer}</div>}
    </aside>
  )
}
