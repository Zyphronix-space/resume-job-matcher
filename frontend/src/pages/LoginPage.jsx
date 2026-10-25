import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import GlassButton from '../components/glass/GlassButton.jsx'
import GlassInput from '../components/glass/GlassInput.jsx'
import GlassCheckbox from '../components/glass/GlassCheckbox.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import { WarningIcon } from '../components/icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { validateEmail } from '../utils/validation.js'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const emailRef = useRef(null)
  const passwordRef = useRef(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    const errors = {
      email: validateEmail(email),
      password: password ? null : 'Enter your password.',
    }
    setFieldErrors(errors)
    if (errors.email) { emailRef.current?.focus(); return }
    if (errors.password) { passwordRef.current?.focus(); return }

    setLoading(true)
    try {
      const user = await login(email.trim(), password, rememberMe)
      const fallback = user.role === 'recruiter' ? '/dashboard' : '/candidate/dashboard'
      navigate(location.state?.from?.pathname || fallback, { replace: true })
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="auth-panel">
      <div className="auth-heading">
        <h1>Welcome back</h1>
        <p>Sign in to your candidate or recruiter workspace.</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {error && (
          <div className="form-alert is-error" role="alert">
            <WarningIcon size={16} />
            <span>{error}</span>
          </div>
        )}

        <GlassInput
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          ref={emailRef}
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: null })) }}
          error={fieldErrors.email}
        />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          ref={passwordRef}
          value={password}
          onChange={(e) => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: null })) }}
          error={fieldErrors.password}
          labelAside={<Link to="/forgot-password" className="text-link">Forgot password?</Link>}
        />

        <GlassCheckbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} label="Remember me" />

        <GlassButton type="submit" variant="primary" size="lg" block loading={loading} loadingText="Signing in…">
          Sign in
        </GlassButton>
      </form>

      <p className="auth-switch">
        New to ResumeMatch? <Link to="/signup" className="text-link">Create an account</Link>
      </p>
    </div>
  )
}
