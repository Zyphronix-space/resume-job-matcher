import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import GlassCard from '../../components/glass/GlassCard.jsx'
import GlassButton from '../../components/glass/GlassButton.jsx'
import GlassBadge from '../../components/glass/GlassBadge.jsx'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
import { useToast } from '../../components/glass/GlassToast.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import LoadingBlock from '../../components/LoadingBlock.jsx'
import MatchSummary from '../../components/MatchSummary.jsx'
import { WarningIcon } from '../../components/icons.jsx'
import { addApplicationNote, changeApplicationStatus } from '../../utils/applications.js'
import { getCandidateDetail } from '../../utils/candidates.js'
import { downloadResume, getResumeSections, viewResume } from '../../utils/resumes.js'

const RELEVANT_SECTIONS = ['Professional Summary', 'Work Experience', 'Education', 'Skills']

function ApplicationCard({ app, onReload }) {
  const [noteBody, setNoteBody] = useState('')
  const [saving, setSaving] = useState(false)
  const showToast = useToast()

  const setStatus = async (status) => {
    try {
      await changeApplicationStatus(app.id, status)
      showToast(`Moved to ${status}`, 'success')
      onReload()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const addNote = async (e) => {
    e.preventDefault()
    if (!noteBody.trim()) return
    setSaving(true)
    try {
      await addApplicationNote(app.id, noteBody.trim())
      setNoteBody('')
      onReload()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <GlassCard
      title={<Link to={`/jobs/${app.job.id}`}>{app.job.title}</Link>}
      subtitle={<GlassBadge status={app.status} />}
      actions={(
        <div className="data-table-actions">
          {app.status !== 'Shortlisted' && <GlassButton variant="secondary" size="sm" onClick={() => setStatus('Shortlisted')}>Shortlist</GlassButton>}
          {app.status !== 'Rejected' && <GlassButton variant="danger" size="sm" onClick={() => setStatus('Rejected')}>Reject</GlassButton>}
          <GlassButton as={Link} to={`/jobs/${app.job.id}?tab=Candidates`} variant="ghost" size="sm">Compare with others</GlassButton>
        </div>
      )}
    >
      <MatchSummary result={app} />

      <section className="notes" aria-labelledby={`notes-${app.id}`}>
        <h3 className="subheading" id={`notes-${app.id}`}>Notes</h3>
        {app.notes.length > 0 ? (
          <ul className="note-list">
            {app.notes.map((n) => (
              <li className="note-item" key={n.id}>
                <div className="note-item-meta">{n.author_name}, {new Date(n.created_at).toLocaleString()}</div>
                <p>{n.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="skill-empty">No notes yet.</p>
        )}
        <form onSubmit={addNote} className="note-form">
          <label className="visually-hidden" htmlFor={`note-${app.id}`}>Add a note</label>
          <input
            id={`note-${app.id}`}
            className="glass-field-control"
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Add a note about this application"
          />
          <GlassButton type="submit" variant="secondary" disabled={!noteBody.trim()} loading={saving}>Add note</GlassButton>
        </form>
      </section>
    </GlassCard>
  )
}

export default function CandidateDetailPage() {
  const { candidateId } = useParams()
  const [detail, setDetail] = useState(null)
  const [sections, setSections] = useState(null)
  const [error, setError] = useState(null)

  const load = () =>
    getCandidateDetail(candidateId).then((d) => {
      setDetail(d)
      const activeResume = d.resumes.find((r) => r.is_active) || d.resumes[0]
      if (activeResume) getResumeSections(activeResume.id).then(setSections).catch(() => setSections(null))
    }).catch((err) => setError(err.message))

  useEffect(() => { load() }, [candidateId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <p className="field-error" role="alert"><WarningIcon size={15} />{error}</p>
  if (!detail) return <LoadingBlock rows={4} label="Loading candidate" />

  const { candidate, resumes, applications } = detail
  const contact = [candidate.email, candidate.phone, candidate.location].filter(Boolean)
  const shownSections = sections ? RELEVANT_SECTIONS.filter((s) => sections[s]) : []

  return (
    <>
      <p className="breadcrumb"><Link to="/candidates" className="text-link">Candidates</Link></p>
      <PageHeader
        title={candidate.full_name}
        meta={contact.map((c) => <span key={c} className="cell-wrap">{c}</span>)}
        description={candidate.headline}
      />

      <div className="detail-grid is-wide-left">
        <div className="stack">
          <h2 className="section-label">Applications to your jobs</h2>
          {applications.length === 0 ? (
            <GlassEmptyState title="No applications to your jobs" />
          ) : (
            applications.map((app) => <ApplicationCard key={app.id} app={app} onReload={load} />)
          )}
        </div>

        <div className="stack">
          <GlassCard title="Resumes">
            <ul className="row-list">
              {resumes.map((r) => (
                <li key={r.id} className="row-list-item is-stacked">
                  <div className="row-list-main">
                    <span className="row-list-title" title={r.filename}>{r.filename}</span>
                    <span className="row-list-meta">Version {r.version}{r.is_active && ', active'}</span>
                  </div>
                  <div className="data-table-actions">
                    <GlassButton variant="secondary" size="sm" onClick={() => viewResume(r.id)}>View</GlassButton>
                    <GlassButton variant="ghost" size="sm" onClick={() => downloadResume(r.id, r.filename)}>Download</GlassButton>
                  </div>
                </li>
              ))}
            </ul>
          </GlassCard>

          {shownSections.length > 0 && (
            <GlassCard title="From the resume" subtitle="Text extracted from the active resume, as written by the candidate.">
              {shownSections.map((s) => (
                <div key={s} className="resume-section">
                  <h3 className="subheading">{s}</h3>
                  <p className="resume-section-text">{sections[s]}</p>
                </div>
              ))}
            </GlassCard>
          )}
        </div>
      </div>
    </>
  )
}
