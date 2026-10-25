import { useState } from 'react'
import { Link } from 'react-router-dom'
import GlassButton from '../components/glass/GlassButton.jsx'
import GlassInput from '../components/glass/GlassInput.jsx'
import { ArrowLeftIcon, CheckIcon, InfoIcon, WarningIcon } from '../components/icons.jsx'
import { forgotPassword } from '../utils/auth.js'
import { validateEmail } from '../utils/validation.js'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const invalid = validateEmail(email)
    setEmailError(invalid)
    if (invalid) return

    setLoading(true)
    try {
      setResult(await forgotPassword(email.trim()))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-panel">
      <div className="auth-heading">
        <h1>Reset your password</h1>
        <p>Enter the email you signed up with.</p>
      </div>

      {!result ? (
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {error && (
            <div className="form-alert is-error" role="alert"><WarningIcon size={16} /><span>{error}</span></div>
          )}
          <GlassInput
            label="Email" type="email" autoComplete="email" inputMode="email" autoFocus
            value={email} onChange={(e) => { setEmail(e.target.value); setEmailError(null) }}
            error={emailError}
          />
          <GlassButton type="submit" variant="primary" size="lg" block loading={loading} loadingText="Checking…">
            Continue
          </GlassButton>
        </form>
      ) : (
        <div className="auth-form" aria-live="polite">
          {result.reset_token ? (
            <>
              <div className="form-alert is-success"><CheckIcon size={16} /><span>{result.detail}</span></div>
              <div className="form-alert is-info">
                <InfoIcon size={16} />
                <span>
                  Local demo mode: there’s no email service, so the reset link is shown here instead of being emailed.
                </span>
              </div>
              <GlassButton as={Link} variant="primary" size="lg" block to={`/reset-password?token=${result.reset_token}`}>
                Continue to reset password
              </GlassButton>
            </>
          ) : (
            <div className="form-alert is-info"><InfoIcon size={16} /><span>{result.detail}</span></div>
          )}
        </div>
      )}

      <p className="auth-switch">
        <Link to="/login" className="text-link with-icon"><ArrowLeftIcon size={14} />Back to sign in</Link>
      </p>
    </div>
  )
}
