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
export type JobCategory =
  | 'backend'
  | 'frontend'
  | 'fullstack'
  | 'mobile'
  | 'qa'
  | 'devops'
  | 'data_ml'
  | 'security'
  | 'product_design'
  | 'it_support'
  | 'other'

/** Render-ready definitions used by filter chips and badges. Order
 *  matters: this is the order pills appear in the UI. */
export const JOB_CATEGORIES: ReadonlyArray<{ value: JobCategory; label: string; emoji: string }> = [
  { value: 'backend', label: 'Backend', emoji: '🧱' },
  { value: 'frontend', label: 'Frontend', emoji: '🎨' },
  { value: 'fullstack', label: 'Full-stack', emoji: '🧩' },
  { value: 'mobile', label: 'Mobile', emoji: '📱' },
  { value: 'qa', label: 'QA & Testing', emoji: '🧪' },
  { value: 'devops', label: 'DevOps & SRE', emoji: '⚙️' },
  { value: 'data_ml', label: 'Data & ML', emoji: '📊' },
  { value: 'security', label: 'Security', emoji: '🔒' },
  { value: 'product_design', label: 'Product & Design', emoji: '🪄' },
  { value: 'it_support', label: 'IT & Infra', emoji: '🖥️' },
  { value: 'other', label: 'Other', emoji: '✨' },
]

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
  jobCategory?: JobCategory | null
  applyUrl?: string | null
  /** Structured description sections — JSON string of `[{heading, items[]}]`.
   *  Parse with `JSON.parse(job.descriptionSections)` when rendering. */
  descriptionSections?: string | null
  /** Pre-rendered, sanitised HTML — preferred renderer for descriptions. */
  descriptionHtml?: string | null
  /** Clearbit logo URL derived from the apply URL domain. May 404 for unknown companies — UI falls back to initials. */
  companyLogoUrl?: string | null
}

export interface DescriptionSection {
  heading: string
  items: string[]
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
  jobCategory?: JobCategory | null
  applyUrl?: string | null
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
