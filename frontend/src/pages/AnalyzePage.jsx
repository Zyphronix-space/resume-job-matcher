import { useCallback, useRef, useState } from 'react'

import ModeTabs from '../components/ModeTabs.jsx'
import UploadPanel from '../components/UploadPanel.jsx'
import JobDescriptionInput from '../components/JobDescriptionInput.jsx'
import AnalyzeButton from '../components/AnalyzeButton.jsx'
import LoadingState from '../components/LoadingState.jsx'
import MatchScore from '../components/MatchScore.jsx'
import ScoreSummary from '../components/ScoreSummary.jsx'
import JobRequirements from '../components/JobRequirements.jsx'
import AtsAnalysis from '../components/AtsAnalysis.jsx'
import SkillGapRoadmap from '../components/SkillGapRoadmap.jsx'
import ResumeImprovements from '../components/ResumeImprovements.jsx'
import ExplainabilityCard from '../components/ExplainabilityCard.jsx'
import TechnicalDetails from '../components/TechnicalDetails.jsx'
import ErrorState from '../components/ErrorState.jsx'
import DownloadReportButton from '../components/DownloadReportButton.jsx'
import AnalysisHistory from '../components/AnalysisHistory.jsx'
import CompareResumes from '../components/CompareResumes.jsx'
import CompareJobs from '../components/CompareJobs.jsx'
import SuggestedInternships from '../components/SuggestedInternships.jsx'
import { authHeaders } from '../utils/auth.js'
import { entryToResult, saveHistoryEntry } from '../utils/history.js'

function jobLabelFromText(text) {
  const firstLine = text.split('\n').map((l) => l.trim()).find(Boolean) || ''
  if (!firstLine) return 'Untitled role'
  return firstLine.length > 60 ? `${firstLine.slice(0, 57)}...` : firstLine
}

// The original Resume <-> Job analyzer, unchanged in behavior — just
// relocated out of App.jsx so it can sit alongside the internship-finder
// pages as one tab of the new navigation. cvFile is lifted up to App so
// the same uploaded resume can also power internship matching elsewhere.
export default function AnalyzePage({
  apiUrl, cvFile, onCvFileChange, onApiOnlineChange,
  suggestedJobs, suggestedMatches, savedJobIds, onToggleSave, onOpenDetail, onGoToFind,
}) {
  const [mode, setMode] = useState('single')

  const [phase, setPhase] = useState('form') // 'form' | 'loading' | 'results' | 'error'
  const [jobDescription, setJobDescription] = useState('')
  const [result, setResult] = useState(null)
  const [resultMeta, setResultMeta] = useState(null)
  const [errorKind, setErrorKind] = useState(null)
  const [historyVersion, setHistoryVersion] = useState(0)

  const abortRef = useRef(null)

  const canAnalyze = Boolean(cvFile) && jobDescription.trim().length > 0

  const runAnalysis = useCallback(async () => {
    setPhase('loading')
    setErrorKind(null)

    const formData = new FormData()
    formData.append('cv_file', cvFile)
    formData.append('job_description', jobDescription)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`${apiUrl}/analyze`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
        signal: controller.signal,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.error(`/analyze failed: ${res.status}`, body.detail)
        setErrorKind(res.status === 400 ? 'bad-request' : 'server')
        setPhase('error')
        onApiOnlineChange(true)
        return
      }

      const data = await res.json()
      const meta = { filename: cvFile.name, jobLabel: jobLabelFromText(jobDescription) }
      setResult(data)
      setResultMeta(meta)
      setPhase('results')
      onApiOnlineChange(true)
      await saveHistoryEntry({ filename: meta.filename, jobLabel: meta.jobLabel, result: data })
      setHistoryVersion((v) => v + 1)
    } catch (err) {
      if (err.name === 'AbortError') return
      console.error('Network error calling /analyze', err)
      setErrorKind('network')
      setPhase('error')
      onApiOnlineChange(false)
    }
  }, [cvFile, jobDescription, apiUrl, onApiOnlineChange])

  const handleRetry = () => {
    setPhase('form')
    setErrorKind(null)
  }

  const handleNewAnalysis = () => {
    onCvFileChange(null)
    setJobDescription('')
    setResult(null)
    setResultMeta(null)
    setErrorKind(null)
    setPhase('form')
  }

  const handleViewHistoryEntry = (entry) => {
    setResult(entryToResult(entry))
    setResultMeta({ filename: entry.filename, jobLabel: entry.job_label, fromHistory: true })
    setPhase('results')
  }

  const inputsDisabled = phase === 'loading'

  return (
    <>
      <ModeTabs mode={mode} onChange={setMode} disabled={phase === 'loading'} />

      {mode === 'single' && (
        <>
          {phase === 'form' && (
            <>
              <section className="hero">
                <h1 className="hero-title">Find your match.</h1>
                <p className="hero-subtitle">
                  See where your resume aligns with the role — and exactly what skills you could improve.
                </p>
              </section>

              <section className="analysis-grid">
                <UploadPanel
                  file={cvFile}
                  onFileSelect={onCvFileChange}
                  onFileRemove={() => onCvFileChange(null)}
                  disabled={inputsDisabled}
                />
                <JobDescriptionInput
                  value={jobDescription}
                  onChange={setJobDescription}
                  disabled={inputsDisabled}
                />
              </section>

              <div className="analyze-btn-wrap">
                <AnalyzeButton disabled={!canAnalyze} onClick={runAnalysis} />
              </div>

              <AnalysisHistory
                version={historyVersion}
                onSelect={handleViewHistoryEntry}
                onCleared={() => setHistoryVersion((v) => v + 1)}
              />
            </>
          )}

          {phase === 'loading' && <LoadingState />}

          {phase === 'error' && <ErrorState kind={errorKind} onRetry={handleRetry} />}

          {phase === 'results' && result && (
            <section className="results">
              <MatchScore score={result.match_score} />
              <SuggestedInternships
                jobs={suggestedJobs}
                matches={suggestedMatches}
                savedJobIds={savedJobIds}
                onToggleSave={onToggleSave}
                onOpenDetail={onOpenDetail}
                onGoToFind={onGoToFind}
              />
              <ScoreSummary result={result} />
              <JobRequirements result={result} />
              <AtsAnalysis sections={result.resume_sections} score={result.resume_structure_score} />
              <SkillGapRoadmap roadmap={result.skill_gap_roadmap} />
              <ResumeImprovements result={result} />
              <ExplainabilityCard />
              <TechnicalDetails />

              <div className="results-actions">
                <DownloadReportButton result={result} meta={resultMeta} />
                <button type="button" className="new-analysis-btn" onClick={handleNewAnalysis}>
                  Analyze another resume
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {mode === 'compareResumes' && <CompareResumes apiUrl={apiUrl} />}
      {mode === 'compareJobs' && <CompareJobs apiUrl={apiUrl} />}
    </>
  )
}
