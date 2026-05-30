import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Layout } from './components/Layout'
import Loading from './components/Loading'
import { ProtectedRoute } from './components/ProtectedRoute'

const AccessDenied = lazy(() => import('./pages/AccessDenied'))
const Login = lazy(() => import('./pages/Auth/Login'))
const Register = lazy(() => import('./pages/Auth/Register'))
const VerifyEmail = lazy(() => import('./pages/Auth/VerifyEmail'))
const ForgotPassword = lazy(() => import('./pages/Auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/Auth/ResetPassword'))
const HRApplicants = lazy(() => import('./pages/HR/Applicants'))
const HRDashboard = lazy(() => import('./pages/HR/Dashboard'))
const LinkedInImport = lazy(() => import('./pages/HR/LinkedInImport'))
const PostJob = lazy(() => import('./pages/HR/PostJob'))
const JobSeekerApplications = lazy(() => import('./pages/JobSeeker/Applications'))
const JobSeekerDashboard = lazy(() => import('./pages/JobSeeker/Dashboard'))
const JobSeekerProfile = lazy(() => import('./pages/JobSeeker/Profile'))
const SavedJobs = lazy(() => import('./pages/JobSeeker/SavedJobs'))
const JobBrowse = lazy(() => import('./pages/Jobs/Browse'))
const JobDetail = lazy(() => import('./pages/Jobs/Detail'))
const Landing = lazy(() => import('./pages/Landing'))
const NotFound = lazy(() => import('./pages/NotFound'))
const IngestDashboard = lazy(() => import('./pages/Admin/IngestDashboard'))
const AdminJobs = lazy(() => import('./pages/Admin/AdminJobs'))
const AdminUsers = lazy(() => import('./pages/Admin/AdminUsers'))
const AdminActivity = lazy(() => import('./pages/Admin/AdminActivity'))
const Contact = lazy(() => import('./pages/Contact'))

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Landing />} />
              <Route path="jobs" element={<JobBrowse />} />
              <Route path="jobs/:id" element={<JobDetail />} />
              <Route path="search" element={<JobBrowse />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="verify-email" element={<VerifyEmail />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="reset-password" element={<ResetPassword />} />
              <Route path="contact" element={<Contact />} />
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

              <Route element={<ProtectedRoute roles={['admin']} />}>
                <Route path="admin/ingest" element={<IngestDashboard />} />
                <Route path="admin/jobs" element={<AdminJobs />} />
                <Route path="admin/users" element={<AdminUsers />} />
                <Route path="admin/activity" element={<AdminActivity />} />
              </Route>

              <Route path="dashboard" element={<Navigate to="/seeker" replace />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
