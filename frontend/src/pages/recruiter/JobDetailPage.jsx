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
import GlassModal from '../../components/glass/GlassModal.jsx'
import { useToast } from '../../components/glass/GlassToast.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import LoadingBlock from '../../components/LoadingBlock.jsx'
import JobForm from '../../components/JobForm.jsx'
import MatchSummary from '../../components/MatchSummary.jsx'
import { WarningIcon } from '../../components/icons.jsx'
import { skillLabel } from '../../utils/skillLabel.js'
import { changeApplicationStatus, compareApplications, rankCandidatesForJob } from '../../utils/applications.js'
import { deleteJob, getJob, updateJob } from '../../utils/jobs.js'
import { downloadComparisonCsv, downloadJobReport } from '../../utils/analytics.js'

const TABS = ['Overview', 'Candidates', 'Match breakdown', 'Shortlisted']
const STATUSES = ['Applied', 'Screening', 'Interview', 'Offer', 'Shortlisted', 'Rejected']

function CandidateRow({ app, onStatusChange, selected, onToggleSelect }) {
  return (
    <div className="selectable-row">
      <GlassCheckbox checked={selected} onChange={() => onToggleSelect(app.id)} aria-label={`Select ${app.candidate.full_name} to compare`} />
      <GlassCandidateCard
        name={app.candidate.full_name}
        meta={`${app.matched_skills.length} skills found, ${app.missing_skills.length} missing`}
        score={app.match_score}
        actions={(
          <>
            <GlassSelect
              className="status-select-glass" value={app.status} onChange={(status) => onStatusChange(app.id, status)}
              options={STATUSES.map((s) => ({ value: s, label: s }))}
              ariaLabel={`Status for ${app.candidate.full_name}`}
            />
            <GlassButton as={Link} to={`/candidates/${app.candidate.id}`} variant="secondary" size="sm">Profile</GlassButton>
            {app.status !== 'Shortlisted' && (
              <GlassButton variant="secondary" size="sm" onClick={() => onStatusChange(app.id, 'Shortlisted')}>Shortlist</GlassButton>
            )}
            {app.status !== 'Rejected' && (
              <GlassButton variant="danger" size="sm" onClick={() => onStatusChange(app.id, 'Rejected')}>Reject</GlassButton>
            )}
          </>
        )}
      />
    </div>
  )
}

function SkillTags({ skills }) {
  if (!skills.length) return <p className="skill-empty">None specified</p>
  return (
    <ul className="tag-list">
      {skills.map((s) => <li key={s} className="tag">{skillLabel(s)}</li>)}
    </ul>
  )
}

