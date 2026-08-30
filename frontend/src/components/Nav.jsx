import { BriefcaseIcon, BookmarkIcon, HomeIcon, SearchIcon, ShieldIcon, TrackIcon } from './icons.jsx'

const PAGES = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'analyze', label: 'Analyze', Icon: SearchIcon },
  { id: 'find', label: 'Find Internships', Icon: BriefcaseIcon },
  { id: 'saved', label: 'Saved', Icon: BookmarkIcon },
  { id: 'applications', label: 'Applications', Icon: TrackIcon },
]

export default function Nav({ page, onChange, isAdmin }) {
  const pages = isAdmin ? [...PAGES, { id: 'admin', label: 'Admin', Icon: ShieldIcon }] : PAGES

  return (
    <nav className="app-nav" aria-label="Main">
      {pages.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={`app-nav-item ${page === id ? 'is-active' : ''}`}
          onClick={() => onChange(id)}
          aria-current={page === id ? 'page' : undefined}
        >
          <Icon size={20} />
          <span className="app-nav-label">{label}</span>
        </button>
      ))}
    </nav>
  )
}
