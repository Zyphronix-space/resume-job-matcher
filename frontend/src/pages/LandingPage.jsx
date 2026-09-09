import { Link } from 'react-router-dom'
import GlassCard from '../components/glass/GlassCard.jsx'
import GlassButton from '../components/glass/GlassButton.jsx'

export default function LandingPage() {
  return (
    <>
      <section className="hero">
        <h1 className="hero-title">Hire on evidence, not guesswork.</h1>
        <p className="hero-subtitle">
          RecruitAI ranks every candidate against your job requirements using explainable semantic
          matching and skill-taxonomy analysis: real scores, real matched/missing skills, no black box.
        </p>
        <div className="landing-hero-actions">
          <GlassButton as={Link} to="/signup" variant="primary">Get started</GlassButton>
          <GlassButton as={Link} to="/features" variant="secondary">See how it works</GlassButton>
        </div>
      </section>

      <GlassCard title="Resume → Job → AI Match → Ranking → Shortlist → Decision">
        <p className="glass-card-subtitle">
          Candidates upload a resume once. Recruiters post a job once. Every application is scored the
          same way: sentence-embedding semantic similarity plus curated skill-taxonomy matching, so
          ranking a pool of candidates is consistent and explainable from the first applicant to the last.
        </p>
      </GlassCard>
    </>
  )
}
