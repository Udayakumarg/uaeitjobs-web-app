import { Page } from 'playwright'
import { ScrapedJob } from '../types'

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
  // NaukriGulf job URLs end in a numeric ID: /job-title-12345678
  const m = url.match(/[/-](\d{5,})(?:[/?#]|$)/)
  return m ? m[1] : null
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
        await page.waitForTimeout(2000)

        // Job cards: .ni-job-tuple or .jobTuple
        const cards = await page.$$('.ni-job-tuple, .jobTuple, [data-job-id]')
        if (cards.length === 0) {
          console.log(`  [naukrigulf] No cards found — stopping for "${term}"`)
          break
        }

        let newOnPage = 0
        for (const card of cards) {
          try {
            // Job ID — prefer data attribute, fall back to URL extraction
            let jobId = await card.getAttribute('data-job-id')

            // Title & URL
            const titleEl = await card.$('a.title, .jobtitle a, h3 a, h2 a, .ni-job-tuple-title a')
            if (!titleEl) continue
            const title = (await titleEl.innerText()).trim()
            const href = await titleEl.getAttribute('href')
            if (!title || !href) continue

            const applyUrl = href.startsWith('http') ? href : `https://www.naukrigulf.com${href}`
            if (!jobId) jobId = extractJobId(applyUrl)
            if (!jobId || seen.has(`naukrigulf_${jobId}`)) continue
            seen.add(`naukrigulf_${jobId}`)

            // Company
            const companyEl = await card.$('.comp-name, .company-name, a.company, [data-automation="company"]')
            const company = companyEl ? (await companyEl.innerText()).trim() : 'Unknown'

            // Location
            const locEl = await card.$('.loc, .location, .ni-job-tuple-icon-srp-loc, [data-automation="location"]')
            const location = locEl ? (await locEl.innerText()).trim() : 'United Arab Emirates'

            // Description
            const descEl = await card.$('.job-description, .jd-desc, .ni-job-tuple-desc, p')
            const description = descEl ? (await descEl.innerText()).trim() : title

            // Posted date
            const dateEl = await card.$('time, .posted-date, [datetime], .ni-job-tuple-posted-date')
            const postedAt = dateEl
              ? (await dateEl.getAttribute('datetime') ?? await dateEl.innerText())?.trim().substring(0, 10)
              : undefined

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
        await page.waitForTimeout(1000)
      } catch (err) {
        console.warn(`  [naukrigulf] "${term}" p${pageNum} failed:`, (err as Error).message)
        break
      }
    }
  }

  console.log(`  [naukrigulf] total scraped: ${jobs.length}`)
  return jobs
}
