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
    title: 'Requirement check',
    body: 'For a saved or browsed job, each requirement line in the posting is checked against your resume: shown, partly shown, or not found. Lines about years of experience, degrees or languages can’t be verified from text, so they’re shown for you to judge and never scored.',
  },
  {
    title: 'Job sources',
    body: 'Openings are read from employers’ own public job-board APIs (Greenhouse, Lever, Ashby, SmartRecruiters, Workable) or added by hand from an employer’s published advert. Each one shows its source and when it was last checked, and a role the employer stops listing is marked as no longer listed.',
  },
  {
    title: 'Drafts',
    body: 'Tailored resume, cover letter and outreach drafts are filled in by a fixed template using only your own resume and reviewed profile. They aren’t written by AI. Anything the template can’t fill truthfully is left as an [ADD: …] gap for you.',
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
          Everything in ResumeMatch, from a job seeker’s fit check to a recruiter’s ranking, comes from one
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
