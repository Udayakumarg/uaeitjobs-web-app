/**
 * LinkedIn scraper — three-layer extraction strategy:
 *
 *   Layer 1 — JSON-LD  (most stable; LinkedIn injects JobPosting schema for SEO)
 *   Layer 2 — Voyager API interception  (LinkedIn's internal REST API; captures
 *             the exact JSON payload the SPA renders from — zero HTML parsing)
 *   Layer 3 — Semantic DOM fallbacks  (aria-label, itemprop, data-* attrs;
 *             avoids fragile class names that change with every deploy)
 *
 * Discovery uses LinkedIn's guest job-search endpoint which returns SSR HTML,
 * avoiding the need for full SPA rendering just to get a list of job IDs.
 * Detail pages are then fetched individually so we get the richest possible data.
 */
import type { Page, BrowserContext, Route, Request } from 'playwright'
import { ScrapedJob } from '../types'
import { delayWithJitter } from '../utils/delay'
import { ensureLinkedInSession } from '../utils/linkedin-session'

// ─── Config ───────────────────────────────────────────────────────────────────

const SEARCH_TERMS = [
  'software engineer UAE',
  'full stack developer Dubai',
  'devops engineer UAE',
  'data engineer UAE',
  'backend developer Dubai',
  'frontend developer UAE',
  'cloud engineer UAE',
  'QA engineer UAE',
  'cybersecurity UAE',
  'mobile developer UAE',
  'solution architect UAE',
  'IT manager UAE',
]

const MAX_PAGES    = parseInt(process.env.MAX_PAGES    ?? '3',  10)
const MAX_DETAIL   = parseInt(process.env.LI_MAX_DETAIL ?? '50', 10) // cap detail fetches per run

// ─── Internal types ───────────────────────────────────────────────────────────

interface JobLd {
  title?:             string
  description?:      string
  datePosted?:        string
  employmentType?:    string
  identifier?:        { value?: string | number }
  hiringOrganization?:{ name?: string; sameAs?: string }
  jobLocation?:       LdLocation | LdLocation[]
  applicantLocationRequirements?: { name?: string } | { name?: string }[]
}
interface LdLocation {
  address?: {
    addressLocality?: string
    addressRegion?:   string
    addressCountry?:  string
  }
}

