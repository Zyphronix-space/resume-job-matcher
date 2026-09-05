import { useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import GlassCard from '../components/glass/GlassCard.jsx'
import GlassButton from '../components/glass/GlassButton.jsx'
import GlassInput from '../components/glass/GlassInput.jsx'
import { forgotPassword } from '../utils/auth.js'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      setResult(await forgotPassword(email))
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
        <p className="hero-subtitle auth-tagline">We'll help you reset your password.</p>

        {!result ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <GlassInput label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            {error && <p className="glass-field-error">{error}</p>}
            <GlassButton type="submit" variant="primary" block disabled={loading}>
              {loading ? 'Please wait…' : 'Send reset link'}
            </GlassButton>
          </form>
        ) : (
          <div className="auth-form">
            <p className="panel-subtitle">{result.detail}</p>
            {result.reset_token && (
              <>
                <p className="form-hint">
                  No email service is configured for this project, so the link is shown here directly
                  instead of being emailed (demo mode).
                </p>
                <GlassButton as={Link} variant="primary" block to={`/reset-password?token=${result.reset_token}`}>
                  Continue to reset password
                </GlassButton>
              </>
            )}
          </div>
        )}

        <p className="auth-switch">
          <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Back to sign in</Link>
        </p>
      </GlassCard>
    </div>
  )
}
