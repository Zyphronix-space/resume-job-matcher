import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { changePassword, updateProfile } from '../utils/auth.js'

export default function SettingsPage() {
  const { user, updateUser } = useAuth()

  const [fullName, setFullName] = useState(user.full_name || '')
  const [phone, setPhone] = useState(user.phone || '')
  const [location, setLocation] = useState(user.location || '')
  const [headline, setHeadline] = useState(user.headline || '')
  const [linkedin, setLinkedin] = useState(user.links?.linkedin || '')
  const [github, setGithub] = useState(user.links?.github || '')
  const [portfolio, setPortfolio] = useState(user.links?.portfolio || '')
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState(null)

  const saveProfile = async (e) => {
    e.preventDefault()
    setProfileError(null)
    setProfileSaved(false)
    try {
      const updated = await updateProfile({
        full_name: fullName, phone, location, headline,
        links: { linkedin, github, portfolio },
      })
      updateUser(updated)
      setProfileSaved(true)
    } catch (err) {
      setProfileError(err.message)
    }
  }

  const savePassword = async (e) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSaved(false)
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match')
      return
    }
    try {
      await changePassword(currentPassword, newPassword)
      setPasswordSaved(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (err) {
      setPasswordError(err.message)
    }
  }

  return (
    <>
      <section className="hero">
        <h1 className="hero-title">Settings</h1>
        <p className="hero-subtitle">
          {user.role === 'candidate' ? 'Manage your account security.' : 'Manage your profile and account security.'}
        </p>
      </section>

      {user.role === 'recruiter' && (
      <div className="panel settings-section">
        <h2 className="panel-title">Profile</h2>
        <p className="panel-subtitle">Signed in as {user.email} ({user.role}).</p>
        <form onSubmit={saveProfile} className="form-grid cols-2" style={{ marginTop: '1rem' }}>
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
            <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder={user.role === 'recruiter' ? 'e.g. Talent Acquisition Lead' : 'e.g. Aspiring backend engineer'} />
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
            {profileError && <p className="field-error">{profileError}</p>}
            {profileSaved && <p className="form-success">Profile updated.</p>}
            <button type="submit" className="analyze-btn">Save profile</button>
          </div>
        </form>
      </div>
      )}

      <div className="panel settings-section">
        <h2 className="panel-title">Security</h2>
        <p className="panel-subtitle">Change your password.</p>
        <form onSubmit={savePassword} className="form-grid" style={{ marginTop: '1rem', maxWidth: 420 }}>
          <label className="find-field">
            <span>Current password</span>
            <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </label>
          <label className="find-field">
            <span>New password</span>
            <input type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </label>
          <label className="find-field">
            <span>Confirm new password</span>
            <input type="password" required minLength={8} value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
          </label>
          <div className="form-actions">
            {passwordError && <p className="field-error">{passwordError}</p>}
            {passwordSaved && <p className="form-success">Password changed.</p>}
            <button type="submit" className="analyze-btn">Change password</button>
          </div>
        </form>
      </div>
    </>
  )
}
