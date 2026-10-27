import { Link } from 'react-router-dom'
import GlassButton from '../components/glass/GlassButton.jsx'
import { CheckIcon, CloseIcon } from '../components/icons.jsx'

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
      <figcaption id="specimen-caption" className="specimen-caption">Sample breakdown, illustrative data</figcaption>
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
    title: 'The resume is read',
    body: 'Text is extracted from the PDF, split into sections like Education and Work Experience, and checked against a curated skills list.',
  },
  {
    title: 'It’s compared with the job',
    body: 'Both texts are turned into sentence embeddings and compared, which gives the match score. Skills named in the job are checked off against the resume.',
  },
  {
    title: 'You see the reasoning',
    body: 'Every score comes with the matched and missing skills, how important each one is in the posting, and the line in the resume where a skill was found.',
  },
]

export default function LandingPage() {
  return (
    <>
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <h1 className="display-title">See why a resume fits a job, skill by skill.</h1>
          <p className="lede">
            ResumeMatch compares a resume with a job description and puts the score next to its evidence:
            which skills were found, where they appear, and what’s missing.
          </p>
          <div className="button-row">
            <GlassButton as={Link} to="/signup" variant="primary" size="lg">Create an account</GlassButton>
            <GlassButton as={Link} to="/features" variant="secondary" size="lg">How matching works</GlassButton>
          </div>
        </div>
        <SampleBreakdown />
      </section>

      <section className="landing-section" aria-labelledby="steps-title">
        <h2 id="steps-title" className="section-title">How a match is built</h2>
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
          <h2 className="section-title">For candidates</h2>
          <ul className="plain-list">
            <li>Upload a PDF resume once and see every open role ranked against it.</li>
            <li>Find out which required skills you’re missing, in the order the posting weighs them.</li>
            <li>Apply in one step and follow each application’s status.</li>
          </ul>
        </div>
        <div>
          <h2 className="section-title">For recruiters</h2>
          <ul className="plain-list">
            <li>Post a job with required and preferred skills.</li>
            <li>Review applicants ranked by match, filter by skill or score, and compare them side by side.</li>
            <li>Move people through screening, interview, and offer, with notes and CSV or PDF exports.</li>
          </ul>
        </div>
      </section>

      <p className="landing-footnote">
        The match score measures how similar two documents are. It’s a way to sort and explain, not a prediction
        of whether someone will be hired.
      </p>
    </>
  )
}
