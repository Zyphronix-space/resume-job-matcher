import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span className="site-footer-copy">© {new Date().getFullYear()} RecruitAI. An independent student portfolio project, not a registered company.</span>
        <nav className="site-footer-links" aria-label="Legal">
          <Link to="/about">About</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <a href="mailto:stephanwasalathanthrige@gmail.com">Contact</a>
        </nav>
      </div>
    </footer>
  )
}
