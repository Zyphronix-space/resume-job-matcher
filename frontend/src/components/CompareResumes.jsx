import { useRef, useState } from 'react'
import { DocumentIcon, TrashIcon, UploadIcon, WarningIcon } from './icons.jsx'
import { interpretScore, SCORE_STATE_CLASS } from '../utils/score.js'
import { authHeaders } from '../utils/auth.js'

function isPdf(file) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export default function CompareResumes({ apiUrl }) {
  const inputRef = useRef(null)
  const [files, setFiles] = useState([])
  const [jobDescription, setJobDescription] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [validationError, setValidationError] = useState(null)

  const addFiles = (list) => {
    const incoming = Array.from(list || []).filter(isPdf)
    if (incoming.length === 0) {
      setValidationError('Please add PDF files.')
      return
    }
    setValidationError(null)
    setFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name}-${f.size}`))
      const merged = [...prev]
      incoming.forEach((f) => {
        const key = `${f.name}-${f.size}`
        if (!existingKeys.has(key)) {
          existingKeys.add(key)
          merged.push(f)
        }
      })
      return merged
    })
  }

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx))

  const canCompare = files.length >= 1 && jobDescription.trim().length > 0 && !loading

  const runCompare = async () => {
    setLoading(true)
    setResults(null)
    const outcomes = []
    for (const file of files) {
      try {
        const formData = new FormData()
        formData.append('cv_file', file)
        formData.append('job_description', jobDescription)
        const res = await fetch(`${apiUrl}/analyze`, { method: 'POST', headers: authHeaders(), body: formData })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          outcomes.push({ filename: file.name, error: body.detail || `Server responded with ${res.status}` })
          continue
        }
        outcomes.push({ filename: file.name, data: await res.json() })
      } catch (err) {
        outcomes.push({ filename: file.name, error: err.message })
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
        <h1 className="hero-title compare-title">Compare resumes</h1>
        <p className="hero-subtitle">
          See how multiple versions of your resume stack up against the same job description.
        </p>
      </div>

      <div className="analysis-grid">
        <div className="panel">
          <h2 className="panel-title">Resumes</h2>
          <p className="panel-subtitle">Add two or more PDFs to compare</p>

          <div
            className="dropzone"
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              addFiles(e.dataTransfer.files)
            }}
          >
            <UploadIcon size={28} className="dropzone-icon" />
            <p className="dropzone-title">Drop resumes here</p>
            <p className="dropzone-sub">or click to browse, multiple PDFs supported</p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              hidden
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {validationError && (
            <p className="field-error"><WarningIcon size={15} /> {validationError}</p>
          )}

          {files.length > 0 && (
            <ul className="compare-file-list">
              {files.map((f, i) => (
                <li key={`${f.name}-${f.size}`} className="file-card compare-file-card">
                  <span className="file-card-icon"><DocumentIcon size={22} /></span>
                  <div className="file-card-info"><span className="file-card-name">{f.name}</span></div>
                  <button type="button" className="file-card-remove" onClick={() => removeFile(i)}>
                    <TrashIcon size={14} /> Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel">
          <h2 className="panel-title">Job description</h2>
          <p className="panel-subtitle">The same role, compared against every resume above</p>
          <textarea
            className="jd-textarea"
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={10}
          />
        </div>
      </div>

      <div className="analyze-btn-wrap">
        <button type="button" className="analyze-btn" disabled={!canCompare} onClick={runCompare}>
          {loading ? 'Comparing…' : 'Compare resumes'}
        </button>
      </div>

      {results && (
        <div className="panel compare-results-panel">
          <h2 className="panel-title">Results</h2>
          <div className="compare-table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th>Resume</th>
                  <th>Semantic match</th>
                  <th>Skill coverage</th>
                  <th>Matched</th>
                  <th>Missing</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.filename} className={best && r === best ? 'is-best' : ''}>
                    <td>
                      {r.filename}
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
