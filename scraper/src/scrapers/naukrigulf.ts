import { Page } from 'playwright'
import { ScrapedJob } from '../types'
import { delayWithJitter } from '../utils/delay'

const SEARCH_TERMS = [
  'software engineer',
  'full stack developer',
  'devops',
  'data engineer',
  'backend developer',
  'frontend developer',
  'mobile developer',
  'cloud engineer',
  'QA engineer',
  'cybersecurity',
]

const MAX_PAGES = parseInt(process.env.MAX_PAGES ?? '3', 10)

function inferEmirate(text: string): string | undefined {
  const t = text.toLowerCase()
  if (t.includes('dubai'))           return 'dubai'
  if (t.includes('abu dhabi'))       return 'abu_dhabi'
  if (t.includes('sharjah'))         return 'sharjah'
  if (t.includes('ajman'))           return 'ajman'
  if (t.includes('ras al khaimah'))  return 'ras_al_khaimah'
  if (t.includes('fujairah'))        return 'fujairah'
  if (t.includes('umm al quwain'))   return 'umm_al_quwain'
  return undefined
}

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

export async function scrapeNaukrigulf(page: Page): Promise<ScrapedJob[]> {
  const seen = new Set<string>()
  const jobs: ScrapedJob[] = []

  for (const term of SEARCH_TERMS) {
    for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
      const url = `https://www.naukrigulf.com/jobs-in-uae?q=${encodeURIComponent(term)}&city=United+Arab+Emirates&page=${pageNum}`
      console.log(`  [naukrigulf] "${term}" p${pageNum}`)

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
          console.log(`  [naukrigulf] No cards rendered — stopping for "${term}"`)
          break
        }

        // Human-like reading pause now that content is present.
        await delayWithJitter(page, 1_500)

        // Verified against live markup 2026-08 (site redesign since this was
        // last written — the previous selectors matched nothing).
        const cards = await page.$$('.srp-tuple')
        if (cards.length === 0) {
          console.log(`  [naukrigulf] No cards found — stopping for "${term}"`)
          break
        }

        let newOnPage = 0
        for (const card of cards) {
          try {
            // Title & URL — the job ID lives only in the URL (…-jid-220826001091),
            // there is no data-job-id attribute on this card any more.
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

            // Company
            const companyEl = await card.$('.info-org')
            const company = companyEl ? (await companyEl.innerText()).trim() : 'Unknown'

            // Location — e.g. "Sharjah - United Arab Emirates (UAE)"
            const locEl = await card.$('.info-loc')
            const location = locEl ? (await locEl.innerText()).trim() : 'United Arab Emirates'

            // Description snippet
            const descEl = await card.$('.description')
            const description = descEl ? (await descEl.innerText()).trim() : title

            // Posted time is relative text ("6 hrs ago"), not a datetime attribute
            const dateEl = await card.$('.time')
            const postedAt = dateEl ? parseRelativeTime((await dateEl.innerText()).trim()) : undefined

            jobs.push({
              externalId: jobId,
              title,
              company,
              description: description || title,
              location: location.includes('AE') || location.includes('Emirates') ? location : `${location}, AE`,
              emirate: inferEmirate(location),
              applyUrl,
              publisher: 'NaukriGulf',
              postedAt,
              remoteUae: location.toLowerCase().includes('remote'),
            })
            newOnPage++
          } catch {
            // Skip malformed card
          }
        }

        console.log(`  [naukrigulf] "${term}" p${pageNum}: +${newOnPage} jobs`)
        if (newOnPage === 0) break

        // Inter-page jitter: 1.5–3.5 s
        await delayWithJitter(page, 2_000)
      } catch (err) {
        console.warn(`  [naukrigulf] "${term}" p${pageNum} failed:`, (err as Error).message)
        break
      }
    }
  }

  console.log(`  [naukrigulf] total scraped: ${jobs.length}`)
  return jobs
}
