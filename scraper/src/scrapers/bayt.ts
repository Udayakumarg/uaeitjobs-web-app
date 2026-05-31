import { Page } from 'playwright'
import { ScrapedJob } from '../types'
import { delayWithJitter } from '../utils/delay'

// UAE IT search terms for Bayt
const SEARCH_TERMS = [
  'software engineer UAE',
  'full stack developer Dubai',
  'devops engineer UAE',
  'data engineer UAE',
  'backend developer Dubai',
  'frontend developer UAE',
  'mobile developer UAE',
  'cloud engineer UAE',
  'QA engineer Dubai',
  'cybersecurity UAE',
]

const MAX_PAGES = parseInt(process.env.MAX_PAGES ?? '3', 10)

function extractJobId(url: string): string | null {
  // Bayt job URLs: /en/uae/jobs/some-title-12345678/ — grab the trailing number
  const m = url.match(/[-/](\d{6,})(?:[/?]|$)/)
  return m ? m[1] : null
}

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

export async function scrapeBayt(page: Page): Promise<ScrapedJob[]> {
  const seen = new Set<string>()
  const jobs: ScrapedJob[] = []

  for (const term of SEARCH_TERMS) {
    for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
      const url = `https://www.bayt.com/en/uae/jobs/?q=${encodeURIComponent(term)}&l=United+Arab+Emirates&start=${(pageNum - 1) * 20}`
      console.log(`  [bayt] "${term}" p${pageNum} → ${url}`)

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })

        // Human-like reading pause after page load (2–4 s)
        await delayWithJitter(page, 3_000)

        // Each job card is an <li> with data-js-job attribute
        const cards = await page.$$('li[data-js-job]')
        if (cards.length === 0) {
          console.log(`  [bayt] No cards found — stopping pagination for "${term}"`)
          break
        }

        let newOnPage = 0
        for (const card of cards) {
          try {
            // Job ID from data attribute (most stable identifier)
            const jobId = await card.getAttribute('data-js-job')
            if (!jobId || seen.has(`bayt_${jobId}`)) continue
            seen.add(`bayt_${jobId}`)

            // Title & apply URL
            const titleEl = await card.$('h2 a, .jb-title a, [data-automation-id="job-title"] a, h2')
            if (!titleEl) continue
            const title = (await titleEl.innerText()).trim()
            const href = await titleEl.getAttribute('href')
            if (!title || !href) continue
            const applyUrl = href.startsWith('http') ? href : `https://www.bayt.com${href}`

            // Company
            const companyEl = await card.$('.t-default, .jb-company, [data-automation-id="company-name"]')
            const company = companyEl ? (await companyEl.innerText()).trim() : 'Unknown'

            // Location
            const locEl = await card.$('.t-mute, .jb-location, [data-automation-id="job-location"]')
            const location = locEl ? (await locEl.innerText()).trim() : 'United Arab Emirates'

            // Description snippet (listing page only — no detail page visits to save time)
            const descEl = await card.$('.jb-description, .t-small.is-black, p')
            const description = descEl ? (await descEl.innerText()).trim() : title

            // Posted date
            const dateEl = await card.$('time, .t-mute.t-xsmall, [datetime]')
            const postedAt = dateEl ? await dateEl.getAttribute('datetime') ?? undefined : undefined

            jobs.push({
              externalId: jobId,
              title,
              company,
              description: description || title,
              location: `${location}, AE`,
              emirate: inferEmirate(location),
              applyUrl,
              publisher: 'Bayt',
              postedAt: postedAt?.substring(0, 10),
              remoteUae: location.toLowerCase().includes('remote'),
            })
            newOnPage++
          } catch {
            // Skip malformed card silently
          }
        }

        console.log(`  [bayt] "${term}" p${pageNum}: +${newOnPage} jobs`)
        if (newOnPage === 0) break  // No new jobs — stop paginating this term

        // Inter-page jitter: 1.5–3.5 s (shorter than initial load pause)
        await delayWithJitter(page, 2_000)
      } catch (err) {
        console.warn(`  [bayt] "${term}" p${pageNum} failed:`, (err as Error).message)
        break
      }
    }
  }

  // Use extractJobId to silence the "unused" lint warning (it's a fallback utility)
  void extractJobId

  console.log(`  [bayt] total scraped: ${jobs.length}`)
  return jobs
}
