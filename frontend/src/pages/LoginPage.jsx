import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import GlassCard from '../components/glass/GlassCard.jsx'
import GlassButton from '../components/glass/GlassButton.jsx'
import GlassInput from '../components/glass/GlassInput.jsx'
import GlassCheckbox from '../components/glass/GlassCheckbox.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const user = await login(email, password, rememberMe)
      const fallback = user.role === 'recruiter' ? '/dashboard' : '/candidate/dashboard'
      navigate(location.state?.from?.pathname || fallback, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <GlassCard className="auth-card">
        <div className="auth-brand">
          <Logo size={34} />
          <span>RecruitAI</span>
        </div>
        <p className="hero-subtitle auth-tagline">Sign in to your recruiter or candidate workspace.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <GlassInput label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <GlassInput label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <GlassCheckbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} label="Remember me" />
            <Link to="/forgot-password" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Forgot password?</Link>
          </div>

          {error && <p className="glass-field-error">{error}</p>}

          <GlassButton type="submit" variant="primary" block disabled={loading}>
            {loading ? 'Please wait…' : 'Sign in'}
          </GlassButton>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/signup" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Sign up</Link>
        </p>
      </GlassCard>
    </div>
  )
}
