import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import GlassCard from '../../components/glass/GlassCard.jsx'
import GlassButton from '../../components/glass/GlassButton.jsx'
import GlassBadge from '../../components/glass/GlassBadge.jsx'
import GlassInput from '../../components/glass/GlassInput.jsx'
import GlassSelect from '../../components/glass/GlassSelect.jsx'
import GlassCandidateCard from '../../components/glass/GlassCandidateCard.jsx'
import GlassCheckbox from '../../components/glass/GlassCheckbox.jsx'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
import { useToast } from '../../components/glass/GlassToast.jsx'
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
      <GlassCheckbox checked={selected} onChange={() => onToggleSelect(app.id)} aria-label={`Select ${app.candidate.full_name}`} />
      <div style={{ flex: 1 }}>
        <GlassCandidateCard
          name={app.candidate.full_name}
          meta={`${app.matched_skills.length} matched, ${app.missing_skills.length} missing skills`}
          score={app.match_score}
          actions={(
            <>
              <GlassSelect
                className="status-select-glass" value={app.status} onChange={(status) => onStatusChange(app.id, status)}
                options={STATUSES.map((s) => ({ value: s, label: s }))}
              />
              <GlassButton as={Link} to={`/candidates/${app.candidate.id}`} variant="secondary" size="sm">View</GlassButton>
              <GlassButton variant="secondary" size="sm" onClick={() => onStatusChange(app.id, 'Shortlisted')}>Shortlist</GlassButton>
              <GlassButton variant="danger" size="sm" onClick={() => onStatusChange(app.id, 'Rejected')}>Reject</GlassButton>
            </>
          )}
        />
      </div>
    </div>
  )
}

export default function JobDetailPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const showToast = useToast()
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
    showToast(`Status updated to ${status}`, 'success')
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
    showToast('Job updated', 'success')
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
        <p className="hero-subtitle">{job.location || 'Location not set'} · {job.employment_type} · <GlassBadge status={job.status} /></p>
      </section>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} type="button" className={`tab-btn ${tab === t ? 'is-active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Overview' && (
        <GlassCard>
          <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
            <GlassButton variant="secondary" onClick={() => setEditing((e) => !e)}>{editing ? 'Cancel edit' : 'Edit job'}</GlassButton>
            <GlassButton variant="danger" onClick={handleDelete}>Delete job</GlassButton>
          </div>
          {editing ? (
            <JobForm initial={job} onSubmit={handleUpdate} onCancel={() => setEditing(false)} submitLabel="Save changes" />
          ) : (
            <>
              <h2 className="glass-card-title">Description</h2>
              <p className="glass-card-subtitle" style={{ whiteSpace: 'pre-wrap' }}>{job.description || 'No description provided.'}</p>
            </>
          )}
        </GlassCard>
      )}

      {tab === 'Requirements' && (
        <GlassCard title="Requirements">
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
        </GlassCard>
      )}

      {tab === 'Candidates' && (
        <GlassCard>
          <div className="form-grid cols-2" style={{ marginBottom: '1rem' }}>
            <GlassInput label="Min score" type="number" min="0" max="100" value={minScore} onChange={(e) => setMinScore(e.target.value)} />
            <GlassInput label="Skill contains" value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} placeholder="e.g. python" />
            <GlassSelect
              label="Status" value={statusFilter} onChange={setStatusFilter} placeholder="Any"
              options={[{ value: '', label: 'Any' }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
            />
            <GlassSelect
              label="Sort by" value={sort} onChange={setSort}
              options={[
                { value: 'best_match', label: 'Best match' },
                { value: 'newest', label: 'Newest' },
                { value: 'experience', label: 'Experience (skills matched)' },
              ]}
            />
          </div>

          {selected.size >= 2 && (
            <div className="form-actions">
              <GlassButton variant="primary" onClick={runCompare}>Compare {selected.size} candidates</GlassButton>
            </div>
          )}

          {compareResults && (
            <div className="compare-table-wrap" style={{ marginBottom: '1.2rem' }}>
              <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
                <GlassButton variant="secondary" size="sm" onClick={() => downloadComparisonCsv(compareResults)}>Download comparison (CSV)</GlassButton>
              </div>
              <table className="compare-table">
                <thead><tr><th>Candidate</th><th>Match</th><th>Skills</th><th>Experience</th><th>Education</th><th>Status</th></tr></thead>
                <tbody>
                  {compareResults.map((a) => (
                    <tr key={a.id}>
                      <td>{a.candidate.full_name}</td>
                      <td>{Math.round(a.match_score)}%</td>
                      <td>{a.matched_skills.length} matched</td>
                      <td>{a.job.experience || 'N/A'}</td>
                      <td>{a.job.education || 'N/A'}</td>
                      <td><GlassBadge status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {candidates.length === 0 ? (
            <GlassEmptyState title="No candidates match these filters" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {candidates.map((app) => (
                <CandidateRow
                  key={app.id}
                  app={app}
                  onStatusChange={handleStatusChange}
                  selected={selected.has(app.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {tab === 'AI Matches' && (
        <GlassCard>
          <GlassSelect
            label="Candidate" className="candidate-picker" value={selectedMatchId || ''} onChange={setSelectedMatchId}
            options={candidates.map((a) => ({ value: a.id, label: `${a.candidate.full_name}: ${Math.round(a.match_score)}%` }))}
          />
          {selectedMatch ? <MatchSummary result={selectedMatch} /> : <GlassEmptyState title="No candidates to analyze yet" />}
        </GlassCard>
      )}

      {tab === 'Shortlisted' && (
        <GlassCard>
          <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
            <GlassButton variant="secondary" onClick={() => downloadJobReport(jobId, job.title)}>Download report (CSV)</GlassButton>
          </div>
          {shortlisted.length === 0 ? (
            <GlassEmptyState title="No shortlisted candidates yet" subtitle="Shortlist a candidate from the Candidates tab." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {shortlisted.map((a) => (
                <GlassCandidateCard
                  key={a.id}
                  name={a.candidate.full_name}
                  score={a.match_score}
                  status={a.status}
                  actions={<GlassButton as={Link} to={`/candidates/${a.candidate.id}`} variant="secondary" size="sm">View</GlassButton>}
                />
              ))}
            </div>
          )}
        </GlassCard>
      )}
    </>
  )
}
