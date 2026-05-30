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
        // Intercept NaukriGulf's internal job-search API calls
        const apiJobs: ScrapedJob[] = []
        const captureHandler = async (response: import('playwright').Response) => {
          const rUrl = response.url()
          if (!rUrl.includes('naukrigulf') || !rUrl.includes('search')) return
          try {
            const json = await response.json()
            // NaukriGulf API typically returns { jobDetails: [...] } or similar
            const list: any[] = json?.jobDetails ?? json?.jobs ?? json?.data?.jobs ?? []
            for (const j of list) {
              const title = j.title ?? j.designation
              const jobId = String(j.jobId ?? j.id ?? '')
              const applyUrl = j.jdURL ?? j.applyUrl ?? `https://www.naukrigulf.com/job-${jobId}`
              if (!title || !jobId || seen.has(`naukrigulf_${jobId}`)) continue
              seen.add(`naukrigulf_${jobId}`)
              const company = j.companyName ?? j.company ?? 'Unknown'
              const location = j.location ?? j.city ?? 'United Arab Emirates'
              apiJobs.push({
                externalId: jobId,
                title,
                company,
                description: j.jobDescription ?? j.snippets ?? title,
                location: location.includes('AE') || location.toLowerCase().includes('emirates') ? location : `${location}, AE`,
                emirate: inferEmirate(location),
                applyUrl,
                publisher: 'NaukriGulf',
                postedAt: j.postedDate?.substring(0, 10),
                remoteUae: location.toLowerCase().includes('remote'),
              })
            }
            if (list.length > 0) {
              console.log(`  [naukrigulf] API intercepted ${list.length} jobs from ${rUrl.split('?')[0]}`)
              // Log first job keys to identify field names
              if (apiJobs.length === 0 && list.length > 0) {
                const sample = list[0]
                console.log(`  [naukrigulf] sample job keys: ${Object.keys(sample).join(', ')}`)
                console.log(`  [naukrigulf] sample: title=${sample.title ?? sample.designation}, snippets type=${typeof sample.snippets}`)
              }
            }
          } catch { /* not JSON or wrong format */ }
        }
        page.on('response', captureHandler)

        const resp = await page.goto(url, { waitUntil: 'load', timeout: 45_000 })
        await page.waitForTimeout(5000)
        page.off('response', captureHandler)
        console.log(`  [naukrigulf] HTTP ${resp?.status()} — API captured: ${apiJobs.length} jobs`)

        if (apiJobs.length > 0) {
          jobs.push(...apiJobs)
          console.log(`  [naukrigulf] "${term}" p${pageNum}: +${apiJobs.length} new (via API)`)
          await page.waitForTimeout(1000)
          continue
        }

        // Job cards: try multiple selector patterns
        const CARD_SELECTORS = [
          '.ni-job-tuple', '.jobTuple', '[data-job-id]',
          'article', '.job-card', '.job-listing', '.srp-jobtuple-wrapper',
          '[class*="jobTuple"]', '[class*="job-card"]', '[class*="JobCard"]',
          'li[class*="job"]', 'div[class*="job-item"]',
        ]
        let cards: Awaited<ReturnType<typeof page.$$>> = []
        let usedSel = ''
        for (const sel of CARD_SELECTORS) {
          cards = await page.$$(sel)
          if (cards.length > 0) { usedSel = sel; break }
        }

        if (cards.length === 0) {
          // Dump page HTML snippet for diagnosis
          const bodyHtml = await page.evaluate(() => document.body.innerHTML.substring(0, 3000))
          console.log(`  [naukrigulf] No cards — page HTML:\n${bodyHtml}`)
          break
        }
        console.log(`  [naukrigulf] Found ${cards.length} cards via: ${usedSel}`)
        if (pageNum === 1 && term === SEARCH_TERMS[0]) {
          const html = await cards[0].innerHTML()
          console.log(`  [naukrigulf] first card snippet:\n${html.substring(0, 600)}`)
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
