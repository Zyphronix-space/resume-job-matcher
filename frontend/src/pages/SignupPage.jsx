import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { useAuth } from '../context/AuthContext.jsx'

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
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const user = await signup({ fullName, email, password, role })
      navigate(user.role === 'recruiter' ? '/dashboard' : '/candidate/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <Logo size={34} />
          <span>RecruitAI</span>
        </div>
        <p className="hero-subtitle auth-tagline">Create your recruiter or candidate account.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="mode-tabs auth-mode-tabs">
            <button type="button" className={`mode-tab ${role === 'candidate' ? 'is-active' : ''}`} onClick={() => setRole('candidate')}>
              I'm a candidate
            </button>
            <button type="button" className={`mode-tab ${role === 'recruiter' ? 'is-active' : ''}`} onClick={() => setRole('recruiter')}>
              I'm a recruiter
            </button>
          </div>

          <label className="find-field">
            <span>Full name</span>
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Perera" />
          </label>
          <label className="find-field">
            <span>Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <label className="find-field">
            <span>Password</span>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
          </label>
          <label className="find-field">
            <span>Confirm password</span>
            <input type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" />
          </label>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="analyze-btn auth-submit-btn" disabled={loading}>
            {loading ? 'Please wait…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