interface VoyagerJob {
  title?:            string
  description?:      { text?: string }
  listedAt?:         number
  formattedLocation?: string
  workplaceTypes?:   string[]
  employmentStatus?: string
  companyDetails?:   { company?: { name?: string; universalName?: string } }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function scrapeLinkedIn(context: BrowserContext): Promise<ScrapedJob[]> {
  await ensureLinkedInSession(context)

  const page  = await context.newPage()
  const seen  = new Set<string>()
  const jobIds: string[] = []

  // Intercept Voyager API responses — collected passively while we browse
  const voyagerCache = new Map<string, VoyagerJob>()
  await page.route('**/voyager/api/jobs/jobPostings/**', async (route: Route, req: Request) => {
    const resp = await route.fetch()
    try {
      const json = await resp.json() as Record<string, unknown>
      const id   = req.url().match(/jobPostings\/(\d+)/)?.[1]
      if (id && json) voyagerCache.set(id, json as VoyagerJob)
    } catch { /* non-JSON response */ }
    await route.fulfill({ response: resp })
  })

  // ── Phase 1: Discover job IDs ──────────────────────────────────────────────
  for (const term of SEARCH_TERMS) {
    for (let pg = 0; pg < MAX_PAGES; pg++) {
      const start = pg * 25
      const url   = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(term)}&location=United+Arab+Emirates&f_TPR=r604800&start=${start}`
      console.log(`  [linkedin] Discovering: "${term}" page ${pg + 1}`)

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
        await delayWithJitter(page, 2_500)

        // Extract job IDs from data-entity-urn or data-job-id attributes
        const ids = await page.evaluate(() => {
          const found: string[] = []

          // Primary: data-entity-urn="urn:li:jobPosting:1234567"
          document.querySelectorAll('[data-entity-urn*="jobPosting"]').forEach(el => {
            const urn = el.getAttribute('data-entity-urn') ?? ''
            const id  = urn.split(':').pop()
            if (id && /^\d+$/.test(id)) found.push(id)
          })

          // Fallback: data-job-id="1234567"
          document.querySelectorAll('[data-job-id]').forEach(el => {
            const id = el.getAttribute('data-job-id') ?? ''
            if (/^\d+$/.test(id)) found.push(id)
          })

          // Fallback: job detail links /jobs/view/1234567
          document.querySelectorAll('a[href*="/jobs/view/"]').forEach(el => {
            const m = (el as HTMLAnchorElement).href.match(/\/jobs\/view\/(\d+)/)
            if (m) found.push(m[1])
          })

          return [...new Set(found)]
        })

        let newOnPage = 0
        for (const id of ids) {
          if (!seen.has(id)) { seen.add(id); jobIds.push(id); newOnPage++ }
        }

        console.log(`  [linkedin] "${term}" page ${pg + 1}: +${newOnPage} IDs (total ${jobIds.length})`)
        if (newOnPage === 0) break

        await delayWithJitter(page, 2_000)
      } catch (err) {
        console.warn(`  [linkedin] Discovery failed for "${term}" page ${pg + 1}:`, (err as Error).message)
        break
      }
    }
  }

  console.log(`\n  [linkedin] Discovery complete — ${jobIds.length} unique job IDs`)

  // ── Phase 2: Extract job details ──────────────────────────────────────────
  const jobs: ScrapedJob[] = []
  const toFetch = jobIds.slice(0, MAX_DETAIL)

  for (let i = 0; i < toFetch.length; i++) {
    const id  = toFetch[i]
    const url = `https://www.linkedin.com/jobs/view/${id}/`

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      await delayWithJitter(page, 1_800)

      // Expand "See more" on description so full text is in DOM
      const seeMore = await page.$('button.show-more-less-html__button--more, [aria-label*="see more"], button[data-tracking-control-name*="description"]')
      if (seeMore) {
        await seeMore.click().catch(() => {})
        await page.waitForTimeout(600)
      }

      const html    = await page.content()
      const voyager = voyagerCache.get(id)  // may be populated by interceptor

      const job = parseJob(id, url, html, voyager)
      if (job) {
        jobs.push(job)
        if ((i + 1) % 10 === 0) console.log(`  [linkedin] Extracted ${i + 1}/${toFetch.length}`)
      }

      // Polite inter-request delay — LinkedIn is aggressive about rate limiting
      await delayWithJitter(page, 2_500)
    } catch (err) {
      console.warn(`  [linkedin] Detail fetch failed for ${id}:`, (err as Error).message)
    }
  }

  await page.close()
  console.log(`  [linkedin] Total scraped: ${jobs.length}`)
  return jobs
}

// ─── Parsing pipeline ─────────────────────────────────────────────────────────

/**
 * Attempt extraction in priority order:
 *   1. Voyager API JSON (if the interceptor captured it)
 *   2. JSON-LD <script> block
 *   3. Semantic DOM fallbacks via inline page evaluation
 */
function parseJob(
  id: string,
  url: string,
  html: string,
  voyager?: VoyagerJob,
): ScrapedJob | null {
  try {
    // ── Layer 1: Voyager API data ──────────────────────────────────────────
    if (voyager) {
      const job = fromVoyager(id, url, voyager)
      if (job) return job
    }

    // ── Layer 2: JSON-LD ──────────────────────────────────────────────────
    const ld = extractJsonLd(html)
    if (ld) {
      const job = fromJsonLd(id, url, ld)
      if (job) return job
    }

    // ── Layer 3: DOM fallbacks (parse from HTML string) ───────────────────
    return fromDom(id, url, html)
  } catch (err) {
    console.warn(`  [linkedin] Parse error for ${id}:`, (err as Error).message)
    return null
  }
}

// ─── Layer 1: Voyager API ────────────────────────────────────────────────────

function fromVoyager(id: string, url: string, v: VoyagerJob): ScrapedJob | null {
  const title = v.title?.trim()
  if (!title) return null

  const company  = v.companyDetails?.company?.name ?? 'Unknown'
  const rawLoc   = v.formattedLocation ?? 'United Arab Emirates'
  const location = normaliseLocation(rawLoc)
  const desc     = v.description?.text?.trim() ?? title
  const postedAt = v.listedAt ? new Date(v.listedAt).toISOString().substring(0, 10) : undefined
  const jobType  = mapEmploymentType(v.employmentStatus)
  const remote   = (v.workplaceTypes ?? []).some(wt => wt.toLowerCase().includes('remote'))

  return {
    externalId: id,
    title,
    company,
    description: desc,
    location,
    emirate: inferEmirate(rawLoc),
    applyUrl: url,
    publisher: 'LinkedIn',
    postedAt,
    jobType,
    remoteUae: remote,
  }
}

