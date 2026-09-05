import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <>
      <section className="hero">
        <h1 className="hero-title">Hire on evidence, not guesswork.</h1>
        <p className="hero-subtitle">
          RecruitAI ranks every candidate against your job requirements using explainable semantic
          matching and skill-taxonomy analysis — real scores, real matched/missing skills, no black box.
        </p>
        <div className="landing-hero-actions">
          <Link to="/signup" className="analyze-btn">Get started</Link>
          <Link to="/features" className="new-analysis-btn">See how it works</Link>
        </div>
      </section>

      <div className="panel">
        <h2 className="panel-title">Resume → Job → AI Match → Ranking → Shortlist → Decision</h2>
        <p className="panel-subtitle">
          Candidates upload a resume once. Recruiters post a job once. Every application is scored the
          same way — sentence-embedding semantic similarity plus curated skill-taxonomy matching — so
          ranking a pool of candidates is consistent and explainable from the first applicant to the last.
        </p>
      </div>
    </>
  )
}
