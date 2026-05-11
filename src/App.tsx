import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import AccessDenied from './pages/AccessDenied'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import VerifyEmail from './pages/Auth/VerifyEmail'
import HRApplicants from './pages/HR/Applicants'
import HRDashboard from './pages/HR/Dashboard'
import LinkedInImport from './pages/HR/LinkedInImport'
import PostJob from './pages/HR/PostJob'
import JobSeekerApplications from './pages/JobSeeker/Applications'
import JobSeekerDashboard from './pages/JobSeeker/Dashboard'
import JobSeekerProfile from './pages/JobSeeker/Profile'
import SavedJobs from './pages/JobSeeker/SavedJobs'
import JobBrowse from './pages/Jobs/Browse'
import JobDetail from './pages/Jobs/Detail'
import Landing from './pages/Landing'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path="jobs" element={<JobBrowse />} />
            <Route path="jobs/:id" element={<JobDetail />} />
            <Route path="search" element={<JobBrowse />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="verify-email" element={<VerifyEmail />} />
            <Route path="access-denied" element={<AccessDenied />} />

            <Route element={<ProtectedRoute roles={['job_seeker']} />}>
              <Route path="seeker" element={<JobSeekerDashboard />} />
              <Route path="seeker/profile" element={<JobSeekerProfile />} />
              <Route path="seeker/applications" element={<JobSeekerApplications />} />
              <Route path="seeker/saved" element={<SavedJobs />} />
            </Route>

            <Route element={<ProtectedRoute roles={['hr']} />}>
              <Route path="hr" element={<HRDashboard />} />
              <Route path="hr/jobs/new" element={<PostJob />} />
              <Route path="hr/jobs/:id/edit" element={<PostJob />} />
              <Route path="hr/linkedin-import" element={<LinkedInImport />} />
              <Route path="hr/jobs/:id/applicants" element={<HRApplicants />} />
            </Route>

            <Route path="dashboard" element={<Navigate to="/seeker" replace />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
