import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useToastStore } from '../components/Toast'
import { useAuthStore } from '../store/authStore'
import type { Application, ApplicationStatus, AuthResponse, HRProfile, Job, JobRequest, JobSeekerProfile, Page, UserType } from '../types'

const configuredApiUrl = import.meta.env.VITE_API_URL

export const API_URL = configuredApiUrl ?? ''

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const refreshToken = useAuthStore.getState().refreshToken
    if (status === 401 && refreshToken && original && !original._retry && !original.url?.includes('/auth/refresh')) {
      original._retry = true
      try {
        const { data } = await api.post<AuthResponse>('/auth/refresh', { refreshToken })
        useAuthStore.getState().setSession(data)
        original.headers.Authorization = `Bearer ${data.accessToken}`
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

export const authApi = {
  register: (payload: { email: string; password: string; userType: UserType; phone?: string; country?: string }) =>
    api.post('/auth/register', payload),
  login: (payload: { email: string; password: string }) => api.post<AuthResponse>('/auth/login', payload),
  verifyEmail: (token: string) => api.post('/auth/verify-email', { token }),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
}

export const jobsApi = {
  list: (params?: Record<string, string | number | undefined>) => api.get<Page<Job>>('/jobs', { params }),
  detail: (id: string | number) => api.get<Job>(`/jobs/${id}`),
  search: (q: string, page = 0, size = 20) => api.get<Page<Job>>('/jobs/search', { params: { q, page, size } }),
  filter: (params: Record<string, string | number | undefined>) => api.get<Page<Job>>('/jobs/filter', { params }),
  locations: () => api.get<string[]>('/locations'),
  skills: (q: string) => api.get<string[]>('/skills/autocomplete', { params: { q } }),
  stats: () => api.get<{ totalJobs: number; countriesRepresented: number; companies: number }>('/stats'),
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
}