export default function JobDetailPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const showToast = useToast()
  const [job, setJob] = useState(null)
  const [candidates, setCandidates] = useState(null)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)

  const requestedTab = searchParams.get('tab')
  const tab = TABS.includes(requestedTab) ? requestedTab : 'Overview'
  const setTab = (t) => setSearchParams(t === 'Overview' ? {} : { tab: t }, { replace: true })

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

  useEffect(() => { loadJob() }, [jobId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadCandidates() }, [jobId, sort, minScore, skillFilter, statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = async (id, status) => {
    try {
      await changeApplicationStatus(id, status)
      showToast(`Moved to ${status}`, 'success')
      loadCandidates()
    } catch (err) {
      showToast(err.message, 'error')
    }
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
    try {
      setCompareResults(await compareApplications([...selected]))
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleUpdate = async (payload) => {
    const updated = await updateJob(jobId, payload)
    setJob(updated)
    setEditing(false)
    showToast('Job saved', 'success')
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete “${job.title}”? Its applications are deleted too. This can’t be undone.`)) return
    try {
      await deleteJob(jobId)
      showToast(`“${job.title}” deleted`, 'info')
      navigate('/jobs')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const shortlisted = useMemo(() => (candidates || []).filter((c) => c.status === 'Shortlisted'), [candidates])
  const selectedMatch = (candidates || []).find((c) => c.id === selectedMatchId) || null
  const filtersActive = Boolean(minScore || skillFilter || statusFilter)

  if (error && !job) {
    return <p className="field-error" role="alert"><WarningIcon size={15} />{error}</p>
  }
  if (!job) return <LoadingBlock rows={4} label="Loading job" />

  return (
    <>
      <p className="breadcrumb"><Link to="/jobs" className="text-link">Jobs</Link></p>
      <PageHeader
        title={job.title}
        meta={(
          <>
            <GlassBadge status={job.status} />
            <span>{job.location || 'Location not set'}</span>
            <span>{job.employment_type}</span>
          </>
        )}
        actions={(
          <>
            <GlassButton variant="secondary" onClick={() => setEditing(true)}>Edit job</GlassButton>
            <GlassButton variant="danger" onClick={handleDelete}>Delete</GlassButton>
          </>
        )}
      />

      {editing && (
        <GlassModal title="Edit job" onClose={() => setEditing(false)} width={720}>
          <JobForm initial={job} onSubmit={handleUpdate} onCancel={() => setEditing(false)} submitLabel="Save changes" />
        </GlassModal>
      )}

      <div className="tabs" role="tablist" aria-label="Job sections">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            className={`tab-btn ${tab === t ? 'is-active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
            {t === 'Candidates' && candidates && <span className="tab-count num">{candidates.length}</span>}
            {t === 'Shortlisted' && candidates && <span className="tab-count num">{shortlisted.length}</span>}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'Overview' && (
          <div className="detail-grid">
            <GlassCard title="Description">
              <p className="prose-text">{job.description || 'No description yet. Add one so applicants can be scored against it.'}</p>
            </GlassCard>
            <GlassCard title="Requirements">
              <dl className="facts">
                <div><dt>Experience</dt><dd>{job.experience || 'Not specified'}</dd></div>
                <div><dt>Education</dt><dd>{job.education || 'Not specified'}</dd></div>
              </dl>
              <h3 className="subheading">Required skills</h3>
              <SkillTags skills={job.required_skills} />
              <h3 className="subheading">Preferred skills</h3>
              <SkillTags skills={job.preferred_skills} />
            </GlassCard>
          </div>
        )}

        {tab === 'Candidates' && (
          <div className="stack">
            <div className="filter-bar">
              <GlassInput label="Minimum score" type="number" inputMode="numeric" min="0" max="100" value={minScore} onChange={(e) => setMinScore(e.target.value)} placeholder="0" />
              <GlassInput label="Has skill" value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} placeholder="e.g. python" />
              <GlassSelect
                label="Status" value={statusFilter} onChange={setStatusFilter} placeholder="Any status"
                options={[{ value: '', label: 'Any status' }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
              />
              <GlassSelect
                label="Sort by" value={sort} onChange={setSort}
                options={[
                  { value: 'best_match', label: 'Best match' },
                  { value: 'newest', label: 'Newest' },
                  { value: 'experience', label: 'Most skills found' },
                ]}
              />
            </div>

            {selected.size > 0 && (
              <div className="selection-bar" role="status">
                <span>{selected.size} selected{selected.size < 2 && '. Select one more to compare'}</span>
                <div className="button-row">
                  <GlassButton variant="ghost" size="sm" onClick={() => { setSelected(new Set()); setCompareResults(null) }}>Clear</GlassButton>
                  <GlassButton variant="primary" size="sm" disabled={selected.size < 2} onClick={runCompare}>Compare {selected.size}</GlassButton>
                </div>
              </div>
            )}

            {compareResults && (
              <GlassCard
                title="Comparison"
                actions={<GlassButton variant="secondary" size="sm" onClick={() => downloadComparisonCsv(compareResults)}>Download CSV</GlassButton>}
              >
                <div className="glass-table-wrap">
                  <table className="glass-table">
                    <thead><tr><th>Candidate</th><th>Match</th><th>Skills found</th><th>Missing</th><th>Status</th></tr></thead>
                    <tbody>
                      {compareResults.map((a) => (
                        <tr key={a.id}>
                          <td className="cell-strong">{a.candidate.full_name}</td>
                          <td className="num">{Math.round(a.match_score)}</td>
                          <td className="num">{a.matched_skills.length}</td>
                          <td className="num">{a.missing_skills.length}</td>
                          <td><GlassBadge status={a.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            )}

            {!candidates && <LoadingBlock rows={3} label="Ranking applicants" />}
            {candidates && candidates.length === 0 && (
              filtersActive
                ? <GlassEmptyState title="No applicants match these filters" subtitle="Lower the minimum score or clear the skill and status filters." />
                : <GlassEmptyState title="No applicants yet" subtitle="Candidates who apply to this job are scored and listed here, best match first." />
            )}
            {candidates && candidates.length > 0 && (
              <div className="candidate-stack">
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
          </div>
        )}

        {tab === 'Match breakdown' && (
          <GlassCard>
            {candidates && candidates.length > 0 ? (
              <>
                <GlassSelect
                  label="Applicant" className="candidate-picker" value={selectedMatchId || ''} onChange={setSelectedMatchId}
                  options={candidates.map((a) => ({ value: a.id, label: `${a.candidate.full_name} (${Math.round(a.match_score)})` }))}
                />
                {selectedMatch && <MatchSummary result={selectedMatch} />}
              </>
            ) : (
              <GlassEmptyState title="Nothing to break down yet" subtitle="Once someone applies, you can see how their resume compares with this job, skill by skill." />
            )}
          </GlassCard>
        )}

        {tab === 'Shortlisted' && (
          <div className="stack">
            <div className="button-row is-end">
              <GlassButton variant="secondary" onClick={() => downloadJobReport(jobId, job.title)}>Download job report (CSV)</GlassButton>
            </div>
            {shortlisted.length === 0 ? (
              <GlassEmptyState title="No one shortlisted for this job" subtitle="Choose Shortlist on the Candidates tab to move someone forward." />
            ) : (
              <div className="candidate-stack">
                {shortlisted.map((a) => (
                  <GlassCandidateCard
                    key={a.id}
                    name={a.candidate.full_name}
                    score={a.match_score}
                    actions={<GlassButton as={Link} to={`/candidates/${a.candidate.id}`} variant="secondary" size="sm">Profile</GlassButton>}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
