import { useEffect, useState } from 'react'
import GlassCard from '../../components/glass/GlassCard.jsx'
import GlassButton from '../../components/glass/GlassButton.jsx'
import GlassBadge from '../../components/glass/GlassBadge.jsx'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
import { useToast } from '../../components/glass/GlassToast.jsx'
import UploadPanel from '../../components/UploadPanel.jsx'
import { skillLabel } from '../../utils/skillLabel.js'
import { deleteResume, downloadResume, listResumes, uploadResume, viewResume } from '../../utils/resumes.js'

export default function ResumesPage() {
  const [resumes, setResumes] = useState(null)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const showToast = useToast()

  const load = () => listResumes().then(setResumes).catch((err) => setError(err.message))
  useEffect(() => { load() }, [])

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      await uploadResume(file)
      setFile(null)
      showToast('Resume uploaded and parsed', 'success')
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
    showToast('Resume deleted', 'info')
    load()
  }

  return (
    <>
      <section className="hero">
        <h1 className="hero-title">Resumes</h1>
        <p className="hero-subtitle">Upload a resume to apply to jobs and see your match scores. Your most recent upload becomes the active resume used for new applications.</p>
      </section>

      <GlassCard style={{ marginBottom: '1.2rem' }}>
        <UploadPanel file={file} onFileSelect={setFile} onFileRemove={() => setFile(null)} disabled={uploading} />
        {error && <p className="field-error">{error}</p>}
        <div className="form-actions">
          <GlassButton variant="primary" disabled={!file || uploading} onClick={handleUpload}>
            {uploading ? 'Uploading…' : 'Upload resume'}
          </GlassButton>
        </div>
      </GlassCard>

      {resumes && resumes.length === 0 && (
        <GlassEmptyState title="No resumes yet" subtitle="Upload a PDF resume above to get started." />
      )}

      {resumes && resumes.length > 0 && (
        <div className="resume-list">
          {resumes.map((r) => (
            <GlassCard key={r.id} className={r.is_active ? 'is-active' : ''}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <strong>{r.filename}</strong> {r.is_active && <GlassBadge variant="success">Active</GlassBadge>}
                  <div className="form-hint">v{r.version} · uploaded {new Date(r.uploaded_at).toLocaleDateString()} · structure score {r.resume_structure_score}/100</div>
                  <div className="chip-input-row">
                    {r.cv_skills.slice(0, 8).map((s) => <span key={s} className="skill-pill skill-pill-matched">{skillLabel(s)}</span>)}
                  </div>
                </div>
                <div className="resume-item-actions">
                  <GlassButton variant="secondary" size="sm" onClick={() => viewResume(r.id)}>View</GlassButton>
                  <GlassButton variant="secondary" size="sm" onClick={() => downloadResume(r.id, r.filename)}>Download</GlassButton>
                  <GlassButton variant="danger" size="sm" onClick={() => handleDelete(r.id)}>Delete</GlassButton>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </>
  )
}
