import { useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function App() {
  const [cvFile, setCvFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setResult(null)

    if (!cvFile) {
      setError('Please upload your CV as a PDF')
      return
    }
    if (!jobDescription.trim()) {
      setError('Please paste a job description')
      return
    }

    const formData = new FormData()
    formData.append('cv_file', cvFile)
    formData.append('job_description', jobDescription)

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Server responded with ${res.status}`)
      }
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(`Could not analyze: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page">
      <h1>Resume ↔ Job Match Analyzer</h1>
      <p className="subtitle">
        Upload your CV and paste a job description to see how well you match,
        using sentence embeddings for semantic similarity plus a skills gap check.
      </p>

      <form onSubmit={handleSubmit} className="form">
        <label className="field">
          <span>CV (PDF)</span>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setCvFile(e.target.files[0] ?? null)}
          />
        </label>

        <label className="field">
          <span>Job Description</span>
          <textarea
            rows={10}
            placeholder="Paste the job description here…"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Analyzing…' : 'Analyze Match'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <section className="result">
          <h2>Match Score: {result.match_score}%</h2>

          <div className="skills-columns">
            <div>
              <h3>✅ Matched Skills ({result.matched_skills.length})</h3>
              <ul>
                {result.matched_skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
                {result.matched_skills.length === 0 && <li className="muted">None found</li>}
              </ul>
            </div>
            <div>
              <h3>⚠️ Missing Skills ({result.missing_skills.length})</h3>
              <ul>
                {result.missing_skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
                {result.missing_skills.length === 0 && <li className="muted">None — great coverage!</li>}
              </ul>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}

export default App
