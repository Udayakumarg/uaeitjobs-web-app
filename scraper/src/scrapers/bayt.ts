import { Page } from 'playwright'
import { ScrapedJob } from '../types'
import * as fs from 'fs'
import * as path from 'path'

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

function inferEmirate(text: string): string | undefined {
  const t = text.toLowerCase()
  if (t.includes('dubai'))          return 'dubai'
  if (t.includes('abu dhabi'))      return 'abu_dhabi'
  if (t.includes('sharjah'))        return 'sharjah'
  if (t.includes('ajman'))          return 'ajman'
  if (t.includes('ras al khaimah')) return 'ras_al_khaimah'
  if (t.includes('fujairah'))       return 'fujairah'
  return undefined
}

async function debugDump(page: Page, label: string) {
  const dir = path.join(process.cwd(), 'debug')
  fs.mkdirSync(dir, { recursive: true })
  await page.screenshot({ path: path.join(dir, `${label}.png`), fullPage: false })
  fs.writeFileSync(path.join(dir, `${label}.html`), await page.content())
  console.log(`  [debug] saved debug/${label}.png + .html — open to inspect selectors`)
}

export async function scrapeBayt(page: Page): Promise<ScrapedJob[]> {
  const seen = new Set<string>()
  const jobs: ScrapedJob[] = []
  let debugDone = false

  for (const term of SEARCH_TERMS) {
    for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
      const url = `https://www.bayt.com/en/uae/jobs/?q=${encodeURIComponent(term)}&l=United+Arab+Emirates&start=${(pageNum - 1) * 20}`
      console.log(`  [bayt] "${term}" p${pageNum}`)

      try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
        console.log(`  [bayt] HTTP ${response?.status()} — ${page.url()}`)
        await page.waitForTimeout(2000)

        // Try multiple card selectors in order
        const CARD_SELECTORS = [
          'li[data-js-job]',
          '[data-job-id]',
          '.has-pointer-d',
          'li.is-default',
          '[data-automation-id="job-card"]',
          '.jb-job-item',
        ]

        let cards: Awaited<ReturnType<typeof page.$$>> = []
        let usedSelector = ''
        for (const sel of CARD_SELECTORS) {
          cards = await page.$$(sel)
          if (cards.length > 0) { usedSelector = sel; break }
        }

        if (cards.length === 0) {
          console.log(`  [bayt] No cards found with any selector`)
          if (!debugDone) { await debugDump(page, 'bayt-no-cards'); debugDone = true }
          break
        }
        console.log(`  [bayt] Found ${cards.length} cards via selector: ${usedSelector}`)

        let newOnPage = 0
        for (const card of cards) {
          try {
            // Extract job ID — try data attribute first, fall back to href slug
            let jobId = await card.getAttribute('data-js-job') ?? await card.getAttribute('data-job-id')

            const titleEl = await card.$('h2 a, .jb-title a, h3 a, a[data-js-aid="jobID"]')
            if (!titleEl) continue
            const title = (await titleEl.innerText()).trim()
            const href = await titleEl.getAttribute('href')
            if (!title || !href) continue

            // Fall back to extracting ID from the URL slug: /jobs/senior-accountant-5458959/
            if (!jobId) {
              const match = href.match(/-(\d{5,})(?:\/|$)/)
              jobId = match ? match[1] : null
            }
            if (!jobId || seen.has(`bayt_${jobId}`)) continue
            seen.add(`bayt_${jobId}`)

            const applyUrl = href.startsWith('http') ? href : `https://www.bayt.com${href}`

            const companyEl = await card.$('.t-default, .jb-company, [data-automation-id="company-name"], .company-name')
            const company = companyEl ? (await companyEl.innerText()).trim() : 'Unknown'

            const locEl = await card.$('.t-mute, .jb-location, .location, [data-automation-id="job-location"]')
            const location = locEl ? (await locEl.innerText()).trim() : 'United Arab Emirates'

            const descEl = await card.$('.jb-description, .t-small, p.description')
            const description = descEl ? (await descEl.innerText()).trim() : title

            const dateEl = await card.$('time, [datetime]')
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
          } catch { /* skip malformed card */ }
        }

        console.log(`  [bayt] "${term}" p${pageNum}: +${newOnPage} new`)
        if (newOnPage === 0) break
        await page.waitForTimeout(1000)
      } catch (err) {
        console.warn(`  [bayt] error:`, (err as Error).message.split('\n')[0])
        if (!debugDone) { await debugDump(page, 'bayt-error').catch(() => {}); debugDone = true }
        break
      }
    }
  }

  console.log(`  [bayt] total: ${jobs.length}`)
  return jobs
}
