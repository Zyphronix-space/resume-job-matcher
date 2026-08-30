import { useCallback, useEffect, useState } from 'react'
import './App.css'

import Header from './components/Header.jsx'
import Nav from './components/Nav.jsx'
import AnalyzePage from './pages/AnalyzePage.jsx'
import HomePage from './pages/HomePage.jsx'
import FindInternshipsPage from './pages/FindInternshipsPage.jsx'
import JobDetailView from './pages/JobDetailView.jsx'
import SavedPage from './pages/SavedPage.jsx'
import ApplicationsPage from './pages/ApplicationsPage.jsx'
import ApplicationWorkspace from './pages/ApplicationWorkspace.jsx'
import AuthPage from './pages/AuthPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import { API_URL } from './utils/apiUrl.js'
import { authHeaders, fetchCurrentUser, getToken, setToken } from './utils/auth.js'
import { loadPreferences, savePreferences } from './utils/preferences.js'
import { loadSavedJobs, removeSavedJob, saveJob } from './utils/savedJobs.js'
import {
  ensureApplication, loadApplications, removeApplication, setApplicationStatus, updateApplication,
} from './utils/applications.js'

const THEME_STORAGE_KEY = 'resume-matcher-theme'

function getSystemPrefersDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveTheme(mode) {
  return mode === 'system' ? (getSystemPrefersDark() ? 'dark' : 'light') : mode
}

// The theme toggle is the one preference that stays in the browser's
// localStorage rather than the database — it's a per-device display
// setting, not user data, so it doesn't need to live server-side.
function useTheme() {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) || 'system'
    } catch {
      return 'system'
    }
  })

  useEffect(() => {
    document.body.setAttribute('data-theme', resolveTheme(mode))
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode)
    } catch {
      /* localStorage unavailable — theme just won't persist */
    }
  }, [mode])

  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (mode === 'system') document.body.setAttribute('data-theme', resolveTheme('system'))
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode])

  const cycle = useCallback(() => {
    setMode((m) => (m === 'light' ? 'dark' : m === 'dark' ? 'system' : 'light'))
  }, [])

  return [mode, cycle]
}

