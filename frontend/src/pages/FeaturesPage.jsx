import GlassCard from '../components/glass/GlassCard.jsx'

const FEATURES = [
  {
    title: 'Semantic matching, not keyword spam',
    body: 'Every match score comes from sentence-embedding cosine similarity (all-MiniLM-L6-v2) between a resume and a job description — the same explainable pipeline for every candidate.',
  },
  {
    title: 'Explainable skill matching',
    body: 'Matched and missing skills are detected against a curated taxonomy, with importance levels, category grouping, and evidence snippets pulled straight from the resume text.',
  },
  {
    title: 'A real pipeline, not a spreadsheet',
    body: 'Applied → Screening → Interview → Offer, plus a one-click Shortlist/Reject. Every status change is timestamped in an audit trail.',
  },
  {
    title: 'Recruiter analytics grounded in your data',
    body: 'Pipeline counts, score distributions, and skills demand are computed live from your own jobs and applications — never estimated or invented.',
  },
]

export default function FeaturesPage() {
  return (
    <>
      <section className="hero">
        <h1 className="hero-title">Built on one explainable matching engine</h1>
        <p className="hero-subtitle">
          Everything in RecruitAI — candidate ranking, shortlisting, analytics — is a view over the same
          resume/job matching pipeline. No hidden model, no fabricated "AI" scoring.
        </p>
      </section>

      <div className="feature-grid">
        {FEATURES.map((f) => (
          <GlassCard key={f.title} title={f.title}>
            <p className="glass-card-subtitle">{f.body}</p>
          </GlassCard>
        ))}
      </div>
    </>
  )
}
