import { useEffect, useState } from 'react'
import EmptyState from '../../components/EmptyState.jsx'
import UploadPanel from '../../components/UploadPanel.jsx'
import { skillLabel } from '../../utils/skillLabel.js'
import { deleteResume, downloadResume, listResumes, uploadResume, viewResume } from '../../utils/resumes.js'

export default function ResumesPage() {
  const [resumes, setResumes] = useState(null)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const load = () => listResumes().then(setResumes).catch((err) => setError(err.message))
  useEffect(() => { load() }, [])

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      await uploadResume(file)
      setFile(null)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resume?')) return
    await deleteResume(id)
    load()
  }

  return (
    <>
      <section className="hero">
        <h1 className="hero-title">Resumes</h1>
        <p className="hero-subtitle">Upload a resume to apply to jobs and see your match scores. Your most recent upload becomes the active resume used for new applications.</p>
      </section>

      <div className="panel" style={{ marginBottom: '1.2rem' }}>
        <UploadPanel file={file} onFileSelect={setFile} onFileRemove={() => setFile(null)} disabled={uploading} />
        {error && <p className="field-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="analyze-btn" disabled={!file || uploading} onClick={handleUpload}>
            {uploading ? 'Uploading…' : 'Upload resume'}
          </button>
        </div>
      </div>

      {resumes && resumes.length === 0 && (
        <EmptyState title="No resumes yet" subtitle="Upload a PDF resume above to get started." />
      )}

      {resumes && resumes.length > 0 && (
        <div className="resume-list">
          {resumes.map((r) => (
            <div key={r.id} className={`panel resume-item ${r.is_active ? 'is-active' : ''}`}>
              <div>
                <strong>{r.filename}</strong> {r.is_active && <span className="status-pill">Active</span>}
                <div className="form-hint">v{r.version} · uploaded {new Date(r.uploaded_at).toLocaleDateString()} · structure score {r.resume_structure_score}/100</div>
                <div className="chip-input-row">
                  {r.cv_skills.slice(0, 8).map((s) => <span key={s} className="skill-pill skill-pill-matched">{skillLabel(s)}</span>)}
                </div>
              </div>
              <div className="resume-item-actions">
                <button type="button" className="new-analysis-btn" onClick={() => viewResume(r.id)}>View</button>
                <button type="button" className="new-analysis-btn" onClick={() => downloadResume(r.id, r.filename)}>Download</button>
                <button type="button" className="file-card-remove" onClick={() => handleDelete(r.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
