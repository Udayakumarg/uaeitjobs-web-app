/**
 * The query matrix.
 *
 * LinkedIn's guest search truncates every individual query at roughly 25-30
 * pages (~280 results), so no single search can enumerate the market. Coverage
 * comes from breadth instead: each keyword is run against each location, and
 * the union is deduplicated by job id.
 *
 * Locations are listed separately from "United Arab Emirates" on purpose — a
 * per-emirate search surfaces listings that the country-wide search truncates
 * away, so the overlap is worth the extra requests.
 */

/** Roles, stacks and specialisms that make up the UAE tech market. */
const DEFAULT_KEYWORDS = [
  // Core engineering
  'software engineer',
  'senior software engineer',
  'full stack developer',
  'backend developer',
  'frontend developer',
  'web developer',
  'mobile developer',
  'ios developer',
  'android developer',
  'embedded engineer',
  // Platform and infrastructure
  'devops engineer',
  'site reliability engineer',
  'cloud engineer',
  'cloud architect',
  'platform engineer',
  'infrastructure engineer',
  'system administrator',
  'network engineer',
  'kubernetes engineer',
  // Data and AI
  'data engineer',
  'data scientist',
  'data analyst',
  'machine learning engineer',
  'ai engineer',
  'business intelligence developer',
  'database administrator',
  // Quality and security
  'qa engineer',
  'test automation engineer',
  'cybersecurity engineer',
  'security analyst',
  'penetration tester',
  // Product and delivery
  'product manager technology',
  'technical project manager',
  'scrum master',
  'business analyst it',
  // Enterprise and leadership
  'solution architect',
  'enterprise architect',
  'it manager',
  'engineering manager',
  'cto',
  // Named stacks — these surface postings whose titles omit the generic role
  'java developer',
  'python developer',
  'dotnet developer',
  'javascript developer',
  'react developer',
  'angular developer',
  'node js developer',
  'php developer',
  'salesforce developer',
  'sap consultant',
  'oracle developer',
  'erp consultant',
]

/**
 * Country-wide first, then each emirate. Al Ain is included as a distinct
 * search term because listings there are frequently labelled by city rather
 * than by its emirate, Abu Dhabi.
 */
const DEFAULT_LOCATIONS = [
  'United Arab Emirates',
  'Dubai',
  'Abu Dhabi',
  'Sharjah',
  'Ajman',
  'Ras Al Khaimah',
  'Fujairah',
  'Umm Al Quwain',
  'Al Ain',
]

export interface Query {
  keyword: string
  location: string
}

/**
 * Build the keyword x location matrix.
 *
 * Both dimensions are overridable so a run can be narrowed without a code
 * change — useful for testing a single keyword, or for a scheduled job that
 * sweeps a subset on rotation.
 */
export function buildQueries(): Query[] {
  const keywords = listEnv('LI_KEYWORDS') ?? DEFAULT_KEYWORDS
  const locations = listEnv('LI_LOCATIONS') ?? DEFAULT_LOCATIONS

  const queries: Query[] = []
  for (const keyword of keywords) {
    for (const location of locations) {
      queries.push({ keyword, location })
    }
  }
  return queries
}

const SEARCH_ENDPOINT = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search'
const DETAIL_ENDPOINT = 'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting'

/**
 * @param start Zero-based result offset. The endpoint returns 10 per call.
 */
export function searchUrl(query: Query, start: number): string {
  const params = new URLSearchParams({
    keywords: query.keyword,
    location: query.location,
    start: String(start),
  })
  // Optional recency window, e.g. r604800 for "past week". Unset means all time.
  const freshness = process.env.LI_FRESHNESS?.trim()
  if (freshness) params.set('f_TPR', freshness)

  return `${SEARCH_ENDPOINT}?${params.toString()}`
}

export function detailUrl(externalId: string): string {
  return `${DETAIL_ENDPOINT}/${externalId}`
}

/** Read a comma-separated env override, or null when unset/empty. */
function listEnv(name: string): string[] | null {
  const raw = process.env[name]?.trim()
  if (!raw) return null
  const values = raw.split(',').map(s => s.trim()).filter(Boolean)
  return values.length ? values : null
}
