export interface ScrapedJob {
  /** Source-stable unique ID — used for L1 dedup. Must not change between runs. */
  externalId: string
  title: string
  company: string
  description: string
  location: string
  emirate?: string
  applyUrl: string
  jobType?: string
  postedAt?: string   // ISO-8601 date e.g. "2024-01-25"
  salaryMin?: number
  salaryMax?: number
  salaryCurrency?: string
  remoteUae?: boolean
  publisher: string
  /**
   * LinkedIn's own Easy Apply flag: true when LinkedIn lets the candidate
   * apply without leaving LinkedIn, false when LinkedIn redirects to the
   * employer's site. Omit for every non-LinkedIn source.
   */
  linkedinEasyApply?: boolean
}

export interface IngestResult {
  source: string
  fetched: number
  inserted: number
  duplicates: number
  rejected: number
}
