import { useEffect, useState } from 'react'
import GlassCard from '../../components/glass/GlassCard.jsx'
import GlassButton from '../../components/glass/GlassButton.jsx'
import GlassInput from '../../components/glass/GlassInput.jsx'
import { useToast } from '../../components/glass/GlassToast.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { updateProfile } from '../../utils/auth.js'
import { skillLabel } from '../../utils/skillLabel.js'
import { listResumes } from '../../utils/resumes.js'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const showToast = useToast()
  const [fullName, setFullName] = useState(user.full_name || '')
  const [phone, setPhone] = useState(user.phone || '')
  const [location, setLocation] = useState(user.location || '')
  const [headline, setHeadline] = useState(user.headline || '')
  const [linkedin, setLinkedin] = useState(user.links?.linkedin || '')
  const [github, setGithub] = useState(user.links?.github || '')
  const [portfolio, setPortfolio] = useState(user.links?.portfolio || '')
  const [error, setError] = useState(null)
  const [activeResume, setActiveResume] = useState(null)

  useEffect(() => {
    listResumes().then((resumes) => setActiveResume(resumes.find((r) => r.is_active) || null)).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const updated = await updateProfile({
        full_name: fullName, phone, location, headline,
        links: { linkedin, github, portfolio },
      })
      updateUser(updated)
      showToast('Profile updated', 'success')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <section className="hero">
        <h1 className="hero-title">Your profile</h1>
        <p className="hero-subtitle">This is what recruiters see alongside your applications.</p>
      </section>

      <GlassCard title="Profile details" style={{ marginBottom: '1.2rem' }}>
        <form onSubmit={handleSubmit} className="form-grid cols-2" style={{ marginTop: '1rem' }}>
          <GlassInput label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <GlassInput label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <GlassInput label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
          <GlassInput label="Headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Aspiring backend engineer" />
          <GlassInput label="LinkedIn" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/…" />
          <GlassInput label="GitHub" value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/…" />
          <GlassInput label="Portfolio" value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="https://…" />

          <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
            {error && <p className="glass-field-error">{error}</p>}
            <GlassButton type="submit" variant="primary">Save profile</GlassButton>
          </div>
        </form>
      </GlassCard>

      <GlassCard title="Skills" subtitle="Detected from your active resume. Upload a new one on the Resumes page to update this.">
        <div className="chip-input-row" style={{ marginTop: '0.6rem' }}>
          {activeResume?.cv_skills?.length ? (
            activeResume.cv_skills.map((s) => <span key={s} className="skill-pill skill-pill-matched">{skillLabel(s)}</span>)
          ) : (
            <p className="skill-empty">No active resume yet.</p>
          )}
        </div>
      </GlassCard>
    </>
  )
}
