import { Link, Outlet } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function PublicLayout() {
  const { user } = useAuth()
  const homeLink = user ? (user.role === 'recruiter' ? '/dashboard' : '/candidate/dashboard') : null

  return (
    <>
      <header className="public-header">
        <Link to="/" className="app-header-brand">
          <span className="app-header-icon"><Logo size={26} /></span>
          <span className="app-header-title">RecruitAI</span>
        </Link>
        <nav className="public-nav" aria-label="Public">
          <Link to="/features">Features</Link>
          <Link to="/about">About</Link>
          {homeLink ? (
            <Link to={homeLink} className="public-nav-cta">Go to workspace</Link>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Link to="/signup" className="public-nav-cta">Get started</Link>
            </>
          )}
        </nav>
      </header>
      <main className="page public-page">
        <Outlet />
      </main>
    </>
  )
}
