import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'

import PublicLayout from './layouts/PublicLayout.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import { RedirectIfAuthed, RequireAdmin, RequireAuth, RequireRole } from './routes/Guards.jsx'

import LandingPage from './pages/LandingPage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import FeaturesPage from './pages/FeaturesPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'

import RecruiterDashboardPage from './pages/recruiter/RecruiterDashboardPage.jsx'
import JobsListPage from './pages/recruiter/JobsListPage.jsx'
import JobDetailPage from './pages/recruiter/JobDetailPage.jsx'
import CandidatesListPage from './pages/recruiter/CandidatesListPage.jsx'
import CandidateDetailPage from './pages/recruiter/CandidateDetailPage.jsx'
import MatchingPage from './pages/recruiter/MatchingPage.jsx'
import ShortlistsPage from './pages/recruiter/ShortlistsPage.jsx'
import AnalyticsPage from './pages/recruiter/AnalyticsPage.jsx'
import ReportsPage from './pages/recruiter/ReportsPage.jsx'

import CandidateDashboardPage from './pages/candidate/CandidateDashboardPage.jsx'
import ProfilePage from './pages/candidate/ProfilePage.jsx'
import ResumesPage from './pages/candidate/ResumesPage.jsx'
import MatchesPage from './pages/candidate/MatchesPage.jsx'

import SettingsPage from './pages/SettingsPage.jsx'
import AdminPage from './pages/AdminPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/login" element={<RedirectIfAuthed><LoginPage /></RedirectIfAuthed>} />
        <Route path="/signup" element={<RedirectIfAuthed><SignupPage /></RedirectIfAuthed>} />
        <Route path="/forgot-password" element={<RedirectIfAuthed><ForgotPasswordPage /></RedirectIfAuthed>} />
        <Route path="/reset-password" element={<RedirectIfAuthed><ResetPasswordPage /></RedirectIfAuthed>} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route element={<RequireRole role="recruiter" />}>
            <Route path="/dashboard" element={<RecruiterDashboardPage />} />
            <Route path="/jobs" element={<JobsListPage />} />
            <Route path="/jobs/:jobId" element={<JobDetailPage />} />
            <Route path="/candidates" element={<CandidatesListPage />} />
            <Route path="/candidates/:candidateId" element={<CandidateDetailPage />} />
            <Route path="/matching" element={<MatchingPage />} />
            <Route path="/shortlists" element={<ShortlistsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>

          <Route element={<RequireRole role="candidate" />}>
            <Route path="/candidate/dashboard" element={<CandidateDashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/resumes" element={<ResumesPage />} />
            <Route path="/matches" element={<MatchesPage />} />
          </Route>

          <Route path="/settings" element={<SettingsPage />} />

          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
