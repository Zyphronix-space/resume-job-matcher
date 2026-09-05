import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import EmptyState from '../../components/EmptyState.jsx'
import MatchSummary from '../../components/MatchSummary.jsx'
import { addApplicationNote, changeApplicationStatus } from '../../utils/applications.js'
import { getCandidateDetail } from '../../utils/candidates.js'
import { downloadResume, getResumeSections, viewResume } from '../../utils/resumes.js'

const RELEVANT_SECTIONS = ['Work Experience', 'Education', 'Professional Summary', 'Skills']

function ApplicationCard({ app, onReload }) {
  const [noteBody, setNoteBody] = useState('')
  const [saving, setSaving] = useState(false)

  const setStatus = async (status) => {
    await changeApplicationStatus(app.id, status)
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
    <div className="panel" style={{ marginBottom: '1.2rem' }}>
      <div className="form-actions" style={{ justifyContent: 'space-between' }}>
        <div>
          <h2 className="panel-title">
            <Link to={`/jobs/${app.job.id}`}>{app.job.title}</Link>
          </h2>
          <span className={`status-pill status-${app.status.toLowerCase()}`}>{app.status}</span>
        </div>
        <div className="data-table-actions">
          <button type="button" className="new-analysis-btn" onClick={() => setStatus('Shortlisted')}>Shortlist</button>
          <button type="button" className="file-card-remove" onClick={() => setStatus('Rejected')}>Reject</button>
          <Link className="new-analysis-btn" to={`/jobs/${app.job.id}?tab=Candidates`}>Compare</Link>
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
          style={{ flex: 1, minWidth: 200, padding: '0.6rem 0.8rem', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text)' }}
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
          placeholder="Add a note about this candidate…"
        />
        <button type="submit" className="analyze-btn" disabled={saving}>Add note</button>
      </form>
    </div>
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

      <div className="panel" style={{ marginBottom: '1.2rem' }}>
        <h2 className="panel-title">Resumes</h2>
        <div className="resume-list">
          {resumes.map((r) => (
            <div key={r.id} className={`resume-item ${r.is_active ? 'is-active' : ''}`}>
              <span>{r.filename} {r.is_active && <span className="status-pill">Active</span>} — v{r.version}</span>
              <div className="resume-item-actions">
                <button type="button" className="new-analysis-btn" onClick={() => viewResume(r.id)}>View</button>
                <button type="button" className="new-analysis-btn" onClick={() => downloadResume(r.id, r.filename)}>Download</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {sections && (
        <div className="panel" style={{ marginBottom: '1.2rem' }}>
          <h2 className="panel-title">Resume sections</h2>
          <p className="panel-subtitle">Extracted directly from the active resume's PDF text.</p>
          {RELEVANT_SECTIONS.filter((s) => sections[s]).map((s) => (
            <div key={s} style={{ marginTop: '0.9rem' }}>
              <h3 className="roadmap-subheading">{s}</h3>
              <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{sections[s]}</p>
            </div>
          ))}
        </div>
      )}

      <h2 className="panel-title" style={{ margin: '1.2rem 0 0.8rem' }}>Applications</h2>
      {applications.length === 0 ? (
        <EmptyState title="No applications to your jobs" />
      ) : (
        applications.map((app) => <ApplicationCard key={app.id} app={app} onReload={load} />)
      )}
    </>
  )
}
