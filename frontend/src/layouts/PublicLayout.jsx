import { Link, NavLink, Outlet } from 'react-router-dom'
import { Wordmark } from '../components/Logo.jsx'
import Footer from '../components/Footer.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function PublicLayout() {
  const { user } = useAuth()
  const homeLink = user ? (user.role === 'recruiter' ? '/dashboard' : '/candidate/dashboard') : null

  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="public-header-inner">
          <Link to="/" className="public-home" aria-label="ResumeMatch home">
            <Wordmark />
          </Link>
          <nav className="public-nav" aria-label="Main">
            <NavLink to="/features" className="public-nav-link">How it works</NavLink>
            <NavLink to="/about" className="public-nav-link">About</NavLink>
            {homeLink ? (
              <Link to={homeLink} className="glass-btn glass-btn-primary glass-btn-sm">Open workspace</Link>
            ) : (
              <>
                <NavLink to="/login" className="public-nav-link">Sign in</NavLink>
                <Link to="/signup" className="glass-btn glass-btn-primary glass-btn-sm">Create account</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="public-page">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
