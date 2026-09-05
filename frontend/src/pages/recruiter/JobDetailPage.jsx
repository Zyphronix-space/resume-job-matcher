import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import EmptyState from '../../components/EmptyState.jsx'
import JobForm from '../../components/JobForm.jsx'
import MatchSummary from '../../components/MatchSummary.jsx'
import { skillLabel } from '../../utils/skillLabel.js'
import { changeApplicationStatus, compareApplications, rankCandidatesForJob } from '../../utils/applications.js'
import { deleteJob, getJob, updateJob } from '../../utils/jobs.js'
import { downloadComparisonCsv, downloadJobReport } from '../../utils/analytics.js'

const TABS = ['Overview', 'Requirements', 'Candidates', 'AI Matches', 'Shortlisted']
const STATUSES = ['Applied', 'Screening', 'Interview', 'Offer', 'Shortlisted', 'Rejected']

function CandidateRow({ app, onStatusChange, selected, onToggleSelect }) {
  return (
    <tr>
      <td data-label="Select">
        <input type="checkbox" checked={selected} onChange={() => onToggleSelect(app.id)} aria-label={`Select ${app.candidate.full_name}`} />
      </td>
      <td data-label="Candidate"><Link to={`/candidates/${app.candidate.id}`}>{app.candidate.full_name}</Link></td>
      <td data-label="Match">{Math.round(app.match_score)}%</td>
      <td data-label="Skills">{app.matched_skills.length} matched, {app.missing_skills.length} missing</td>
      <td data-label="Status">
        <select className="status-select" value={app.status} onChange={(e) => onStatusChange(app.id, e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      <td data-label="Actions">
        <div className="data-table-actions">
          <button type="button" className="new-analysis-btn" onClick={() => onStatusChange(app.id, 'Shortlisted')}>Shortlist</button>
          <button type="button" className="file-card-remove" onClick={() => onStatusChange(app.id, 'Rejected')}>Reject</button>
        </div>
      </td>
    </tr>
  )
}

export default function JobDetailPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [job, setJob] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [error, setError] = useState(null)
  const [tab, setTab] = useState(TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'Overview')
  const [editing, setEditing] = useState(false)

  const [sort, setSort] = useState('best_match')
  const [minScore, setMinScore] = useState('')
  const [skillFilter, setSkillFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [selected, setSelected] = useState(new Set())
  const [compareResults, setCompareResults] = useState(null)
  const [selectedMatchId, setSelectedMatchId] = useState(null)

  const loadJob = () => getJob(jobId).then(setJob).catch((err) => setError(err.message))
  const loadCandidates = () =>
    rankCandidatesForJob(jobId, { sort, minScore: minScore || undefined, skill: skillFilter || undefined, status: statusFilter || undefined })
      .then((data) => {
        setCandidates(data)
        if (!selectedMatchId && data.length) setSelectedMatchId(data[0].id)
      })
      .catch((err) => setError(err.message))

  useEffect(() => { loadJob() }, [jobId])
  useEffect(() => { loadCandidates() }, [jobId, sort, minScore, skillFilter, statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = async (id, status) => {
    await changeApplicationStatus(id, status)
    loadCandidates()
  }

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const runCompare = async () => {
    const results = await compareApplications([...selected])
    setCompareResults(results)
  }

  const handleUpdate = async (payload) => {
    const updated = await updateJob(jobId, payload)
    setJob(updated)
    setEditing(false)
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${job.title}"? This also removes its applications.`)) return
    await deleteJob(jobId)
    navigate('/jobs')
  }

  const shortlisted = useMemo(() => candidates.filter((c) => c.status === 'Shortlisted'), [candidates])
  const selectedMatch = candidates.find((c) => c.id === selectedMatchId) || null

  if (error) return <p className="field-error">{error}</p>
  if (!job) return null

  return (
    <>
      <section className="hero" style={{ padding: '1.2rem 0' }}>
        <h1 className="hero-title" style={{ fontSize: '2rem' }}>{job.title}</h1>
        <p className="hero-subtitle">{job.location || 'Location not set'} · {job.employment_type} · <span className={`status-pill status-${job.status.toLowerCase()}`}>{job.status}</span></p>
      </section>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} type="button" className={`tab-btn ${tab === t ? 'is-active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="panel">
          <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="new-analysis-btn" onClick={() => setEditing((e) => !e)}>{editing ? 'Cancel edit' : 'Edit job'}</button>
            <button type="button" className="file-card-remove" onClick={handleDelete}>Delete job</button>
          </div>
          {editing ? (
            <JobForm initial={job} onSubmit={handleUpdate} onCancel={() => setEditing(false)} submitLabel="Save changes" />
          ) : (
            <>
              <h2 className="panel-title">Description</h2>
              <p className="panel-subtitle" style={{ whiteSpace: 'pre-wrap' }}>{job.description || 'No description provided.'}</p>
            </>
          )}
        </div>
      )}

      {tab === 'Requirements' && (
        <div className="panel">
          <h2 className="panel-title">Requirements</h2>
          <dl className="tech-details-list" style={{ marginTop: '0.8rem' }}>
            <div className="tech-details-row"><dt>Experience</dt><dd>{job.experience || 'Not specified'}</dd></div>
            <div className="tech-details-row"><dt>Education</dt><dd>{job.education || 'Not specified'}</dd></div>
          </dl>
          <h3 className="roadmap-subheading">Required skills</h3>
          <div className="chip-input-row">
            {job.required_skills.length ? job.required_skills.map((s) => <span key={s} className="skill-pill skill-pill-matched">{skillLabel(s)}</span>) : <p className="skill-empty">None specified</p>}
          </div>
          <h3 className="roadmap-subheading" style={{ marginTop: '1rem' }}>Preferred skills</h3>
          <div className="chip-input-row">
            {job.preferred_skills.length ? job.preferred_skills.map((s) => <span key={s} className="skill-pill">{skillLabel(s)}</span>) : <p className="skill-empty">None specified</p>}
          </div>
        </div>
      )}

      {tab === 'Candidates' && (
        <div className="panel">
          <div className="form-grid cols-2" style={{ marginBottom: '1rem' }}>
            <label className="find-field"><span>Min score</span><input type="number" min="0" max="100" value={minScore} onChange={(e) => setMinScore(e.target.value)} /></label>
            <label className="find-field"><span>Skill contains</span><input value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} placeholder="e.g. python" /></label>
            <label className="find-field">
              <span>Status</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Any</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="find-field">
              <span>Sort by</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="best_match">Best match</option>
                <option value="newest">Newest</option>
                <option value="experience">Experience (skills matched)</option>
              </select>
            </label>
          </div>

          {selected.size >= 2 && (
            <div className="form-actions">
              <button type="button" className="analyze-btn" onClick={runCompare}>Compare {selected.size} candidates</button>
            </div>
          )}

          {compareResults && (
            <div className="compare-table-wrap" style={{ marginBottom: '1.2rem' }}>
              <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="new-analysis-btn" onClick={() => downloadComparisonCsv(compareResults)}>Download comparison (CSV)</button>
              </div>
              <table className="compare-table">
                <thead><tr><th>Candidate</th><th>Match</th><th>Skills</th><th>Experience</th><th>Education</th><th>Status</th></tr></thead>
                <tbody>
                  {compareResults.map((a) => (
                    <tr key={a.id}>
                      <td>{a.candidate.full_name}</td>
                      <td>{Math.round(a.match_score)}%</td>
                      <td>{a.matched_skills.length} matched</td>
                      <td>{a.job.experience || '—'}</td>
                      <td>{a.job.education || '—'}</td>
                      <td>{a.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {candidates.length === 0 ? (
            <EmptyState title="No candidates match these filters" />
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead><tr><th></th><th>Candidate</th><th>Match</th><th>Skills</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {candidates.map((app) => (
                    <CandidateRow
                      key={app.id}
                      app={app}
                      onStatusChange={handleStatusChange}
                      selected={selected.has(app.id)}
                      onToggleSelect={toggleSelect}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'AI Matches' && (
        <div className="panel">
          <label className="find-field" style={{ maxWidth: 360, marginBottom: '1rem' }}>
            <span>Candidate</span>
            <select value={selectedMatchId || ''} onChange={(e) => setSelectedMatchId(e.target.value)}>
              {candidates.map((a) => <option key={a.id} value={a.id}>{a.candidate.full_name} — {Math.round(a.match_score)}%</option>)}
            </select>
          </label>
          {selectedMatch ? <MatchSummary result={selectedMatch} /> : <EmptyState title="No candidates to analyze yet" />}
        </div>
      )}

      {tab === 'Shortlisted' && (
        <div className="panel">
          <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="new-analysis-btn" onClick={() => downloadJobReport(jobId, job.title)}>Download report (CSV)</button>
          </div>
          {shortlisted.length === 0 ? (
            <EmptyState title="No shortlisted candidates yet" subtitle="Shortlist a candidate from the Candidates tab." />
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead><tr><th>Candidate</th><th>Match</th><th>Status</th></tr></thead>
                <tbody>
                  {shortlisted.map((a) => (
                    <tr key={a.id}>
                      <td data-label="Candidate"><Link to={`/candidates/${a.candidate.id}`}>{a.candidate.full_name}</Link></td>
                      <td data-label="Match">{Math.round(a.match_score)}%</td>
                      <td data-label="Status"><span className="status-pill status-shortlisted">{a.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  )
}
