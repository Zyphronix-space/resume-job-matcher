import { Link } from 'react-router-dom'
import GlassButton from '../components/glass/GlassButton.jsx'

const SECTIONS = [
  {
    title: 'Match score',
    body: 'The resume and the job description are each encoded with the all-MiniLM-L6-v2 sentence-embedding model, and the score is their cosine similarity on a 0 to 100 scale. Every resume is scored against every job the same way, so rankings are consistent.',
  },
  {
    title: 'Skill coverage',
    body: 'Skills are detected in both documents against a curated taxonomy, plus any skills a recruiter tags on the job. Coverage is the share of the job’s skills that also appear in the resume. It is reported separately from the match score.',
  },
  {
    title: 'Importance and evidence',
    body: 'Each skill in the job gets an importance level based on how often it appears and whether it sits in a requirements section. For skills the resume has, ResumeMatch shows which resume section it came from and the sentence it was found in.',
  },
  {
    title: 'Skill gap order',
    body: 'Missing skills are listed by importance, and skills with a known prerequisite are placed after it. This is a simple rule-based ordering, not personalized career advice.',
  },
  {
    title: 'Recruiter pipeline',
    body: 'Applications move through Applied, Screening, Interview, and Offer, or are shortlisted or rejected. Recruiters can add notes, compare candidates, and export CSV or PDF reports built from the same data.',
  },
  {
    title: 'Analytics',
    body: 'Pipeline counts, score distributions, and the most-requested skills are calculated from a recruiter’s own jobs and applications when the page loads. Nothing is estimated.',
  },
]

export default function FeaturesPage() {
  return (
    <article className="prose-page">
      <header className="prose-header">
        <h1 className="display-title is-small">How matching works</h1>
        <p className="lede">
          Everything in ResumeMatch, from a candidate’s match list to a recruiter’s ranking, comes from one
          matching pipeline. Here is what each number means.
        </p>
      </header>

      <dl className="definition-list">
        {SECTIONS.map((s) => (
          <div key={s.title} className="definition-row">
            <dt>{s.title}</dt>
            <dd>{s.body}</dd>
          </div>
        ))}
      </dl>

      <div className="prose-cta">
        <p>The score is a similarity measure. It helps sort and explain, but it can’t tell you whether someone will be hired.</p>
        <GlassButton as={Link} to="/signup" variant="primary">Create an account</GlassButton>
      </div>
    </article>
  )
}
