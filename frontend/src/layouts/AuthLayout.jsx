import { Link, Outlet } from 'react-router-dom'
import { Wordmark } from '../components/Logo.jsx'

// Sign in, sign up, and password recovery share one quiet frame: the
// wordmark, a single centered column, and the legal links. No marketing
// navigation competing with the form.
export default function AuthLayout() {
  return (
    <div className="auth-shell">
      <header className="auth-shell-header">
        <Link to="/" className="auth-shell-home" aria-label="ResumeMatch home">
          <Wordmark />
        </Link>
      </header>
      <main className="auth-shell-main">
        <Outlet />
      </main>
      <footer className="auth-shell-footer">
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <a href="mailto:stephanwasalathanthrige@gmail.com">Contact</a>
      </footer>
    </div>
  )
}
