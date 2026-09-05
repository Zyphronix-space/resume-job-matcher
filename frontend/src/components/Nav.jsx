import { NavLink } from 'react-router-dom'
import {
  BriefcaseIcon, ChartIcon, DocumentIcon, HomeIcon, NoteIcon, PeopleIcon,
  ReportIcon, SearchIcon, SettingsIcon, ShieldIcon, TrackIcon, UserIcon,
} from './icons.jsx'

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

export default function Nav({ role, isAdmin }) {
  const links = role === 'recruiter' ? RECRUITER_LINKS : CANDIDATE_LINKS

  return (
    <nav className="app-nav" aria-label="Main">
      {links.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `app-nav-item ${isActive ? 'is-active' : ''}`}
        >
          <Icon size={20} />
          <span className="app-nav-label">{label}</span>
        </NavLink>
      ))}
      {isAdmin && (
        <NavLink to="/admin" className={({ isActive }) => `app-nav-item ${isActive ? 'is-active' : ''}`}>
          <ShieldIcon size={20} />
          <span className="app-nav-label">Admin</span>
        </NavLink>
      )}
    </nav>
  )
}
