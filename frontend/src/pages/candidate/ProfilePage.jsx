import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { updateProfile } from '../../utils/auth.js'
import { skillLabel } from '../../utils/skillLabel.js'
import { listResumes } from '../../utils/resumes.js'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const [fullName, setFullName] = useState(user.full_name || '')
  const [phone, setPhone] = useState(user.phone || '')
  const [location, setLocation] = useState(user.location || '')
  const [headline, setHeadline] = useState(user.headline || '')
  const [linkedin, setLinkedin] = useState(user.links?.linkedin || '')
  const [github, setGithub] = useState(user.links?.github || '')
  const [portfolio, setPortfolio] = useState(user.links?.portfolio || '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [activeResume, setActiveResume] = useState(null)

  useEffect(() => {
    listResumes().then((resumes) => setActiveResume(resumes.find((r) => r.is_active) || null)).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaved(false)
    try {
      const updated = await updateProfile({
        full_name: fullName, phone, location, headline,
        links: { linkedin, github, portfolio },
      })
      updateUser(updated)
      setSaved(true)
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

      <div className="panel" style={{ marginBottom: '1.2rem' }}>
        <h2 className="panel-title">Profile details</h2>
        <form onSubmit={handleSubmit} className="form-grid cols-2" style={{ marginTop: '1rem' }}>
          <label className="find-field">
            <span>Full name</span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>
          <label className="find-field">
            <span>Phone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="find-field">
            <span>Location</span>
            <input value={location} onChange={(e) => setLocation(e.target.value)} />
          </label>
          <label className="find-field">
            <span>Headline</span>
            <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Aspiring backend engineer" />
          </label>
          <label className="find-field">
            <span>LinkedIn</span>
            <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/…" />
          </label>
          <label className="find-field">
            <span>GitHub</span>
            <input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/…" />
          </label>
          <label className="find-field">
            <span>Portfolio</span>
            <input value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="https://…" />
          </label>

          <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
            {error && <p className="field-error">{error}</p>}
            {saved && <p className="form-success">Profile updated.</p>}
            <button type="submit" className="analyze-btn">Save profile</button>
          </div>
        </form>
      </div>

      <div className="panel">
        <h2 className="panel-title">Skills</h2>
        <p className="panel-subtitle">Detected from your active resume — upload a new one on the Resumes page to update this.</p>
        <div className="chip-input-row" style={{ marginTop: '0.6rem' }}>
          {activeResume?.cv_skills?.length ? (
            activeResume.cv_skills.map((s) => <span key={s} className="skill-pill skill-pill-matched">{skillLabel(s)}</span>)
          ) : (
            <p className="skill-empty">No active resume yet.</p>
          )}
        </div>
      </div>
    </>
  )
}
