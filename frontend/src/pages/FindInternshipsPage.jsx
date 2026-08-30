import { useEffect, useState } from 'react'
import JobCard from '../components/JobCard.jsx'
import DemoBadge from '../components/DemoBadge.jsx'
import WhyMatchPanel from '../components/WhyMatchPanel.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { BriefcaseIcon } from '../components/icons.jsx'
import { rankJobs } from '../utils/recommendations.js'
import {
  LOCATION_OPTIONS, ROLE_OPTIONS, TECHNOLOGY_OPTIONS, WORK_MODE_OPTIONS,
} from '../utils/preferences.js'

const SORTS = [
  { id: 'best', label: 'Best match' },
  { id: 'recent', label: 'Most recent' },
  { id: 'location', label: 'Location' },
  { id: 'coverage', label: 'Skill coverage' },
]

const MIN_MATCH_OPTIONS = [
  { id: 0, label: 'Any match' },
  { id: 60, label: '60%+' },
  { id: 75, label: '75%+' },
  { id: 90, label: '90%+' },
]

function sortJobs(jobs, matches, sortId) {
  const withMatch = (j) => matches[j.id]
  const list = [...jobs]
  switch (sortId) {
    case 'best':
      return list.sort((a, b) => (withMatch(b)?.match_score ?? -1) - (withMatch(a)?.match_score ?? -1))
    case 'coverage':
      return list.sort((a, b) => (withMatch(b)?.skill_coverage ?? -1) - (withMatch(a)?.skill_coverage ?? -1))
    case 'location':
      return list.sort((a, b) => a.location.localeCompare(b.location))
    case 'recent':
    default:
      return list.sort((a, b) => (b.posted_date || '').localeCompare(a.posted_date || ''))
  }
}

