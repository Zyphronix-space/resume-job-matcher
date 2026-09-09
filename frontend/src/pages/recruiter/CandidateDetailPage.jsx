import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import GlassCard from '../../components/glass/GlassCard.jsx'
import GlassButton from '../../components/glass/GlassButton.jsx'
import GlassBadge from '../../components/glass/GlassBadge.jsx'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
import { useToast } from '../../components/glass/GlassToast.jsx'
import MatchSummary from '../../components/MatchSummary.jsx'
import { addApplicationNote, changeApplicationStatus } from '../../utils/applications.js'
import { getCandidateDetail } from '../../utils/candidates.js'
import { downloadResume, getResumeSections, viewResume } from '../../utils/resumes.js'

const RELEVANT_SECTIONS = ['Work Experience', 'Education', 'Professional Summary', 'Skills']

function ApplicationCard({ app, onReload }) {
  const [noteBody, setNoteBody] = useState('')
  const [saving, setSaving] = useState(false)
  const showToast = useToast()

  const setStatus = async (status) => {
    await changeApplicationStatus(app.id, status)
    showToast(`Status updated to ${status}`, 'success')
    onReload()
  }

  const addNote = async (e) => {
    e.preventDefault()
    if (!noteBody.trim()) return
    setSaving(true)
    try {
      await addApplicationNote(app.id, noteBody.trim())
      setNoteBody('')
      onReload()
    } finally {
      setSaving(false)
    }
  }

  return (
    <GlassCard style={{ marginBottom: '1.2rem' }}>
      <div className="form-actions" style={{ justifyContent: 'space-between' }}>
        <div>
          <h2 className="glass-card-title">
            <Link to={`/jobs/${app.job.id}`}>{app.job.title}</Link>
          </h2>
          <GlassBadge status={app.status} />
        </div>
        <div className="data-table-actions">
          <GlassButton variant="secondary" size="sm" onClick={() => setStatus('Shortlisted')}>Shortlist</GlassButton>
          <GlassButton variant="danger" size="sm" onClick={() => setStatus('Rejected')}>Reject</GlassButton>
          <GlassButton as={Link} to={`/jobs/${app.job.id}?tab=Candidates`} variant="secondary" size="sm">Compare</GlassButton>
        </div>
      </div>

      <MatchSummary result={app} />

      <h3 className="roadmap-subheading" style={{ marginTop: '1.2rem' }}>Recruiter notes</h3>
      {app.notes.length > 0 && (
        <ul className="note-list">
          {app.notes.map((n) => (
            <li className="note-item" key={n.id}>
              <div className="note-item-meta">{n.author_name} · {new Date(n.created_at).toLocaleString()}</div>
              {n.body}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={addNote} className="form-actions">
        <input
          className="glass-field-control"
          style={{ flex: 1, minWidth: 200 }}
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
          placeholder="Add a note about this candidate…"
        />
        <GlassButton type="submit" variant="primary" disabled={saving}>Add note</GlassButton>
      </form>
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

  if (error) return <p className="field-error">{error}</p>
  if (!detail) return null

  const { candidate, resumes, applications } = detail

  return (
    <>
      <section className="hero" style={{ padding: '1.2rem 0' }}>
        <h1 className="hero-title" style={{ fontSize: '2rem' }}>{candidate.full_name}</h1>
        <p className="hero-subtitle">{candidate.email} {candidate.phone && `· ${candidate.phone}`} {candidate.location && `· ${candidate.location}`}</p>
      </section>

      <GlassCard title="Resumes" style={{ marginBottom: '1.2rem' }}>
        <div className="resume-list">
          {resumes.map((r) => (
            <div key={r.id} className={`resume-item ${r.is_active ? 'is-active' : ''}`}>
              <span>{r.filename} {r.is_active && <GlassBadge variant="success">Active</GlassBadge>} (v{r.version})</span>
              <div className="resume-item-actions">
                <GlassButton variant="secondary" size="sm" onClick={() => viewResume(r.id)}>View</GlassButton>
                <GlassButton variant="secondary" size="sm" onClick={() => downloadResume(r.id, r.filename)}>Download</GlassButton>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {sections && (
        <GlassCard title="Resume sections" subtitle="Extracted directly from the active resume's PDF text." style={{ marginBottom: '1.2rem' }}>
          {RELEVANT_SECTIONS.filter((s) => sections[s]).map((s) => (
            <div key={s} style={{ marginTop: '0.9rem' }}>
              <h3 className="roadmap-subheading">{s}</h3>
              <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{sections[s]}</p>
            </div>
          ))}
        </GlassCard>
      )}

      <h2 className="glass-card-title" style={{ margin: '1.2rem 0 0.8rem' }}>Applications</h2>
      {applications.length === 0 ? (
        <GlassEmptyState title="No applications to your jobs" />
      ) : (
        applications.map((app) => <ApplicationCard key={app.id} app={app} onReload={load} />)
      )}
    </>
  )
}
