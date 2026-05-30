import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useToastStore } from '../components/Toast'
import { useAuthStore } from '../store/authStore'
import type { AdminUser, Application, ApplicationStatus, AuthResponse, HRProfile, IngestStatus, Job, JobRequest, JobSeekerProfile, Page, UserType } from '../types'

const configuredApiUrl = import.meta.env.VITE_API_URL

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

function apiBaseUrl(value: string) {
  const normalized = stripTrailingSlash(value.trim())
  return normalized.endsWith('/api/v1') ? normalized : `${normalized}/api/v1`
}

export const API_URL = configuredApiUrl ? stripTrailingSlash(configuredApiUrl.trim()) : ''
export const API_BASE_URL = API_URL ? apiBaseUrl(API_URL) : '/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // Required so the browser sends the httpOnly refresh_token cookie on
  // cross-origin requests (production: same domain via nginx; dev: see README).
  withCredentials: true,
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Token-refresh de-duplication ─────────────────────────────────────────────
// When the 15-min access token expires, every in-flight request receives 401
// simultaneously. Without this guard each would fire its own /auth/refresh,
// instantly exhausting the 5 req/min auth rate-limit bucket (thundering herd).
// The shared promise ensures only ONE refresh call is in-flight at a time;
// all other waiting requests reuse the same resolved token.
let refreshPromise: Promise<string> | null = null

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status   = error.response?.status
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

    if (status === 401 && original && !original._retry && !original.url?.includes('/auth/refresh') && !original.url?.includes('/auth/logout')) {
      original._retry = true
      try {
        if (!refreshPromise) {
          // Primary: the refresh_token httpOnly cookie is sent automatically.
          // Legacy fallback: if the user still has a token in localStorage from
          // a pre-cookie session, send it in the body so they don't get logged
          // out on first page load after the upgrade. The backend accepts both.
          const legacyToken = localStorage.getItem('uaeitjobs.refreshToken')
          const body = legacyToken ? { refreshToken: legacyToken } : undefined
          refreshPromise = api
            .post<AuthResponse>('/auth/refresh', body)
            .then(({ data }) => {
              // One-time migration: clear the legacy localStorage token now that
              // the backend has issued a new cookie.
              if (legacyToken) localStorage.removeItem('uaeitjobs.refreshToken')
              useAuthStore.getState().setSession(data)
              return data.accessToken
            })
            .finally(() => { refreshPromise = null })
        }
        const newToken = await refreshPromise
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        useAuthStore.getState().logout()
        useToastStore.getState().add({
          type: 'info',
          title: 'Session expired',
          message: 'Please log in again to continue.',
        })
      }
    }
    return Promise.reject(error)
  },
)

export function fieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) return {}
  const data = error.response?.data as { fieldErrors?: unknown; errors?: unknown } | undefined
  const candidate = data?.fieldErrors ?? data?.errors
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return {}
  return Object.fromEntries(
    Object.entries(candidate as Record<string, unknown>)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
}

export function statusCode(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}

export function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; error?: string } | undefined
    if (error.response?.status === 429) return data?.error ?? 'Too many requests. Please try again shortly.'
    return data?.message ?? data?.error ?? error.message
  }
  return error instanceof Error ? error.message : 'Something went wrong'
}

// ── Filter params type for multi-select backend filtering ──────────────────────
export interface FilterMultiParams {
  q?: string
  company?: string
  emirate?: string[]
  category?: string[]
  experienceLevel?: string[]
  jobType?: string[]
  remoteUae?: boolean
  immediateJoiner?: boolean
  postedAfter?: string
  salaryMin?: number
  salaryMax?: number
  sort?: string
  publisher?: string[]
  page?: number
  size?: number
}

export const authApi = {
  register: (payload: { email: string; password: string; userType: UserType; phone?: string; country?: string }) =>
    api.post('/auth/register', payload),
  login: (payload: { email: string; password: string }) => api.post<AuthResponse>('/auth/login', payload),
  verifyEmail: (token: string) => api.post('/auth/verify-email', { token }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) => api.post('/auth/reset-password', { token, newPassword }),
  // Refresh token is in the httpOnly cookie — no body needed.
  refresh: () => api.post<AuthResponse>('/auth/refresh'),
  // Logout revokes the cookie server-side — no token arg needed.
  logout: () => api.post('/auth/logout'),
}

