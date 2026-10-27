export default function AboutPage() {
  return (
    <article className="prose-page">
      <header className="prose-header">
        <h1 className="display-title is-small">About ResumeMatch</h1>
      </header>
      <div className="prose">
        <p>
          ResumeMatch is a recruiting workspace built around one explainable matching pipeline. Sentence-embedding
          similarity gives the overall match score, and a curated skills taxonomy finds matched and missing skills,
          how important each one is, and where it appears in the resume. The same pipeline scores every candidate
          against every job, so rankings, shortlists, and analytics all rest on the same numbers.
        </p>
        <p>
          Recruiters post jobs, review ranked candidates, leave notes, and move applications through a pipeline.
          Candidates upload a resume, see how they match open roles, and track every application in one place.
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
