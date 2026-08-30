import { useRef, useState } from 'react'
import { DocumentIcon, TrashIcon, UploadIcon, WarningIcon } from './icons.jsx'
import { interpretScore, SCORE_STATE_CLASS } from '../utils/score.js'
import { authHeaders } from '../utils/auth.js'

function isPdf(file) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

let jobIdCounter = 0
function newJob() {
  jobIdCounter += 1
  return { id: jobIdCounter, label: '', text: '' }
}

export default function CompareJobs({ apiUrl }) {
  const inputRef = useRef(null)
  const [cvFile, setCvFile] = useState(null)
  const [jobs, setJobs] = useState(() => [newJob(), newJob()])
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [validationError, setValidationError] = useState(null)

  const handleFile = (file) => {
    if (!file) return
    if (!isPdf(file)) {
      setValidationError('Please upload a PDF file.')
      return
    }
    setValidationError(null)
    setCvFile(file)
  }

  const updateJob = (id, patch) => setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)))
  const addJob = () => setJobs((prev) => [...prev, newJob()])
  const removeJob = (id) => setJobs((prev) => prev.filter((j) => j.id !== id))

  const activeJobs = jobs.filter((j) => j.text.trim())
  const canCompare = Boolean(cvFile) && activeJobs.length >= 1 && !loading

  const runCompare = async () => {
    setLoading(true)
    setResults(null)
    const outcomes = []
    for (const [i, job] of activeJobs.entries()) {
      const label = job.label.trim() || `Job ${i + 1}`
      try {
        const formData = new FormData()
        formData.append('cv_file', cvFile)
        formData.append('job_description', job.text)
        const res = await fetch(`${apiUrl}/analyze`, { method: 'POST', headers: authHeaders(), body: formData })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          outcomes.push({ label, error: body.detail || `Server responded with ${res.status}` })
          continue
        }
        outcomes.push({ label, data: await res.json() })
      } catch (err) {
        outcomes.push({ label, error: err.message })
      }
    }
    setResults(outcomes)
    setLoading(false)
  }

  const best = results
    ? results.filter((r) => r.data).reduce((top, r) => (!top || r.data.match_score > top.data.match_score ? r : top), null)
    : null

  return (
    <section className="compare-section">
      <div className="hero compare-hero">
        <h1 className="hero-title compare-title">Compare jobs</h1>
        <p className="hero-subtitle">See how one resume stacks up against several different roles.</p>
      </div>

      <div className="panel">
        <h2 className="panel-title">Your resume</h2>
        <p className="panel-subtitle">One PDF, compared against every job below</p>
        {!cvFile ? (
          <div
            className="dropzone"
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleFile(e.dataTransfer.files?.[0])
            }}
          >
            <UploadIcon size={28} className="dropzone-icon" />
            <p className="dropzone-title">Drop your CV here</p>
            <p className="dropzone-sub">or click to browse</p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              hidden
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        ) : (
          <div className="file-card">
            <span className="file-card-icon"><DocumentIcon size={26} /></span>
            <div className="file-card-info"><span className="file-card-name">{cvFile.name}</span></div>
            <button type="button" className="file-card-remove" onClick={() => setCvFile(null)}>
              <TrashIcon size={15} /> Remove
            </button>
          </div>
        )}
        {validationError && (
          <p className="field-error"><WarningIcon size={15} /> {validationError}</p>
        )}
      </div>

      <div className="compare-jobs-list">
        {jobs.map((job, i) => (
          <div key={job.id} className="panel compare-job-panel">
            <div className="skill-card-head">
              <input
                className="compare-job-label-input"
                placeholder={`Job ${i + 1} title (optional)`}
                value={job.label}
                onChange={(e) => updateJob(job.id, { label: e.target.value })}
              />
              {jobs.length > 1 && (
                <button type="button" className="file-card-remove" onClick={() => removeJob(job.id)}>
                  <TrashIcon size={14} /> Remove
                </button>
              )}
            </div>
            <textarea
              className="jd-textarea"
              placeholder="Paste this job description here..."
              value={job.text}
              onChange={(e) => updateJob(job.id, { text: e.target.value })}
              rows={8}
            />
          </div>
        ))}
      </div>

      <div className="compare-add-job-wrap">
        <button type="button" className="new-analysis-btn" onClick={addJob}>+ Add another job</button>
      </div>

      <div className="analyze-btn-wrap">
        <button type="button" className="analyze-btn" disabled={!canCompare} onClick={runCompare}>
          {loading ? 'Comparing…' : 'Compare jobs'}
        </button>
      </div>

      {results && (
        <div className="panel compare-results-panel">
          <h2 className="panel-title">Results</h2>
          <div className="compare-table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Semantic match</th>
                  <th>Skill coverage</th>
                  <th>Matched</th>
                  <th>Missing</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={`${r.label}-${i}`} className={best && r === best ? 'is-best' : ''}>
                    <td>
                      {r.label}
                      {best && r === best && <span className="best-match-badge">Best match</span>}
                    </td>
                    {r.data ? (
                      <>
                        <td className={SCORE_STATE_CLASS[interpretScore(r.data.match_score)]}>{r.data.match_score}%</td>
                        <td>{r.data.skill_coverage}%</td>
                        <td>{r.data.matched_skills.length}</td>
                        <td>{r.data.missing_skills.length}</td>
                      </>
                    ) : (
                      <td colSpan={4} className="compare-row-error">{r.error}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
