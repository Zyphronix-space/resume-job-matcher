import { useState } from 'react'
import GlassCard from '../components/glass/GlassCard.jsx'
import GlassButton from '../components/glass/GlassButton.jsx'
import GlassInput from '../components/glass/GlassInput.jsx'
import { useToast } from '../components/glass/GlassToast.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { changePassword, updateProfile } from '../utils/auth.js'

export default function SettingsPage() {
  const { user, updateUser } = useAuth()
  const showToast = useToast()

  const [fullName, setFullName] = useState(user.full_name || '')
  const [phone, setPhone] = useState(user.phone || '')
  const [location, setLocation] = useState(user.location || '')
  const [headline, setHeadline] = useState(user.headline || '')
  const [linkedin, setLinkedin] = useState(user.links?.linkedin || '')
  const [github, setGithub] = useState(user.links?.github || '')
  const [portfolio, setPortfolio] = useState(user.links?.portfolio || '')
  const [profileError, setProfileError] = useState(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState(null)

  const saveProfile = async (e) => {
    e.preventDefault()
    setProfileError(null)
    try {
      const updated = await updateProfile({
        full_name: fullName, phone, location, headline,
        links: { linkedin, github, portfolio },
      })
      updateUser(updated)
      showToast('Profile updated', 'success')
    } catch (err) {
      setProfileError(err.message)
    }
  }

  const savePassword = async (e) => {
    e.preventDefault()
    setPasswordError(null)
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match')
      return
    }
    try {
      await changePassword(currentPassword, newPassword)
      showToast('Password changed', 'success')
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
        <GlassCard title="Profile" subtitle={`Signed in as ${user.email} (${user.role}).`} style={{ marginBottom: '1.2rem' }}>
          <form onSubmit={saveProfile} className="form-grid cols-2" style={{ marginTop: '1rem' }}>
            <GlassInput label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <GlassInput label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <GlassInput label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
            <GlassInput label="Headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Talent Acquisition Lead" />
            <GlassInput label="LinkedIn" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/…" />
            <GlassInput label="GitHub" value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/…" />
            <GlassInput label="Portfolio" value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="https://…" />

            <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
              {profileError && <p className="glass-field-error">{profileError}</p>}
              <GlassButton type="submit" variant="primary">Save profile</GlassButton>
            </div>
          </form>
        </GlassCard>
      )}

      <GlassCard title="Security" subtitle="Change your password.">
        <form onSubmit={savePassword} className="form-grid" style={{ marginTop: '1rem', maxWidth: 420 }}>
          <GlassInput label="Current password" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          <GlassInput label="New password" type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <GlassInput label="Confirm new password" type="password" required minLength={8} value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
          <div className="form-actions">
            {passwordError && <p className="glass-field-error">{passwordError}</p>}
            <GlassButton type="submit" variant="primary">Change password</GlassButton>
          </div>
        </form>
      </GlassCard>
    </>
  )
}
