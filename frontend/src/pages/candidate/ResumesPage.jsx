import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import GlassCard from '../../components/glass/GlassCard.jsx'
import GlassButton from '../../components/glass/GlassButton.jsx'
import GlassBadge from '../../components/glass/GlassBadge.jsx'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
import { useToast } from '../../components/glass/GlassToast.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import UploadPanel from '../../components/UploadPanel.jsx'
import LoadingBlock from '../../components/LoadingBlock.jsx'
import { WarningIcon } from '../../components/icons.jsx'
import { skillLabel } from '../../utils/skillLabel.js'
import { deleteResume, downloadResume, listResumes, uploadResume, viewResume } from '../../utils/resumes.js'

export default function ResumesPage() {
  const [resumes, setResumes] = useState(null)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
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
      showToast('Resume uploaded. Your matches are updated.', 'success')
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (resume) => {
    if (!window.confirm(`Delete “${resume.filename}”? This can’t be undone.`)) return
    setDeletingId(resume.id)
    try {
      await deleteResume(resume.id)
      showToast('Resume deleted', 'info')
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Resumes"
        description="Your newest upload becomes the active resume. It’s the one used for your matches and new applications."
      />

      <div className="stack">
        <GlassCard title="Upload a resume">
          <UploadPanel file={file} onFileSelect={(f) => { setFile(f); setError(null) }} onFileRemove={() => setFile(null)} disabled={uploading} />
          {error && <p className="field-error" role="alert" style={{ marginTop: 'var(--space-3)' }}><WarningIcon size={15} />{error}</p>}
          <div className="upload-footer">
            <p className="form-hint">
              Recruiters can see your resume only for jobs you apply to. Read the{' '}
              <Link to="/privacy" className="text-link">Privacy Policy</Link>, and delete a resume here at any time.
            </p>
            <GlassButton variant="primary" disabled={!file} loading={uploading} loadingText="Reading your resume…" onClick={handleUpload}>
              Upload resume
            </GlassButton>
          </div>
        </GlassCard>

        {!resumes && !error && <LoadingBlock rows={2} label="Loading your resumes" />}

        {resumes && resumes.length === 0 && (
          <GlassEmptyState title="No resumes yet" subtitle="Your uploaded resumes will be listed here, newest first." />
        )}

        {resumes && resumes.length > 0 && (
          <section aria-labelledby="resume-history">
            <h2 id="resume-history" className="section-label">Uploaded resumes</h2>
            <ul className="resume-list">
              {resumes.map((r) => (
                <li key={r.id} className={`resume-item ${r.is_active ? 'is-active' : ''}`}>
                  <div className="resume-item-main">
                    <div className="resume-item-title">
                      <span className="resume-item-name" title={r.filename}>{r.filename}</span>
                      {r.is_active && <GlassBadge variant="success">Active</GlassBadge>}
                    </div>
                    <p className="resume-item-meta">
                      Version {r.version}, uploaded {new Date(r.uploaded_at).toLocaleDateString()}. Structure score {r.resume_structure_score}/100.
                    </p>
                    {r.cv_skills.length > 0 && (
                      <ul className="tag-list" aria-label="Detected skills">
                        {r.cv_skills.slice(0, 10).map((s) => <li key={s} className="tag">{skillLabel(s)}</li>)}
                        {r.cv_skills.length > 10 && <li className="tag is-more">+{r.cv_skills.length - 10} more</li>}
                      </ul>
                    )}
                  </div>
                  <div className="resume-item-actions">
                    <GlassButton variant="secondary" size="sm" onClick={() => viewResume(r.id)}>View</GlassButton>
                    <GlassButton variant="secondary" size="sm" onClick={() => downloadResume(r.id, r.filename)}>Download</GlassButton>
                    <GlassButton variant="danger" size="sm" loading={deletingId === r.id} onClick={() => handleDelete(r)}>Delete</GlassButton>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  )
}
