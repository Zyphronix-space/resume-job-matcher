import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  BriefcaseIcon, ChartIcon, DocumentIcon, NoteIcon, PeopleIcon, SearchIcon, SettingsIcon, TrackIcon,
} from './icons.jsx'

const RECRUITER_COMMANDS = [
  { id: 'create-job', label: 'Create Job', hint: 'Post a new job opening', Icon: BriefcaseIcon, to: '/jobs' },
  { id: 'search-candidate', label: 'Search Candidate', hint: 'Browse your candidate directory', Icon: PeopleIcon, to: '/candidates' },
  { id: 'search-job', label: 'Search Job', hint: 'Browse your job postings', Icon: SearchIcon, to: '/jobs' },
  { id: 'open-shortlist', label: 'Open Shortlist', hint: 'Shortlisted candidates by job', Icon: NoteIcon, to: '/shortlists' },
  { id: 'analytics', label: 'Analytics', hint: 'Pipeline and match analytics', Icon: ChartIcon, to: '/analytics' },
  { id: 'settings', label: 'Settings', hint: 'Profile and account security', Icon: SettingsIcon, to: '/settings' },
]

const CANDIDATE_COMMANDS = [
  { id: 'upload-resume', label: 'Upload Resume', hint: 'Manage your resumes', Icon: DocumentIcon, to: '/resumes' },
  { id: 'search-job', label: 'Search Job', hint: 'See your ranked job matches', Icon: SearchIcon, to: '/matches' },
  { id: 'applications', label: 'My Applications', hint: 'Track your applications', Icon: TrackIcon, to: '/candidate/dashboard' },
  { id: 'settings', label: 'Settings', hint: 'Profile and account security', Icon: SettingsIcon, to: '/settings' },
]

export default function CommandPalette({ open, onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)

  const commands = user?.role === 'recruiter' ? RECRUITER_COMMANDS : CANDIDATE_COMMANDS

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((c) => c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q))
  }, [commands, query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  useEffect(() => { setActiveIndex(0) }, [query])

  const run = (command) => {
    navigate(command.to)
    onClose()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && filtered[activeIndex]) { e.preventDefault(); run(filtered[activeIndex]) }
  }

  if (!open) return null

  return (
    <div className="glass-modal-overlay" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: '12vh' }}>
      <div
        className="glass-modal command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <input
          ref={inputRef}
          className="command-palette-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a command…"
          aria-label="Command palette search"
        />
        <ul className="command-palette-list">
          {filtered.length === 0 && <li className="command-palette-empty">No matching commands</li>}
          {filtered.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                className={`command-palette-item ${i === activeIndex ? 'is-active' : ''}`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => run(c)}
              >
                <c.Icon size={17} />
                <span>
                  <span className="command-palette-item-label">{c.label}</span>
                  <span className="command-palette-item-hint">{c.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="command-palette-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>Enter</kbd> select</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