export const jobsApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => api.get<Page<Job>>('/jobs', { params }),
  detail: (id: string | number) => api.get<Job>(`/jobs/${id}`),
  search: (q: string, page = 0, size = 20) => api.get<Page<Job>>('/jobs/search', { params: { q, page, size } }),
  filter: (params: Record<string, string | number | boolean | undefined>) => api.get<Page<Job>>('/jobs/filter', { params }),
  /** Multi-select filter — all array dimensions are sent as repeated query params. */
  filterMulti: (params: FilterMultiParams) => {
    // Axios serializes arrays as repeated params: ?emirate=dubai&emirate=abu_dhabi
    return api.get<Page<Job>>('/jobs/filter', {
      params,
      paramsSerializer: { indexes: null }, // prevents bracket notation: emirate[0]=...
    })
  },
  locations: () => api.get<string[]>('/locations'),
  skills: (q: string) => api.get<string[]>('/skills/autocomplete', { params: { q } }),
  stats: () => api.get<{ totalJobs: number; countriesRepresented: number; companies: number }>('/stats'),
  /** Job boards that have more than minCount active jobs (default 5).
   *  Used by the Browse page Source filter so new boards appear automatically. */
  publishers: (minCount = 5) =>
    api.get<{ key: string; label: string; count: number }[]>('/jobs/publishers', {
      params: { minCount },
    }),
}

export const seekerApi = {
  profile: () => api.get<JobSeekerProfile>('/job-seeker/profile'),
  saveProfile: (payload: JobSeekerProfile) => api.post<JobSeekerProfile>('/job-seeker/profile', payload),
  uploadCv: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<JobSeekerProfile>('/job-seeker/cv', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  updateSkills: (skills: string) => api.patch<JobSeekerProfile>('/job-seeker/skills', { skills }),
  apply: (payload: { jobId: number; coverLetter?: string }) => api.post<Application>('/applications', payload),
  applications: (page = 0, size = 20) => api.get<Page<Application>>('/applications', { params: { page, size } }),
  savedJobs: () => api.get<Array<{ id: number; job: Job; savedAt: string }>>('/saved-jobs'),
  saveJob: (id: number) => api.post(`/saved-jobs/${id}`),
  unsaveJob: (id: number) => api.delete(`/saved-jobs/${id}`),
}

export const hrApi = {
  profile: () => api.get<HRProfile>('/hr/profile'),
  saveProfile: (payload: HRProfile) => api.post<HRProfile>('/hr/profile', payload),
  jobs: (page = 0, size = 20) => api.get<Page<Job>>('/hr/jobs', { params: { page, size } }),
  createJob: (payload: JobRequest) => api.post<Job>('/jobs', payload),
  updateJob: (id: number, payload: JobRequest) => api.patch<Job>(`/jobs/${id}`, payload),
  deleteJob: (id: number) => api.delete(`/jobs/${id}`),
  applicants: (jobId: number, page = 0, size = 20) => api.get<Page<Application>>(`/hr/jobs/${jobId}/applicants`, { params: { page, size } }),
  updateApplication: (id: number, status: ApplicationStatus) => api.patch<Application>(`/applications/${id}`, { status }),
  importLinkedIn: (linkedInUrl: string) => api.post<Job>('/linkedin-import', { linkedInUrl }),
  /** Preview-only: fetch and parse a job URL. Never saves. Returns partial data for JS-rendered pages. */
  importPreview: (url: string) => api.post<{
    title: string | null
    companyName: string | null
    description: string | null
    locationUae: string | null
    applyUrl: string
    complete: boolean
    message: string | null
  }>('/hr/jobs/import-preview', { url }),
}

export const adminApi = {
  ingestStatus: (limit = 100) =>
    api.get<IngestStatus>('/admin/ingest/status', { params: { limit } }),
  runIngest: () =>
    api.post<{ status: string; message: string }>('/admin/ingest/run'),
  stats: () =>
    api.get<{ totalUsers: number; totalJobSeekers: number; totalHr: number; totalJobs: number; totalApplications: number; estimatedRevenue: number }>('/admin/stats'),
  users: (search?: string, page = 0, size = 20) =>
    api.get<Page<AdminUser>>('/admin/users', { params: { search, page, size } }),
  createUser: (payload: { email: string; password: string; userType: 'admin' | 'hr' | 'job_seeker' }) =>
    api.post<AdminUser>('/admin/users', payload),
  deleteUser: (id: number) =>
    api.delete(`/admin/users/${id}`),
  /** Archive a job (set is_active=false) or restore it (is_active=true). */
  setJobActive: (id: number, active: boolean) =>
    api.patch(`/admin/jobs/${id}/approve`, null, { params: { active } }),
  /** Admin job list — includes archived jobs, supports search + active filter. */
  jobs: (params: { q?: string; active?: boolean; page?: number; size?: number }) =>
    api.get<Page<Job>>('/admin/jobs', { params }),
  resendVerification: (id: number) =>
    api.post(`/admin/users/${id}/resend-verification`),
}
