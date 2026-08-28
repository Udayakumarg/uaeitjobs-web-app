import { Page } from 'playwright'
import { ScrapedJob } from '../types'
import { delayWithJitter } from '../utils/delay'
import { inferEmirate } from '../utils/location'

// Verified live 2026-08: NaukriGulf's `/jobs-in-uae?q=...` query param is
// inert — it returns the same generic default listing regardless of what
// `q` is set to (confirmed by comparing "software engineer" against
// "baker chef pastry": identical results). The site's real search-by-role
// entry point is a slug path instead: `/{slug}-jobs`. This is why every
// run was fetching 30 "real" jobs that scored almost entirely below
// MIN_SCORE — they were NaukriGulf's generic feed, not IT results at all.
const SEARCH_SLUGS = [
  'software-engineer',
  'full-stack-developer',
  'devops',
  'data-engineer',
  'backend-developer',
  'frontend-developer',
  'mobile-developer',
  'cloud-engineer',
  'qa-engineer',
  'cybersecurity',
]

const MAX_PAGES = parseInt(process.env.MAX_PAGES ?? '3', 10)

function extractJobId(url: string): string | null {
  // NaukriGulf job URLs carry an explicit marker: .../job-title-...-jid-220826001091
  // Verified against live markup 2026-08 — matching the marker (not just any
  // trailing digit run) avoids latching onto the company ID that also
  // appears earlier in the same URL (…-cd-359633-jid-220826001091).
  const m = url.match(/-jid-(\d+)/)
  return m ? m[1] : null
}

/** "6 hrs ago" / "2 days ago" / "Just now" -> ISO date. Undefined if unparseable. */
function parseRelativeTime(text: string): string | undefined {
  const t = text.toLowerCase().trim()
  if (!t) return undefined
  if (t.includes('just now') || t.includes('today')) return new Date().toISOString().substring(0, 10)

  const m = /(\d+)\s*(hour|hr|day|week|month)/.exec(t)
  if (!m) return undefined
  const n = parseInt(m[1], 10)
  const unitMs: Record<string, number> = {
    hour: 3_600_000, hr: 3_600_000,
    day: 86_400_000, week: 604_800_000, month: 2_592_000_000,
  }
  const ms = unitMs[m[2]]
  if (!ms) return undefined
  return new Date(Date.now() - n * ms).toISOString().substring(0, 10)
}

interface Card {
  jobId: string
  title: string
  company: string
  location: string
  dateText: string
  applyUrl: string
  /** Card-level snippet — kept as the fallback if the detail-page fetch below fails. */
  snippet: string
}

/**
 * Fetches a job's own detail page and extracts the real description.
 *
 * Verified live 2026-08: NaukriGulf's detail pages are NOT blocked — same
 * stealth Playwright session already used for listing pages navigates
 * straight to a 200 with a rich `.job-description` block (there are
 * multiple `.job-description` elements per page — "Roles & Responsibilities"
 * and "Desired Candidate Profile" are separate blocks with the same class,
 * so all of them are joined rather than just the first). Returns null on
 * any failure so the caller can fall back to the card snippet instead of
 * dropping the job. Reuses the same shared `page` the listing scrape uses —
 * navigating away and back per job, not a second tab.
 */
async function fetchDetailDescription(page: Page, url: string): Promise<string | null> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    const found = await page
      .waitForSelector('.job-description', { timeout: 10_000 })
      .then(() => true)
      .catch(() => false)
    if (!found) return null

    const parts = await page.$$eval('.job-description', els =>
      els.map(el => (el as HTMLElement).innerText.trim()).filter(Boolean))
    const text = parts.join('\n\n').trim()
    return text.length >= 60 ? text : null
  } catch (err) {
    console.warn(`  [naukrigulf] detail fetch failed for ${url}:`, (err as Error).message)
    return null
  }
}

