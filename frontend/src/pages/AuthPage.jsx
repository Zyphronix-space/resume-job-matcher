import { useState } from 'react'
import Logo from '../components/Logo.jsx'
import { login, signup } from '../utils/auth.js'

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = mode === 'login' ? await login(email, password) : await signup(email, password)
      onAuthenticated(data)
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
          <span>Resume Match</span>
        </div>
        <p className="hero-subtitle auth-tagline">Find your fit. Close your gaps. Land your internship.</p>

        <div className="mode-tabs auth-mode-tabs">
          <button type="button" className={`mode-tab ${mode === 'login' ? 'is-active' : ''}`} onClick={() => setMode('login')}>
            Sign in
          </button>
          <button type="button" className={`mode-tab ${mode === 'signup' ? 'is-active' : ''}`} onClick={() => setMode('signup')}>
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="find-field">
            <span>Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <label className="find-field">
            <span>Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
            />
          </label>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="analyze-btn auth-submit-btn" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? (
            <>Don't have an account? <button type="button" onClick={() => setMode('signup')}>Sign up</button></>
          ) : (
            <>Already have an account? <button type="button" onClick={() => setMode('login')}>Sign in</button></>
          )}
        </p>
      </div>
    </div>
  )
}
