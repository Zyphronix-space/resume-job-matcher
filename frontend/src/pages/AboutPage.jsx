export default function AboutPage() {
  return (
    <article className="prose-page">
      <header className="prose-header">
        <h1 className="display-title is-small">About ResumeMatch</h1>
      </header>
      <div className="prose">
        <p>
          ResumeMatch is a job-search workspace built around one explainable matching pipeline. Job seekers browse
          real openings imported from employers’ own public job boards, check how their resume fits each one
          requirement by requirement, prepare their application, and track it from saved to offer. Sentence-embedding
          similarity gives the overall match score, and a curated skills taxonomy finds matched and missing skills,
          how important each one is, and where it appears in the resume.
        </p>
        <p>
          It’s useful to a job seeker on its own, with no recruiter involved. Recruiters can also post roles here,
          review the people who applied ranked by the same pipeline, and move applications through screening,
          interview and offer. A recruiter only ever sees candidates who applied to their roles.
        </p>
        <p>
          It’s an independent student portfolio project by Stephan Wasalathanthrige, not a registered company.
          Questions or feedback are welcome at{' '}
          <a href="mailto:stephanwasalathanthrige@gmail.com">stephanwasalathanthrige@gmail.com</a>.
        </p>
      </div>
    </article>
  )
}
