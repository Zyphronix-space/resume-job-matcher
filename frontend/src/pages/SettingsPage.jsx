import { useState } from 'react'
import GlassCard from '../components/glass/GlassCard.jsx'
import GlassButton from '../components/glass/GlassButton.jsx'
import { useToast } from '../components/glass/GlassToast.jsx'
import PageHeader from '../components/PageHeader.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import ProfileForm from '../components/ProfileForm.jsx'
import { WarningIcon } from '../components/icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { changePassword } from '../utils/auth.js'
import { MIN_PASSWORD_LENGTH, validateNewPassword, validatePasswordConfirmation } from '../utils/validation.js'

export default function SettingsPage() {
  const { user } = useAuth()
  const showToast = useToast()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [passwordError, setPasswordError] = useState(null)
  const [saving, setSaving] = useState(false)

  const savePassword = async (e) => {
    e.preventDefault()
    setPasswordError(null)
    const errors = {
      currentPassword: currentPassword ? null : 'Enter your current password.',
      newPassword: validateNewPassword(newPassword),
      confirmNewPassword: validatePasswordConfirmation(newPassword, confirmNewPassword),
    }
    setFieldErrors(errors)
    if (Object.values(errors).some(Boolean)) return

    setSaving(true)
    try {
      await changePassword(currentPassword, newPassword)
      showToast('Password changed', 'success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (err) {
      setPasswordError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader title="Settings" description={`Signed in as ${user.email}.`} />

      <div className="stack">
        {user.role === 'recruiter' && (
          <GlassCard title="Profile">
            <ProfileForm headlinePlaceholder="e.g. Talent Acquisition Lead" />
          </GlassCard>
        )}

        <GlassCard title="Password" subtitle="Change the password you use to sign in.">
          <form onSubmit={savePassword} className="form-grid narrow" noValidate>
            <PasswordInput
              label="Current password" autoComplete="current-password"
              value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              error={fieldErrors.currentPassword}
            />
            <PasswordInput
              label="New password" autoComplete="new-password" maxLength={128}
              hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              error={fieldErrors.newPassword}
            />
            <PasswordInput
              label="Confirm new password" autoComplete="new-password" maxLength={128}
              value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)}
              error={fieldErrors.confirmNewPassword}
            />
            <div className="form-actions">
              {passwordError && <p className="field-error" role="alert"><WarningIcon size={15} />{passwordError}</p>}
              <GlassButton type="submit" variant="primary" loading={saving} loadingText="Changing…">Change password</GlassButton>
            </div>
          </form>
        </GlassCard>
      </div>
    </>
  )
}
