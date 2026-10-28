import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import GlassButton from '../components/glass/GlassButton.jsx'
import GlassInput from '../components/glass/GlassInput.jsx'
import GlassCheckbox from '../components/glass/GlassCheckbox.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import { WarningIcon } from '../components/icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { MIN_PASSWORD_LENGTH, validateEmail, validateNewPassword, validatePasswordConfirmation } from '../utils/validation.js'

const ROLES = [
  { value: 'candidate', label: 'Candidate', hint: 'Find jobs, check your fit, prepare applications and track them.' },
  { value: 'recruiter', label: 'Recruiter', hint: 'Post jobs and review ranked applicants.' },
]

// "Continue with Google" is intentionally not rendered: no OAuth client is
// configured on the backend, so a Google button here would be a fake
// affordance rather than a working feature.
export default function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('candidate')
  const [agreed, setAgreed] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const clearError = (field) => setFieldErrors((f) => (f[field] ? { ...f, [field]: null } : f))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    const errors = {
      fullName: fullName.trim() ? null : 'Enter your full name.',
      email: validateEmail(email),
      password: validateNewPassword(password),
      confirmPassword: validatePasswordConfirmation(password, confirmPassword),
      agreed: agreed ? null : 'Agree to the Terms of Service and Privacy Policy to continue.',
    }
    setFieldErrors(errors)
    const firstInvalid = Object.keys(errors).find((k) => errors[k])
    if (firstInvalid) {
      document.querySelector(`[data-field="${firstInvalid}"]`)?.focus()
      return
    }

    setLoading(true)
    try {
      const user = await signup({ fullName: fullName.trim(), email: email.trim(), password, role })
      navigate(user.role === 'recruiter' ? '/dashboard' : '/candidate/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const activeRole = ROLES.find((r) => r.value === role)

  return (
    <div className="auth-panel">
      <div className="auth-heading">
        <h1>Create your account</h1>
        <p>Choose how you’ll use ResumeMatch. You can’t switch roles later.</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {error && (
          <div className="form-alert is-error" role="alert">
            <WarningIcon size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="glass-field">
          <fieldset className="segmented" aria-describedby="role-hint">
            <legend className="visually-hidden">Account type</legend>
            {ROLES.map((r) => (
              <label className="segmented-option" key={r.value}>
                <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} />
                <span>{r.label}</span>
              </label>
            ))}
          </fieldset>
          <span className="glass-field-hint" id="role-hint">{activeRole.hint}</span>
        </div>

        <GlassInput
          label="Full name" autoComplete="name" data-field="fullName"
          value={fullName} onChange={(e) => { setFullName(e.target.value); clearError('fullName') }}
          error={fieldErrors.fullName}
        />
        <GlassInput
          label="Email" type="email" autoComplete="email" inputMode="email" data-field="email"
          value={email} onChange={(e) => { setEmail(e.target.value); clearError('email') }}
          error={fieldErrors.email}
        />
        <PasswordInput
          label="Password" autoComplete="new-password" data-field="password" maxLength={128}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          value={password} onChange={(e) => { setPassword(e.target.value); clearError('password') }}
          error={fieldErrors.password}
        />
        <PasswordInput
          label="Confirm password" autoComplete="new-password" data-field="confirmPassword" maxLength={128}
          value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); clearError('confirmPassword') }}
          error={fieldErrors.confirmPassword}
        />

        <div className="glass-field">
          <GlassCheckbox
            checked={agreed}
            data-field="agreed"
            aria-invalid={fieldErrors.agreed ? true : undefined}
            aria-describedby={fieldErrors.agreed ? 'agreed-error' : undefined}
            onChange={(e) => { setAgreed(e.target.checked); clearError('agreed') }}
            label={(
              <>
                I agree to the{' '}
                <Link to="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>
              </>
            )}
          />
          {fieldErrors.agreed && (
            <span className="glass-field-error" id="agreed-error"><WarningIcon size={14} />{fieldErrors.agreed}</span>
          )}
        </div>

        <GlassButton type="submit" variant="primary" size="lg" block loading={loading} loadingText="Creating account…">
          Create account
        </GlassButton>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login" className="text-link">Sign in</Link>
      </p>
    </div>
  )
}
