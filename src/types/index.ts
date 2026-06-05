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
  /** Client-compressed base64 JPEG (~80×80 px). Present only when the user has uploaded a photo. */
  avatarUrl?: string | null
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
  /** Original posting date at the source (Adzuna / JSearch / HR submission).
   *  Null for rows ingested before V15 — use createdAt as fallback. */
  postedAt?: string | null
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
  /** Enriched seeker-profile fields — present only on HR applicant responses */
  headline?: string
  yearsExperience?: number
  skills?: string
  visaStatus?: string
  cvUrl?: string
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

export interface AdminUser {
  id: number
  email: string
  userType: UserType
  verified?: boolean
  createdAt?: string
  displayName?: string | null
  phone?: string | null
  country?: string | null
  lastLogin?: string | null
}

export interface UserRow {
  id: number
  email: string
  userType: string
  verified: boolean
  createdAt: string | null
  lastLogin: string | null
}

export interface CountryCount {
  country: string
  count: number
}

export interface LoginHealthToday {
  attempts: number
  successes: number
  failures: number
  successRate: number
  /** Maps LoginFailureReason name → count, e.g. { INVALID_PASSWORD: 12, USER_NOT_FOUND: 3 } */
  failureBreakdown: Record<string, number>
}

export interface FrictionSignal {
  userId: number
  email: string
  userType: string
  /** REPEATED_FAILURES | EMPLOYER_INACTIVE | VERIFIED_NEVER_LOGIN | STUCK_PENDING_LONG */
  signalType: string
  /** HIGH | MEDIUM | LOW */
  severity: string
  message: string
  daysSinceCreated: number
  failedLoginAttempts24h: number
  /** RESET_PASSWORD | SEND_WELCOME | RESEND_VERIFICATION | REVIEW */
  suggestedAction: string
}

export interface UserActivityStats {
  totalUsers: number
  verifiedUsers: number
  pendingUsers: number
  activeToday: number
  activeLast7Days: number
  activeLast30Days: number
  neverLoggedIn: number
  newLast7Days: number
  newLast30Days: number
  activeSessions: number
  stuckPending: UserRow[]
  recentSignups: UserRow[]
  neverReturned: UserRow[]
  topCountries: CountryCount[]
  loginHealthToday: LoginHealthToday
}

export interface IngestRunLog {
  id: number
  source: string
  keyword?: string | null
  fetched: number
  rejectedHard: number
  rejectedScore: number
  duplicatesL1: number
  duplicatesL2: number
  duplicatesL3: number
  inserted: number
  error?: string | null
  startedAt: string
  finishedAt?: string | null
}

export interface IngestStatus {
  running: boolean
  recent: IngestRunLog[]
}

// ── Hiring-companies directory ────────────────────────────────────────────
export type HiringCompanyStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type HiringActivity = 'ACTIVE_HIRING' | 'FREQUENT_HIRING' | 'OCCASIONAL'

/** Public-facing payload — no PII, no moderation fields. */
export interface HiringCompany {
  id: number
  name: string
  slug: string
  category: string | null
  city: string | null
  careersUrl: string
  websiteUrl: string | null
  description: string | null
  techFocus: string | null
  hiringStatus: HiringActivity
  featured: boolean
  urlVerified: boolean
}

/** Admin-only payload — adds moderation queue + audit fields. */
export interface HiringCompanyAdmin extends HiringCompany {
  status: HiringCompanyStatus
  rejectionReason: string | null
  submittedByEmail: string | null
  createdAt: string
  approvedAt: string | null
}

export interface HiringCompanyFilters {
  cities: string[]
  categories: string[]
}

/** Body for POST /companies/submit — minimal per product spec. */
export interface HiringCompanySubmitBody {
  name: string
  careersUrl: string
}

/** Body for PATCH/approval — every field optional. */
export interface HiringCompanyPatchBody {
  name?: string
  category?: string | null
  city?: string | null
  careersUrl?: string
  websiteUrl?: string | null
  description?: string | null
  techFocus?: string | null
  hiringStatus?: HiringActivity
  featured?: boolean
  urlVerified?: boolean
}