// ─── Layer 2: JSON-LD ────────────────────────────────────────────────────────

function extractJsonLd(html: string): JobLd | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  for (const m of html.matchAll(re)) {
    try {
      const parsed = JSON.parse(m[1])
      const node   = Array.isArray(parsed)
        ? parsed.find((n: Record<string, unknown>) => n['@type'] === 'JobPosting')
        : parsed
      if (node?.['@type'] === 'JobPosting') return node as JobLd
    } catch { /* malformed block */ }
  }
  return null
}

function fromJsonLd(id: string, url: string, ld: JobLd): ScrapedJob | null {
  const title = ld.title?.trim()
  if (!title) return null

  const company = ld.hiringOrganization?.name ?? 'Unknown'

  // jobLocation can be object or array
  const locNode  = Array.isArray(ld.jobLocation) ? ld.jobLocation[0] : ld.jobLocation
  const rawCity  = locNode?.address?.addressLocality
              ?? locNode?.address?.addressRegion
              ?? 'United Arab Emirates'
  const location = normaliseLocation(rawCity)

  // Strip inline HTML tags from the description LinkedIn embeds in JSON-LD
  const rawDesc  = ld.description?.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim() ?? title
  const postedAt = ld.datePosted?.substring(0, 10)
  const jobType  = mapEmploymentType(ld.employmentType)

  return {
    externalId: id,
    title,
    company,
    description: rawDesc,
    location,
    emirate: inferEmirate(rawCity),
    applyUrl: url,
    publisher: 'LinkedIn',
    postedAt,
    jobType,
    remoteUae: isRemote(ld),
  }
}

function isRemote(ld: JobLd): boolean {
  const reqs = ld.applicantLocationRequirements
  if (!reqs) return false
  const arr = Array.isArray(reqs) ? reqs : [reqs]
  return arr.some(r => r.name?.toLowerCase().includes('remote'))
}

// ─── Layer 3: Semantic DOM fallbacks ─────────────────────────────────────────
// Works from the raw HTML string using regex — no live DOM required.
// Targets stable semantic attributes: data-*, aria-label, itemprop, og:*

function fromDom(id: string, url: string, html: string): ScrapedJob | null {
  // og:title often contains "Company hiring Title in Location | LinkedIn"
  const ogTitle    = metaContent(html, 'og:title')
  const metaDesc   = metaContent(html, 'og:description')
  const pageTitle  = /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1] ?? ''

  // Title: h1 inside article/header, or og:title stripped of company prefix
  const h1         = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1]?.replace(/<[^>]+>/g, '').trim()
  const title      = h1 || stripLinkedInTitleSuffix(ogTitle) || stripLinkedInTitleSuffix(pageTitle)
  if (!title) return null

  // Company: itemprop="name" inside [itemprop="hiringOrganization"] or topcard link
  const company    = itempropText(html, 'hiringOrganization', 'name')
               ?? anchorText(html, 'topcard__org-name-link')
               ?? 'Unknown'

  // Location: topcard bullet (confirmed working from live HTML inspection)
  const rawLoc     = spanWithClass(html, 'topcard__flavor--bullet')
               ?? metaLocalityFromOgTitle(ogTitle || pageTitle)
               ?? 'United Arab Emirates'
  const location   = normaliseLocation(rawLoc)

  // Description: largest text block with class containing "description"
  const desc       = largestDescriptionBlock(html) ?? metaDesc ?? title

  // Posted date: datePosted itemprop or time[datetime]
  const postedAt   = itempropAttr(html, 'datePosted')
               ?? timeAttr(html)

  return {
    externalId: id,
    title,
    company,
    description: desc,
    location,
    emirate: inferEmirate(rawLoc),
    applyUrl: url,
    publisher: 'LinkedIn',
    postedAt: postedAt?.substring(0, 10),
    remoteUae: rawLoc.toLowerCase().includes('remote'),
  }
}

