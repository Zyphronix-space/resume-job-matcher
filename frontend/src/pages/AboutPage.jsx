export default function AboutPage() {
  return (
    <section className="hero" style={{ textAlign: 'left', maxWidth: 640, margin: '0 auto' }}>
      <h1 className="hero-title" style={{ fontSize: '2.4rem' }}>About RecruitAI</h1>
      <p className="hero-subtitle" style={{ margin: '1rem 0 0', maxWidth: 'none', textAlign: 'left' }}>
        RecruitAI is a recruitment workspace built around one explainable NLP pipeline: sentence-embedding
        semantic similarity for overall match, plus curated skill-taxonomy detection for matched/missing
        skills, importance, and evidence. The same pipeline scores every candidate against every job, so
        rankings, shortlists, and analytics are all grounded in the same, auditable numbers — not a
        black-box "AI score."
      </p>
      <p className="hero-subtitle" style={{ margin: '1rem 0 0', maxWidth: 'none', textAlign: 'left' }}>
        Recruiters post jobs, review AI-ranked candidates, leave notes, and move applications through a
        pipeline. Candidates upload a resume, see how they match against open roles, and track every
        application in one place.
      </p>
    </section>
  )
}