export async function scrapeNaukrigulf(page: Page): Promise<ScrapedJob[]> {
  const seen = new Set<string>()
  const jobs: ScrapedJob[] = []

  for (const slug of SEARCH_SLUGS) {
    for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
      // Page 1 has no numeric suffix; page 2+ is `-{slug}-jobs-{pageNum}`.
      // Verified live: `?page=N` on the base URL is inert (same trap as `q=`);
      // the `-N` suffix is what actually advances the result set.
      const url = pageNum === 1
        ? `https://www.naukrigulf.com/${slug}-jobs`
        : `https://www.naukrigulf.com/${slug}-jobs-${pageNum}`
      console.log(`  [naukrigulf] "${slug}" p${pageNum}`)

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })

        // NaukriGulf's listing is a client-rendered SPA — the DOM is a bare
        // <div id="root"> at domcontentloaded, so a fixed delay is a guess.
        // Wait for the real card class directly instead; treat a timeout as
        // "no results for this term" rather than a hard failure, since a
        // genuinely empty result set produces the same wait outcome.
        const gotCards = await page
          .waitForSelector('.srp-tuple', { timeout: 12_000 })
          .then(() => true)
          .catch(() => false)

        if (!gotCards) {
          console.log(`  [naukrigulf] No cards rendered — stopping for "${slug}"`)
          break
        }

        // Human-like reading pause now that content is present.
        await delayWithJitter(page, 1_500)

        // Verified against live markup 2026-08 (site redesign since this was
        // last written — the previous selectors matched nothing).
        const cardHandles = await page.$$('.srp-tuple')
        if (cardHandles.length === 0) {
          console.log(`  [naukrigulf] No cards found — stopping for "${slug}"`)
          break
        }

        // Pass 1: pull plain metadata out of the live card handles while still
        // on the listing page — these handles go stale the moment we navigate
        // away to fetch a detail page below, so nothing here can be deferred.
        const cards: Card[] = []
        for (const card of cardHandles) {
          try {
            const titleEl = await card.$('.designation-title')
            const linkEl  = await card.$('a.info-position')
            if (!titleEl || !linkEl) continue
            const title = (await titleEl.innerText()).trim()
            const href = await linkEl.getAttribute('href')
            if (!title || !href) continue

            const applyUrl = href.startsWith('http') ? href : `https://www.naukrigulf.com${href}`
            const jobId = extractJobId(applyUrl)
            if (!jobId || seen.has(`naukrigulf_${jobId}`)) continue
            seen.add(`naukrigulf_${jobId}`)

            const companyEl = await card.$('.info-org')
            const company = companyEl ? (await companyEl.innerText()).trim() : 'Unknown'

            // Location — e.g. "Sharjah - United Arab Emirates (UAE)"
            const locEl = await card.$('.info-loc')
            const location = locEl ? (await locEl.innerText()).trim() : 'United Arab Emirates'

            const dateEl = await card.$('.time')
            const dateText = dateEl ? (await dateEl.innerText()).trim() : ''

            const descEl = await card.$('.description')
            const snippet = descEl ? (await descEl.innerText()).trim() : ''

            cards.push({ jobId, title, company, location, dateText, applyUrl, snippet })
          } catch {
            // Skip malformed card
          }
        }

        // Pass 2: now that the listing page's data is safely extracted, visit
        // each new job's own detail page for the real description.
        for (const c of cards) {
          const detail = await fetchDetailDescription(page, c.applyUrl)
          await delayWithJitter(page, 1_200)

          jobs.push({
            externalId: c.jobId,
            title: c.title,
            company: c.company,
            description: detail ?? (c.snippet || c.title),
            location: c.location.includes('AE') || c.location.includes('Emirates') ? c.location : `${c.location}, AE`,
            emirate: inferEmirate(c.location),
            applyUrl: c.applyUrl,
            publisher: 'NaukriGulf',
            postedAt: c.dateText ? parseRelativeTime(c.dateText) : undefined,
            remoteUae: c.location.toLowerCase().includes('remote'),
          })
        }

        console.log(`  [naukrigulf] "${slug}" p${pageNum}: +${cards.length} jobs`)
        if (cards.length === 0) break

        // Inter-page jitter: 1.5–3.5 s
        await delayWithJitter(page, 2_000)
      } catch (err) {
        console.warn(`  [naukrigulf] "${slug}" p${pageNum} failed:`, (err as Error).message)
        break
      }
    }
  }

  console.log(`  [naukrigulf] total scraped: ${jobs.length}`)
  return jobs
}
