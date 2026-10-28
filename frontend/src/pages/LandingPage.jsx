import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import GlassButton from '../components/glass/GlassButton.jsx'
import { CheckIcon, CloseIcon } from '../components/icons.jsx'
import { getPostingFacets } from '../utils/workspace.js'

// A static, clearly labeled sample of what the match breakdown looks like.
// It is illustration only: no request is made and nothing here is presented
// as a real candidate or job.
const SAMPLE = {
  job: 'Backend Engineer Intern',
  score: 71,
  matched: ['Python', 'FastAPI', 'SQL', 'Git'],
  missing: ['Docker', 'AWS'],
}

function SampleBreakdown() {
  const total = SAMPLE.matched.length + SAMPLE.missing.length
  return (
    <figure className="specimen" aria-labelledby="specimen-caption">
      <figcaption id="specimen-caption" className="specimen-caption">Sample report. Illustrative data, not a real job or candidate</figcaption>
      <div className="specimen-body">
        <div className="specimen-head">
          <div>
            <p className="specimen-job">{SAMPLE.job}</p>
            <p className="specimen-sub">Compared with one uploaded resume</p>
          </div>
          <p className="specimen-score num">{SAMPLE.score}<span>/100</span></p>
        </div>

        <div className="coverage" aria-hidden="true">
          {SAMPLE.matched.map((s) => <span key={s} className="coverage-seg is-matched" />)}
          {SAMPLE.missing.map((s) => <span key={s} className="coverage-seg is-missing" />)}
        </div>
        <p className="specimen-sub">{SAMPLE.matched.length} of {total} skills from the job were found in the resume</p>

        <ul className="specimen-skills">
          {SAMPLE.matched.map((s) => (
            <li key={s} className="is-matched"><CheckIcon size={14} />{s}</li>
          ))}
          {SAMPLE.missing.map((s) => (
            <li key={s} className="is-missing"><CloseIcon size={14} />{s}</li>
          ))}
        </ul>

        <div className="specimen-evidence">
          <p className="specimen-evidence-label">Where “Python” was found: Work Experience</p>
          <p className="evidence-quote">“Built a <mark>Python</mark> service that parsed supplier invoices and loaded them into SQL.”</p>
        </div>
      </div>
    </figure>
  )
}

const STEPS = [
  {
    title: 'Find real openings',
    body: 'Jobs come straight from employers’ own public job boards, each with its source and the date it was last checked. Expired listings are marked, never padded out.',
  },
  {
    title: 'Understand your fit',
    body: 'Your resume is compared with each posting requirement by requirement: what it shows, what it doesn’t, and what only you can confirm, like years of experience.',
  },
  {
    title: 'Improve your application',
    body: 'Get specific suggestions and drafts of a tailored resume and cover letter built only from your own experience. Anything missing is marked for you to fill in.',
  },
  {
    title: 'Track your progress',
    body: 'Keep every job you’re considering in one tracker, from saved to offer, with follow-up dates, notes and interview prep for that exact role.',
  },
]

export default function LandingPage() {
  const [facets, setFacets] = useState(null)
  useEffect(() => { getPostingFacets().then(setFacets).catch(() => setFacets(null)) }, [])

  return (
    <>
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <h1 className="display-title">Find relevant jobs, understand your fit, and track every application.</h1>
          <p className="lede">
            ResumeMatch is a job-search workspace. Browse real openings, see how your resume measures up to each one
            with the evidence behind it, improve your application, and keep track of where you stand.
          </p>
          <div className="button-row">
            <GlassButton as={Link} to="/openings" variant="primary" size="lg">
              {facets?.total ? `Browse ${facets.total} open roles` : 'Browse jobs'}
            </GlassButton>
            <GlassButton as={Link} to="/signup" variant="secondary" size="lg">Create a free account</GlassButton>
          </div>
          {facets?.total > 0 && (
            <p className="form-hint">
              {facets.open_to_sri_lanka} of them open to applicants in Sri Lanka. No account needed to browse.
            </p>
          )}
        </div>
        <SampleBreakdown />
      </section>

      <section className="landing-section" aria-labelledby="steps-title">
        <h2 id="steps-title" className="section-title">One workspace for your job search</h2>
        <ol className="steps">
          {STEPS.map((step) => (
            <li key={step.title} className="step">
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-section landing-audiences" aria-label="Who it’s for">
        <div>
          <h2 className="section-title">For job seekers</h2>
          <ul className="plain-list">
            <li>Search openings by title, skill or company, and filter by level, work mode and country.</li>
            <li>Check your fit for any job, including ones you paste in from elsewhere.</li>
            <li>Your resume stays private. It’s only shared when you apply to a role a recruiter posted here.</li>
          </ul>
        </div>
        <div>
          <h2 className="section-title">For recruiters</h2>
          <ul className="plain-list">
            <li>Post a role on ResumeMatch and review applicants ranked by match, with the evidence for each score.</li>
            <li>Move people through screening, interview and offer, with notes and exports.</li>
            <li>You only ever see candidates who applied to your roles.</li>
          </ul>
        </div>
      </section>

      <p className="landing-footnote">
        Scores and assessments explain how a resume compares with a posting. They don’t predict whether anyone will be
        hired, and they’re never adjusted to look better.
      </p>
    </>
  )
}
