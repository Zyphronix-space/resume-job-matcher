import { NavLink } from 'react-router-dom'
import Logo from '../Logo.jsx'

export default function GlassSidebar({ links, footer }) {
  return (
    <aside className="glass-sidebar">
      <div className="glass-sidebar-brand">
        <Logo size={26} />
        <span>RecruitAI</span>
      </div>

      <nav className="glass-sidebar-nav" aria-label="Main">
        {links.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `glass-sidebar-link ${isActive ? 'is-active' : ''}`}>
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {footer && <div className="glass-sidebar-footer">{footer}</div>}
    </aside>
  )
}
