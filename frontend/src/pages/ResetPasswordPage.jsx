import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import GlassButton from '../components/glass/GlassButton.jsx'
import GlassInput from '../components/glass/GlassInput.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import { ArrowLeftIcon, CheckIcon, WarningIcon } from '../components/icons.jsx'
import { resetPassword } from '../utils/auth.js'
import { MIN_PASSWORD_LENGTH, validateNewPassword, validatePasswordConfirmation } from '../utils/validation.js'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const tokenFromLink = searchParams.get('token') || ''
  const [token, setToken] = useState(tokenFromLink)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!done) return undefined
    const t = setTimeout(() => navigate('/login'), 2500)
    return () => clearTimeout(t)
  }, [done, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const errors = {
      token: token.trim() ? null : 'Paste the reset token from your reset link.',
      password: validateNewPassword(password),
      confirmPassword: validatePasswordConfirmation(password, confirmPassword),
    }
    setFieldErrors(errors)
    if (Object.values(errors).some(Boolean)) return

    setLoading(true)
    try {
      await resetPassword(token.trim(), password)
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-panel">
      <div className="auth-heading">
        <h1>Choose a new password</h1>
        <p>You’ll use it the next time you sign in.</p>
      </div>

      {done ? (
        <div className="auth-form" aria-live="polite">
          <div className="form-alert is-success"><CheckIcon size={16} /><span>Password updated. Taking you to sign in…</span></div>
          <GlassButton as={Link} to="/login" variant="primary" size="lg" block>Sign in now</GlassButton>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {error && (
            <div className="form-alert is-error" role="alert"><WarningIcon size={16} /><span>{error}</span></div>
          )}
          {!tokenFromLink && (
            <GlassInput
              label="Reset token" autoComplete="off" spellCheck={false}
              value={token} onChange={(e) => { setToken(e.target.value); setFieldErrors((f) => ({ ...f, token: null })) }}
              error={fieldErrors.token}
            />
          )}
          <PasswordInput
            label="New password" autoComplete="new-password" maxLength={128}
            hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
            value={password} onChange={(e) => { setPassword(e.target.value); setFieldErrors((f) => ({ ...f, password: null })) }}
            error={fieldErrors.password}
          />
          <PasswordInput
            label="Confirm new password" autoComplete="new-password" maxLength={128}
            value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((f) => ({ ...f, confirmPassword: null })) }}
            error={fieldErrors.confirmPassword}
          />
          <GlassButton type="submit" variant="primary" size="lg" block loading={loading} loadingText="Updating…">
            Update password
          </GlassButton>
        </form>
      )}

      <p className="auth-switch">
        <Link to="/login" className="text-link with-icon"><ArrowLeftIcon size={14} />Back to sign in</Link>
      </p>
    </div>
  )
}