export default function App() {
  const [themeMode, cycleTheme] = useTheme()
  const [apiOnline, setApiOnline] = useState(null)
  const [page, setPage] = useState('home')

  // Every feature below this point requires a signed-in account — see
  // backend/auth.py. authChecked distinguishes "still checking the stored
  // token" from "confirmed signed out", so we don't flash the sign-in
  // screen before a valid session has had a chance to load.
  const [authUser, setAuthUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Shared across Analyze and internship matching — kept in memory only,
  // never persisted (see privacy notes throughout the app).
  const [cvFile, setCvFile] = useState(null)

  const [jobs, setJobs] = useState([])
  const [jobMatches, setJobMatches] = useState({})
  const [jobsLoading, setJobsLoading] = useState(false)
  const [jobsError, setJobsError] = useState(null)
  const [isDemoProvider, setIsDemoProvider] = useState(true)

  const [selectedJobId, setSelectedJobId] = useState(null)
  const [workspaceJobId, setWorkspaceJobId] = useState(null)

  const [preferences, setPreferences] = useState({ roles: [], locations: [], workMode: 'Any', technologies: [] })
  const [savedJobsState, setSavedJobsState] = useState([])
  const [applications, setApplications] = useState([])

  useEffect(() => {
    fetchCurrentUser().then((user) => {
      setAuthUser(user)
      setAuthChecked(true)
    })
  }, [])

  const handleAuthenticated = (data) => {
    setToken(data.access_token)
    setAuthUser(data.user)
  }

  const handleSignOut = () => {
    setToken(null)
    setAuthUser(null)
    setPage('home')
    setCvFile(null)
    setJobs([])
    setJobMatches({})
    setSavedJobsState([])
    setApplications([])
  }

  // Everything below lives in the SQLite database (see backend/database.py)
  // rather than localStorage — loaded once a session is confirmed.
  useEffect(() => {
    if (!authUser) return
    loadPreferences().then(setPreferences)
    loadSavedJobs().then(setSavedJobsState)
    loadApplications().then(setApplications)
  }, [authUser])

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/health`, { cache: 'no-store' })
      setApiOnline(res.ok)
    } catch {
      setApiOnline(false)
    }
  }, [])

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 60000)
    return () => clearInterval(interval)
  }, [checkHealth])

  const runJobMatch = useCallback(async (jobsList) => {
    if (!cvFile || jobsList.length === 0) return
    try {
      const formData = new FormData()
      formData.append('cv_file', cvFile)
      formData.append('job_ids', jobsList.map((j) => j.id).join(','))
      const res = await fetch(`${API_URL}/jobs/match`, { method: 'POST', headers: authHeaders(), body: formData })
      if (!res.ok) throw new Error(`Server responded with ${res.status}`)
      const data = await res.json()
      const merged = Object.fromEntries(
        Object.entries(data.results).map(([id, r]) => [
          id,
          { ...r, resume_sections: data.resume_sections, resume_structure_score: data.resume_structure_score },
        ]),
      )
      setJobMatches((prev) => ({ ...prev, ...merged }))
      setApiOnline(true)
    } catch (err) {
      console.error('Matching internships against your CV failed', err)
    }
  }, [cvFile])

  const handleSearchJobs = useCallback(async (filters) => {
    setJobsLoading(true)
    setJobsError(null)
    try {
      const params = new URLSearchParams()
      if (filters.role) params.set('role', filters.role)
      if (filters.location) params.set('location', filters.location)
      if (filters.workMode && filters.workMode !== 'Any') params.set('work_mode', filters.workMode)
      if (filters.skills) params.set('skills', filters.skills)
      if (filters.company) params.set('company', filters.company)
      if (filters.keyword) params.set('keyword', filters.keyword)

      const res = await fetch(`${API_URL}/jobs?${params.toString()}`, { headers: authHeaders() })
      if (!res.ok) throw new Error(`Server responded with ${res.status}`)
      const data = await res.json()
      setJobs(data.jobs)
      setIsDemoProvider(data.is_demo)
      setApiOnline(true)

      if (cvFile && data.jobs.length > 0) {
        await runJobMatch(data.jobs)
      }
      return data.jobs
    } catch (err) {
      console.error('Internship search failed', err)
      setJobsError('Could not load internships. Make sure the server is running and try again.')
      setApiOnline(false)
      return []
    } finally {
      setJobsLoading(false)
    }
  }, [cvFile, runJobMatch])

  // Re-match already-loaded internships whenever the uploaded CV changes,
  // and — if no search has been run yet — automatically fetch a first
  // batch so a couple of matching internships are ready to show right
  // after a CV is analyzed (see AnalyzePage's "Suggested internships").
  useEffect(() => {
    if (!cvFile) {
      setJobMatches({})
      return
    }
    if (jobs.length > 0) {
      runJobMatch(jobs)
    } else {
      handleSearchJobs({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cvFile])

  const handleToggleSave = async (job, matchResult) => {
    const isSaved = savedJobsState.some((j) => j.id === job.id)
    const updated = isSaved ? await removeSavedJob(job.id) : await saveJob(job, matchResult)
    setSavedJobsState(updated)
  }

  const handleOpenWorkspace = async (job, matchResult) => {
    await ensureApplication(job, matchResult, cvFile?.name)
    setApplications(await loadApplications())
    setWorkspaceJobId(job.id)
    setSelectedJobId(null)
  }

  const handleUpdateApplication = async (id, patch) => {
    await updateApplication(id, patch)
    setApplications(await loadApplications())
  }

  const handleApply = async (application, job) => {
    if (job.application_url) {
      window.open(job.application_url, '_blank', 'noopener,noreferrer')
    }
    await setApplicationStatus(application.id, 'Applied')
    setApplications(await loadApplications())
  }

  const handleStatusChange = async (id, status) => {
    await setApplicationStatus(id, status)
    setApplications(await loadApplications())
  }

  const handleRemoveApplication = async (id) => {
    setApplications(await removeApplication(id))
  }

  const handleNavChange = (nextPage) => {
    setPage(nextPage)
    setSelectedJobId(null)
    setWorkspaceJobId(null)
  }

  const handleGoToDetail = (jobId) => setSelectedJobId(jobId)

  if (!authChecked) {
    return null
  }

  if (!authUser) {
    return <AuthPage onAuthenticated={handleAuthenticated} />
  }

  const allKnownJobs = [...jobs, ...savedJobsState.filter((sj) => !jobs.some((j) => j.id === sj.id))]
  const selectedJob = allKnownJobs.find((j) => j.id === selectedJobId) || null
  const selectedMatch = selectedJob
    ? jobMatches[selectedJobId] || selectedJob.matchResult || null
    : null

  const workspaceJob = allKnownJobs.find((j) => j.id === workspaceJobId) || null
  const workspaceMatch = workspaceJob
    ? jobMatches[workspaceJobId] || workspaceJob.matchResult || null
    : null
  const workspaceApplication = applications.find((a) => a.jobId === workspaceJobId) || null

  return (
    <>
      <Header apiOnline={apiOnline} themeMode={themeMode} onCycleTheme={cycleTheme} user={authUser} onSignOut={handleSignOut} />
      <Nav page={page} onChange={handleNavChange} isAdmin={authUser.is_admin} />

      <main className="page">
        {workspaceJob && workspaceApplication ? (
          <ApplicationWorkspace
            job={workspaceJob}
            matchResult={workspaceMatch}
            application={workspaceApplication}
            onUpdate={handleUpdateApplication}
            onApply={handleApply}
            onBack={() => setWorkspaceJobId(null)}
          />
        ) : selectedJobId ? (
          <JobDetailView
            job={selectedJob}
            matchResult={selectedMatch}
            hasCv={Boolean(cvFile)}
            isSaved={savedJobsState.some((j) => j.id === selectedJobId)}
            preferences={preferences}
            onBack={() => setSelectedJobId(null)}
            onToggleSave={handleToggleSave}
            onPrepareApplication={handleOpenWorkspace}
            onGoToAnalyze={() => {
              setPage('analyze')
              setSelectedJobId(null)
            }}
          />
        ) : (
          <>
            {page === 'home' && (
              <HomePage
                jobs={jobs}
                matches={jobMatches}
                applications={applications}
                savedCount={savedJobsState.length}
                onOpenDetail={handleGoToDetail}
                onGoTo={setPage}
              />
            )}

            {page === 'analyze' && (
              <AnalyzePage
                apiUrl={API_URL}
                cvFile={cvFile}
                onCvFileChange={setCvFile}
                onApiOnlineChange={setApiOnline}
                suggestedJobs={jobs}
                suggestedMatches={jobMatches}
                savedJobIds={new Set(savedJobsState.map((j) => j.id))}
                onToggleSave={handleToggleSave}
                onOpenDetail={handleGoToDetail}
                onGoToFind={() => setPage('find')}
              />
            )}

            {page === 'find' && (
              <FindInternshipsPage
                apiUrl={API_URL}
                cvFile={cvFile}
                jobs={jobs}
                matches={jobMatches}
                isDemo={isDemoProvider}
                loading={jobsLoading}
                error={jobsError}
                onSearch={handleSearchJobs}
                onOpenDetail={handleGoToDetail}
                savedJobIds={new Set(savedJobsState.map((j) => j.id))}
                onToggleSave={handleToggleSave}
                preferences={preferences}
                onSavePreferences={async (next) => {
                  setPreferences(next)
                  await savePreferences(next)
                }}
              />
            )}

            {page === 'saved' && (
              <SavedPage
                savedJobs={savedJobsState}
                onOpenDetail={handleGoToDetail}
                onRemove={async (id) => setSavedJobsState(await removeSavedJob(id))}
              />
            )}

            {page === 'applications' && (
              <ApplicationsPage
                applications={applications}
                onStatusChange={handleStatusChange}
                onRemove={handleRemoveApplication}
              />
            )}

            {page === 'admin' && authUser.is_admin && <AdminPage currentUserId={authUser.id} />}
          </>
        )}
      </main>
    </>
  )
}
