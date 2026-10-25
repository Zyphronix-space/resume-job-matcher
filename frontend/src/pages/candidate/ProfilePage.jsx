import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import GlassCard from '../../components/glass/GlassCard.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import ProfileForm from '../../components/ProfileForm.jsx'
import { skillLabel } from '../../utils/skillLabel.js'
import { listResumes } from '../../utils/resumes.js'

export default function ProfilePage() {
  const [activeResume, setActiveResume] = useState(undefined)

  useEffect(() => {
    listResumes().then((resumes) => setActiveResume(resumes.find((r) => r.is_active) || null)).catch(() => setActiveResume(null))
  }, [])

  return (
    <>
      <PageHeader title="Profile" description="Recruiters see these details next to your applications." />

      <div className="stack">
        <GlassCard title="Details">
          <ProfileForm headlinePlaceholder="e.g. Final-year CS student, backend focus" />
        </GlassCard>

        <GlassCard
          title="Skills"
          subtitle={activeResume ? `Detected in ${activeResume.filename}. Upload a new resume to update them.` : 'Detected from your active resume.'}
        >
          {activeResume === undefined ? null : activeResume?.cv_skills?.length ? (
            <ul className="tag-list">
              {activeResume.cv_skills.map((s) => <li key={s} className="tag">{skillLabel(s)}</li>)}
            </ul>
          ) : (
            <p className="skill-empty">
              No skills yet. <Link to="/resumes" className="text-link">Upload a resume</Link> to detect them.
            </p>
          )}
        </GlassCard>
      </div>
    </>
  )
}
