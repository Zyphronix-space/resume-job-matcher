import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import GlassCard from '../components/glass/GlassCard.jsx'
import GlassButton from '../components/glass/GlassButton.jsx'
import GlassInput from '../components/glass/GlassInput.jsx'
import { resetPassword } from '../utils/auth.js'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [token, setToken] = useState(searchParams.get('token') || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await resetPassword(token, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 2000)
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
        <p className="hero-subtitle auth-tagline">Choose a new password.</p>

        {done ? (
          <p className="form-success">Password updated — redirecting to sign in…</p>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <GlassInput label="Reset token" required value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste your reset token" />
            <GlassInput label="New password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
            <GlassInput label="Confirm new password" type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            {error && <p className="glass-field-error">{error}</p>}
            <GlassButton type="submit" variant="primary" block disabled={loading}>
              {loading ? 'Please wait…' : 'Reset password'}
            </GlassButton>
          </form>
        )}

        <p className="auth-switch">
          <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Back to sign in</Link>
        </p>
      </GlassCard>
    </div>
  )
}
