export type UserType = 'job_seeker' | 'hr' | 'admin'
export type ApplicationStatus = 'applied' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired'

export interface User {
  id: number
  email: string
  displayName?: string | null
  userType: UserType
  phone?: string | null
  country?: string | null
  verified?: boolean
  createdAt?: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface Page<T> {
  content: T[]
  totalPages: number
  totalElements: number
  number: number
  size: number
}

export type VisaType =
  | 'free_visa'
  | 'own_visa'
  | 'visit_visa_accepted'
  | 'employment_visa'
export type Emirate =
  | 'dubai'
  | 'abu_dhabi'
  | 'sharjah'
  | 'ajman'
  | 'fujairah'
  | 'ras_al_khaimah'
  | 'umm_al_quwain'

export interface Job {
  id: number
  slug?: string
  title: string
  companyName: string
  description: string
  requirements?: string
  salaryMin?: number | null
  salaryMax?: number | null
  salaryCurrency?: string
  jobType?: string
  experienceLevel?: string
  locationUae?: string
  skills?: string
  linkedinUrl?: string
  source?: string
  createdAt?: string
  updatedAt?: string
  expiresAt?: string
  featured?: boolean
  active?: boolean
  viewCount?: number
  visaType?: VisaType | null
  emirate?: Emirate | null
  immediateJoiner?: boolean
  remoteUae?: boolean
}

export interface JobRequest {
  title: string
  companyName: string
  description: string
  requirements?: string
  salaryMin?: number | null
  salaryMax?: number | null
  salaryCurrency?: string
  jobType?: string
  experienceLevel?: string
  locationUae?: string
  skills?: string
  linkedinUrl?: string
  featured?: boolean
  expiresAt?: string
  visaType?: VisaType | null
  emirate?: Emirate | null
  immediateJoiner?: boolean
  remoteUae?: boolean
}

export interface Application {
  id: number
  job?: Job
  applicant?: User
  coverLetter?: string
  appliedAt?: string
  status: ApplicationStatus
}

export interface JobSeekerProfile {
  id?: number
  cvUrl?: string
  headline?: string
  summary?: string
  yearsExperience?: number
  visaStatus?: string
  skills?: string
  experience?: string
  education?: string
}

export interface HRProfile {
  id?: number
  companyName: string
  companyLogoUrl?: string
  website?: string
  industry?: string
  subscriptionTier?: string
}