export default function FindInternshipsPage({
  apiUrl,
  cvFile,
  jobs,
  matches,
  isDemo,
  loading,
  error,
  onSearch,
  onOpenDetail,
  savedJobIds,
  onToggleSave,
  preferences,
  onSavePreferences,
}) {
  const [form, setForm] = useState({ role: '', location: '', workMode: 'Any', skills: '', company: '', keyword: '' })
  const [sort, setSort] = useState('best')
  const [minMatch, setMinMatch] = useState(0)
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    if (!hasSearched && jobs.length === 0) {
      onSearch({})
      setHasSearched(true)
    }
  }, [hasSearched, jobs.length, onSearch])

  const handleSubmit = (e) => {
    e.preventDefault()
    setHasSearched(true)
    onSearch(form)
  }

  const visibleJobs = sortJobs(
    jobs.filter((j) => !matches[j.id] || matches[j.id].match_score >= minMatch),
    matches,
    sort,
  )

  const recommended = cvFile ? rankJobs(jobs, matches, preferences, 3) : []

  return (
    <section className="find-page">
      <section className="hero">
        <h1 className="hero-title">Find internships</h1>
        <p className="hero-subtitle">Search internships and see exactly how your resume matches each one.</p>
      </section>

      <form className="panel find-form" onSubmit={handleSubmit}>
        <div className="find-form-grid">
          <label className="find-field">
            <span>Role</span>
            <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Software Engineer Intern" />
          </label>
          <label className="find-field">
            <span>Location</span>
            <select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}>
              <option value="">Any</option>
              {LOCATION_OPTIONS.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </label>
          <label className="find-field">
            <span>Work mode</span>
            <select value={form.workMode} onChange={(e) => setForm({ ...form, workMode: e.target.value })}>
              {WORK_MODE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label className="find-field">
            <span>Skills</span>
            <input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Python, React" />
          </label>
          <label className="find-field">
            <span>Company</span>
            <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Optional" />
          </label>
          <label className="find-field">
            <span>Keyword</span>
            <input value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} placeholder="Optional" />
          </label>
        </div>
        <button type="submit" className="analyze-btn find-submit-btn">Find internships</button>
      </form>

      <button type="button" className="tech-details-toggle preferences-toggle" onClick={() => setPrefsOpen((o) => !o)} aria-expanded={prefsOpen}>
        Preferences (used for recommendations)
      </button>
      {prefsOpen && (
        <div className="panel preferences-panel">
          <div className="preferences-group">
            <span className="req-category-title">Preferred roles</span>
            <div className="pref-chip-row">
              {ROLE_OPTIONS.map((role) => (
                <button
                  type="button"
                  key={role}
                  className={`pref-chip ${preferences.roles.includes(role) ? 'is-active' : ''}`}
                  onClick={() => onSavePreferences({
                    ...preferences,
                    roles: preferences.roles.includes(role) ? preferences.roles.filter((r) => r !== role) : [...preferences.roles, role],
                  })}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
          <div className="preferences-group">
            <span className="req-category-title">Preferred locations</span>
            <div className="pref-chip-row">
              {LOCATION_OPTIONS.map((loc) => (
                <button
                  type="button"
                  key={loc}
                  className={`pref-chip ${preferences.locations.includes(loc) ? 'is-active' : ''}`}
                  onClick={() => onSavePreferences({
                    ...preferences,
                    locations: preferences.locations.includes(loc) ? preferences.locations.filter((l) => l !== loc) : [...preferences.locations, loc],
                  })}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>
          <div className="preferences-group">
            <span className="req-category-title">Work mode</span>
            <div className="pref-chip-row">
              {WORK_MODE_OPTIONS.map((m) => (
                <button
                  type="button"
                  key={m}
                  className={`pref-chip ${preferences.workMode === m ? 'is-active' : ''}`}
                  onClick={() => onSavePreferences({ ...preferences, workMode: m })}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="preferences-group">
            <span className="req-category-title">Preferred technologies</span>
            <div className="pref-chip-row">
              {TECHNOLOGY_OPTIONS.map((tech) => (
                <button
                  type="button"
                  key={tech}
                  className={`pref-chip ${preferences.technologies.includes(tech) ? 'is-active' : ''}`}
                  onClick={() => onSavePreferences({
                    ...preferences,
                    technologies: preferences.technologies.includes(tech) ? preferences.technologies.filter((t) => t !== tech) : [...preferences.technologies, tech],
                  })}
                >
                  {tech}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {recommended.length > 0 && (
        <div className="panel">
          <h2 className="panel-title">Recommended for you</h2>
          <p className="panel-subtitle">Ranked using explainable signals — see exactly why below.</p>
          <div className="recommend-list">
            {recommended.map((job) => (
              <div key={job.id} className="recommend-item">
                <div className="recommend-item-head">
                  <strong>{job.title}</strong>
                  <span className="job-card-company">{job.company}</span>
                  <button type="button" className="job-card-btn job-card-btn-secondary" onClick={() => onOpenDetail(job.id)}>View</button>
                </div>
                <WhyMatchPanel job={job} matchResult={matches[job.id]} preferences={preferences} title="Recommended because" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="find-toolbar">
        <div className="find-toolbar-group">
          <span className="find-toolbar-label">Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div className="find-toolbar-group">
          <span className="find-toolbar-label">Min. match</span>
          <select value={minMatch} onChange={(e) => setMinMatch(Number(e.target.value))}>
            {MIN_MATCH_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
        {isDemo && <DemoBadge />}
      </div>

      {loading && <p className="skill-empty">Searching internships…</p>}
      {error && <p className="field-error">{error}</p>}

      {!loading && !error && visibleJobs.length === 0 && (
        <EmptyState icon={<BriefcaseIcon size={28} />} title="No opportunities found" subtitle="Try changing your filters." />
      )}

      {!loading && visibleJobs.length > 0 && (
        <div className="job-grid">
          {visibleJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              matchResult={matches[job.id]}
              isSaved={savedJobIds.has(job.id)}
              onOpenDetail={onOpenDetail}
              onToggleSave={() => onToggleSave(job, matches[job.id])}
            />
          ))}
        </div>
      )}
    </section>
  )
}
