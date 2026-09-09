import { useState } from 'react'
import { CheckIcon, ExternalLinkIcon } from '../components/icons.jsx'
import ResumeImprovements from '../components/ResumeImprovements.jsx'
import { generateCoverLetterDraft } from '../utils/coverLetter.js'
import { generateAnswerDraft } from '../utils/applicationQuestions.js'

function ChecklistItem({ done, label }) {
  return (
    <li className={`checklist-item ${done ? 'is-done' : ''}`}>
      <span className="checklist-marker">{done ? <CheckIcon size={13} /> : null}</span>
      {label}
    </li>
  )
}

export default function ApplicationWorkspace({ job, matchResult, application, onUpdate, onApply, onBack }) {
  const [coverLetter, setCoverLetter] = useState(application.coverLetter || '')
  const [questions, setQuestions] = useState(application.questions || [])
  const [newQuestion, setNewQuestion] = useState('')
  const [reviewComplete, setReviewComplete] = useState(false)

  const hasCoverLetter = coverLetter.trim().length > 0
  const hasQuestions = questions.length > 0 && questions.every((q) => q.answer.trim().length > 0)

  const persist = (patch) => onUpdate(application.id, patch)

  const handleGenerateCoverLetter = () => {
    const draft = generateCoverLetterDraft({
      role: job.title,
      company: job.company,
      matchedSkills: matchResult?.matched_skills,
    })
    setCoverLetter(draft)
    persist({ coverLetter: draft })
  }

  const handleCoverLetterChange = (value) => {
    setCoverLetter(value)
    persist({ coverLetter: value })
  }

  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return
    const updated = [...questions, { id: `${Date.now()}`, question: newQuestion.trim(), answer: '' }]
    setQuestions(updated)
    persist({ questions: updated })
    setNewQuestion('')
  }

  const handleGenerateAnswer = (id) => {
    const q = questions.find((item) => item.id === id)
    if (!q) return
    const draft = generateAnswerDraft(q.question, { company: job.company, role: job.title, matchedSkills: matchResult?.matched_skills })
    const updated = questions.map((item) => (item.id === id ? { ...item, answer: draft } : item))
    setQuestions(updated)
    persist({ questions: updated })
  }

  const handleAnswerChange = (id, value) => {
    const updated = questions.map((item) => (item.id === id ? { ...item, answer: value } : item))
    setQuestions(updated)
    persist({ questions: updated })
  }

  const handleRemoveQuestion = (id) => {
    const updated = questions.filter((item) => item.id !== id)
    setQuestions(updated)
    persist({ questions: updated })
  }

  return (
    <section className="workspace">
      <button type="button" className="back-link" onClick={onBack}>&larr; Back</button>

      <section className="hero">
        <h1 className="hero-title">Prepare application</h1>
        <p className="hero-subtitle">{job.title} at {job.company}</p>
      </section>

      <div className="panel">
        <h2 className="panel-title">Application checklist</h2>
        <ul className="checklist-list">
          <ChecklistItem done label="Resume selected" />
          <ChecklistItem done label="Job selected" />
          <ChecklistItem done={hasCoverLetter} label="Cover letter" />
          <ChecklistItem done={hasQuestions} label="Application questions" />
          <ChecklistItem done={reviewComplete} label="Final review" />
        </ul>
      </div>

      {matchResult && (
        <div className="panel">
          <h2 className="panel-title">Before applying</h2>
          <p className="panel-subtitle">Suggested improvements, based only on what was actually detected.</p>
          <ResumeImprovements result={matchResult} />
        </div>
      )}

      <div className="panel">
        <div className="skill-card-head">
          <h2 className="panel-title">Cover letter</h2>
          <span className="ai-draft-badge">AI-generated draft, review before sending</span>
        </div>
        <p className="panel-subtitle">Generated from your detected matching skills. Edit freely before using it.</p>
        <button type="button" className="new-analysis-btn" onClick={handleGenerateCoverLetter}>Generate cover letter</button>
        <textarea
          className="jd-textarea cover-letter-textarea"
          rows={10}
          value={coverLetter}
          onChange={(e) => handleCoverLetterChange(e.target.value)}
          placeholder="Click “Generate cover letter” for a draft, or write your own here."
        />
      </div>

      <div className="panel">
        <h2 className="panel-title">Application questions</h2>
        <p className="panel-subtitle">Optional: add any questions from the application form.</p>

        {questions.map((q) => (
          <div key={q.id} className="application-question">
            <div className="skill-card-head">
              <strong>{q.question}</strong>
              <button type="button" className="file-card-remove" onClick={() => handleRemoveQuestion(q.id)}>Remove</button>
            </div>
            <span className="ai-draft-badge">AI-generated draft</span>
            <button type="button" className="new-analysis-btn" onClick={() => handleGenerateAnswer(q.id)}>Generate draft</button>
            <textarea
              className="jd-textarea"
              rows={4}
              value={q.answer}
              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
              placeholder="Your answer"
            />
          </div>
        ))}

        <div className="add-question-row">
          <input
            className="compare-job-label-input add-question-input"
            placeholder="e.g. Why do you want to join our company?"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
          />
          <button type="button" className="new-analysis-btn" onClick={handleAddQuestion}>Add question</button>
        </div>
      </div>

      <div className="panel">
        <h2 className="panel-title">Application review</h2>

        <dl className="job-detail-facts review-facts">
          <div><dt>Internship</dt><dd>{job.title} at {job.company}</dd></div>
          <div><dt>Resume</dt><dd>{application.resumeFilename || 'Not provided'}</dd></div>
          <div><dt>Cover letter</dt><dd>{hasCoverLetter ? 'Drafted' : 'Not written yet'}</dd></div>
          <div><dt>Application answers</dt><dd>{questions.length} answer{questions.length === 1 ? '' : 's'}</dd></div>
          <div><dt>Match</dt><dd>{matchResult ? `${matchResult.match_score}%` : 'Not available'}</dd></div>
        </dl>

        <label className="review-complete-check">
          <input type="checkbox" checked={reviewComplete} onChange={(e) => setReviewComplete(e.target.checked)} />
          Review complete. I've checked the internship, resume, cover letter, and answers above.
        </label>

        <button
          type="button"
          className="analyze-btn apply-btn"
          disabled={!reviewComplete}
          onClick={() => onApply(application, job)}
        >
          <ExternalLinkIcon size={16} /> Apply
        </button>
        <p className="job-detail-description apply-note">
          This opens the official application page. You submit your application there yourself. This app never
          submits applications on your behalf.
        </p>
      </div>
    </section>
  )
}