// ─── DOM helpers (regex-based, no live browser required) ──────────────────────

function metaContent(html: string, prop: string): string {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${escRe(prop)}["'][^>]+content=["']([^"']+)["']`, 'i')
  return re.exec(html)?.[1]?.trim() ?? ''
}

function itempropText(html: string, scope: string, prop: string): string | null {
  // Find [itemprop="scope"] block, then [itemprop="prop"] text inside it
  const scopeRe = new RegExp(`itemprop=["']${escRe(scope)}["'][\\s\\S]*?itemprop=["']${escRe(prop)}["'][^>]*>([^<]+)<`, 'i')
  const m = scopeRe.exec(html)
  return m ? m[1].trim() : null
}

function itempropAttr(html: string, prop: string): string | null {
  const re = new RegExp(`itemprop=["']${escRe(prop)}["'][^>]+content=["']([^"']+)["']`, 'i')
  return re.exec(html)?.[1]?.trim() ?? null
}

function anchorText(html: string, cls: string): string | null {
  const re = new RegExp(`<a[^>]+class=["'][^"']*${escRe(cls)}[^"']*["'][^>]*>\\s*([^<]+)\\s*<`, 'i')
  return re.exec(html)?.[1]?.trim() ?? null
}

function spanWithClass(html: string, cls: string): string | null {
  const re = new RegExp(`<span[^>]+class=["'][^"']*${escRe(cls)}[^"']*["'][^>]*>\\s*([^<]+)\\s*<`, 'i')
  return re.exec(html)?.[1]?.trim() ?? null
}

function timeAttr(html: string): string | null {
  return /<time[^>]+datetime=["']([^"']+)["']/.exec(html)?.[1]?.trim() ?? null
}

function largestDescriptionBlock(html: string): string | null {
  // Find all divs/sections whose class contains "description"
  const re  = /<(?:div|section)[^>]+class=["'][^"']*description[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section)>/gi
  let best  = ''
  for (const m of html.matchAll(re)) {
    const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim()
    if (text.length > best.length) best = text
  }
  return best.length > 50 ? best : null
}

// Extract location from LinkedIn's standard og:title format:
// "Company hiring Role in CITY, Country | LinkedIn"
function metaLocalityFromOgTitle(ogTitle: string): string | null {
  const m = /\bin\s+([A-Za-z\s,]+?)(?:\s*\||$)/.exec(ogTitle)
  if (!m) return null
  // Strip the trailing "| LinkedIn" noise
  return m[1].replace(/\s*\|.*$/, '').trim() || null
}

function stripLinkedInTitleSuffix(t: string): string {
  // "Company hiring Role in City | LinkedIn" → "Role in City"
  // or just "Role | LinkedIn" → "Role"
  return t.replace(/\s*\|\s*LinkedIn\s*$/i, '').replace(/^[^|]+hiring\s+/i, '').trim()
}

function escRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')
}

// ─── Shared normalisation helpers ─────────────────────────────────────────────

function inferEmirate(text: string): string | undefined {
  const t = (text ?? '').toLowerCase().replace(/-/g, ' ')
  if (t.includes('abu dhabi'))       return 'abu_dhabi'
  if (t.includes('ras al khaimah'))  return 'ras_al_khaimah'
  if (t.includes('umm al quwain'))   return 'umm_al_quwain'
  if (t.includes('dubai'))           return 'dubai'
  if (t.includes('sharjah'))         return 'sharjah'
  if (t.includes('ajman'))           return 'ajman'
  if (t.includes('fujairah'))        return 'fujairah'
  return undefined
}

/**
 * Strips country suffixes and normalises to "City, AE" format.
 * Keeps the raw string intact when it doesn't match a known pattern.
 */
function normaliseLocation(raw: string): string {
  const cleaned = raw
    .replace(/,?\s*(United Arab Emirates|UAE)\s*$/i, '')
    .replace(/-/g, ' ')
    .trim()
  return cleaned ? `${cleaned}, AE` : 'United Arab Emirates, AE'
}

function mapEmploymentType(et?: string): string {
  if (!et) return 'full_time'
  const u = et.toUpperCase()
  if (u.includes('PART'))       return 'part_time'
  if (u.includes('CONTRACT'))   return 'contract'
  if (u.includes('INTERN'))     return 'internship'
  return 'full_time'
}
