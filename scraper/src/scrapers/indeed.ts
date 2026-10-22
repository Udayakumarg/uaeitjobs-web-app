import { Page } from 'playwright'
import { ScrapedJob } from '../types'
import { delayWithJitter } from '../utils/delay'
import { blockHtmlToText } from '../utils/html'
import { inferEmirate } from '../utils/location'

/**
 * Indeed sits behind Cloudflare Bot Management, not a simple UA-string WAF
 * rule (that's GulfTalent's kind of block — see gulftalent.ts). Verified
 * live 2026-08: plain HTTP (axios/curl, any header combo) gets an immediate
 * 403 with a `__cf_bm` cookie in the response — that requires a JS
 * challenge no plain client can pass. A stealth Playwright browser does
 * pass it initially, but the block escalates: after roughly half a dozen
 * requests in a short window it started serving a full interactive
 * "Security Check" interstitial that no headless browser can solve either.
 *
 * There is no way to make this fully reliable without a residential proxy
 * or a paid CAPTCHA-solving service (same category of fix Bayt would need —
 * a cost decision for the user, not something to silently add). Until then
 * this runs deliberately small: a handful of broad search terms, a single
 * page each, one broad location, generous jitter between requests. Some
 * runs will legitimately return 0 jobs if the block is already warmed up
 * from other activity on this IP — that's expected, not a bug to chase.
 *
 * The detail page (indeed.com/viewjob?jk=...) is blocked independently of
 * the search page and was 403/401 on every header combination tested — so,
 * same as LinkedIn's card-only default, this is card-only: title/company/
 * location is enough to clear RelevanceScorer.MIN_SCORE for a recognisably
 * IT-domain title.
 *
 * NOT the same as GulfTalent, despite the comparison this comment used to
 * draw — re-verified live 2026-08 that GulfTalent's detail page is NOT
 * blocked (plain HTTP, same technique as its search page, real 200 with a
 * full description). Indeed's block is specific to Indeed.
 *
 * Update 2026-10: a normal interactive browser session loads the detail page
 * with no challenge and exposes the full posting as `JobPosting` JSON-LD
 * (verified live — ~7k-char description plus salary). So detail enrichment is
 * attempted, but conservatively and only as a best effort: it runs AFTER all
 * searches (so it can't disturb them), is capped per run, waits long between
 * pages, never retries, and stops for the rest of the run at the first block
 * page. It does not try to get past a challenge — a blocked run simply keeps
 * the card-only description, exactly as before.
 */

// Kept deliberately short — every entry here is one more HTTP request this
// run makes, and each request adds to the same Cloudflare reputation score
// that eventually trips the interactive challenge. Broad enough terms to
// still cover most IT sub-domains without a long tail of near-duplicate
// searches the way the other scrapers can afford to run.
const SEARCH_TERMS = [
  'software engineer',
  'devops engineer',
  'data engineer',
]

// A single broad location, not a per-emirate loop — verified live that
// `l=United Arab Emirates` returns 0 (unrecognised), `l=Dubai` returns
// real UAE-wide results (Indeed's location filter is looser than it looks;
// most non-Dubai UAE roles still surface under a Dubai search).
const LOCATION = 'Dubai'

const MAX_PAGES = 1

/** Upper bound on detail-page visits per run; every request adds to the block score. */
const MAX_DETAIL = parseInt(process.env.INDEED_MAX_DETAIL ?? '12', 10)
const BASE = 'https://ae.indeed.com'

/** "AED 8,000 - 12,000 a month" -> {min, max, currency}. Best-effort only — salary is absent on most cards. */
function parseSalary(text: string | null): { min?: number; max?: number; currency?: string } {
  if (!text) return {}
  const currency = /aed/i.test(text) ? 'AED' : /\$|usd/i.test(text) ? 'USD' : undefined
  // The card selector this feeds from falls back to Indeed's generic
  // attribute chip, which also carries shift length / contract type text —
  // "8 hour shift" used to be parsed into salaryMin/Max: 8 and published as
  // a real salary. Require an actual salary signal (currency marker, a
  // thousands-formatted number, or a "a/per year|month|hour|day" pay-rate
  // suffix) before treating any digits in the text as a salary figure.
  const looksLikeSalary = Boolean(currency)
    || /\d,\d{3}/.test(text)
    || /\b(?:a|per)\s*(?:year|month|hour|day)\b/i.test(text)
  if (!looksLikeSalary) return {}
  const nums = text.replace(/,/g, '').match(/\d+(?:\.\d+)?/g)
  if (!nums || nums.length === 0) return { currency }
  const values = nums.map(Number)
  return { min: Math.min(...values), max: Math.max(...values), currency }
}

async function fetchPage(page: Page, term: string, start: number): Promise<ScrapedJob[]> {
  const url = `${BASE}/jobs?q=${encodeURIComponent(term)}&l=${encodeURIComponent(LOCATION)}&start=${start}`
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })

  if (resp && resp.status() === 403) {
    console.warn(`  [indeed] "${term}" start=${start}: blocked (403) — Cloudflare challenge, aborting this term`)
    return []
  }

  const gotCards = await page
    .waitForSelector('td.resultContent', { timeout: 10_000 })
    .then(() => true)
    .catch(() => false)

  if (!gotCards) {
    console.log(`  [indeed] "${term}" start=${start}: no cards rendered`)
    return []
  }

  await delayWithJitter(page, 2_000)

  const rows = await page.$$eval('td.resultContent', cells =>
    cells.map(cell => {
      const jkAnchor = cell.querySelector('a[data-jk]')
      const jk = jkAnchor?.getAttribute('data-jk') ?? null
      const href = jkAnchor?.getAttribute('href') ?? null
      const title = cell.querySelector('span[title]')?.getAttribute('title')
        ?? cell.querySelector('h2')?.textContent?.trim()
        ?? null
      const company = cell.querySelector('[data-testid="company-name"]')?.textContent?.trim() ?? null
      const location = cell.querySelector('[data-testid="text-location"]')?.textContent?.trim() ?? null
      const salary = cell.querySelector('.salary-snippet-container, [data-testid="attribute_snippet_testid"]')?.textContent?.trim() ?? null
      return { jk, href, title, company, location, salary }
    })
  )

  const jobs: ScrapedJob[] = []
  for (const row of rows) {
    if (!row.jk || !row.title || !row.href) continue

    const company  = row.company || 'Unknown'
    const location = row.location || 'United Arab Emirates'
    const { min, max, currency } = parseSalary(row.salary)

    jobs.push({
      externalId: row.jk,
      title: row.title,
      company,
      description: `${row.title} at ${company} in ${location}`,
      location: location.includes('AE') || /UAE|Emirates/i.test(location) ? location : `${location}, AE`,
      emirate: inferEmirate(location),
      applyUrl: row.href.startsWith('http') ? row.href : `${BASE}${row.href}`,
      publisher: 'Indeed',
      salaryMin: min,
      salaryMax: max,
      salaryCurrency: currency,
    })
  }

  return jobs
}

const BLOCK_MARKERS = ['security check', 'just a moment', 'verify you are human', 'access denied', 'captcha', 'unusual traffic']

interface IndeedDetail {
  description: string
  salaryMin?: number
  salaryMax?: number
  salaryCurrency?: string
}

/**
 * Runs inside the page: returns the JobPosting JSON-LD fields we use, or null.
 * No closures — Playwright serialises it.
 */
export function readJobPostingInPage(): { description: string; min?: number; max?: number; currency?: string } | null {
  for (const node of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
    try {
      const data = JSON.parse(node.textContent ?? '')
      for (const item of Array.isArray(data) ? data : [data]) {
        if (item && item['@type'] === 'JobPosting' && typeof item.description === 'string') {
          const value = item.baseSalary?.value
          return {
            description: item.description,
            min: typeof value?.minValue === 'number' ? value.minValue : undefined,
            max: typeof value?.maxValue === 'number' ? value.maxValue : undefined,
            currency: typeof item.baseSalary?.currency === 'string' ? item.baseSalary.currency : undefined,
          }
        }
      }
    } catch {
      /* ignore malformed JSON-LD */
    }
  }
  return null
}

/** 'blocked' tells the caller to stop visiting detail pages for the rest of the run. */
async function fetchDetail(page: Page, jk: string): Promise<IndeedDetail | 'blocked' | null> {
  try {
    const resp = await page.goto(`${BASE}/viewjob?jk=${encodeURIComponent(jk)}`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    const title = (await page.title()).toLowerCase()
    if ((resp && [401, 403, 429].includes(resp.status())) || BLOCK_MARKERS.some(m => title.includes(m))) return 'blocked'

    const posting = await page.evaluate(readJobPostingInPage)
    if (!posting) return null
    const description = blockHtmlToText(posting.description)
    if (description.length < 120) return null
    return { description, salaryMin: posting.min, salaryMax: posting.max, salaryCurrency: posting.currency }
  } catch (err) {
    console.warn(`  [indeed] detail fetch error for ${jk}:`, (err as Error).message)
    return null
  }
}

/** Best-effort enrichment of card-only jobs. Mutates `jobs`; never throws. */
async function enrichWithDetail(page: Page, jobs: ScrapedJob[]): Promise<void> {
  const targets = jobs.slice(0, MAX_DETAIL)
  let enriched = 0
  let stoppedBy: string | null = null
  for (const job of targets) {
    const result = await fetchDetail(page, job.externalId)
    if (result === 'blocked') {
      stoppedBy = 'block page'
      break
    }
    if (result) {
      job.description = result.description
      if (job.salaryMin == null && result.salaryMin != null) {
        job.salaryMin = result.salaryMin
        job.salaryMax = result.salaryMax
        job.salaryCurrency = result.salaryCurrency ?? job.salaryCurrency
      }
      enriched++
    }
    // Long, human-scale gap — this is the most block-sensitive source.
    await delayWithJitter(page, 6_000)
  }
  console.log(
    `  [indeed] full descriptions: ${enriched}/${targets.length} attempted` +
    (stoppedBy ? ` — stopped early on ${stoppedBy}; remaining jobs keep the card-only description` : ''),
  )
}

export async function scrapeIndeed(page: Page): Promise<ScrapedJob[]> {
  const seen = new Set<string>()
  const jobs: ScrapedJob[] = []

  for (const term of SEARCH_TERMS) {
    for (let pageNum = 0; pageNum < MAX_PAGES; pageNum++) {
      const start = pageNum * 10
      console.log(`  [indeed] "${term}" start=${start}`)
      try {
        const results = await fetchPage(page, term, start)
        let newCount = 0
        for (const job of results) {
          const key = `indeed_${job.externalId}`
          if (!seen.has(key)) {
            seen.add(key)
            jobs.push(job)
            newCount++
          }
        }
        console.log(`  [indeed] "${term}" start=${start}: +${newCount}`)
      } catch (err) {
        console.warn(`  [indeed] "${term}" start=${start} error:`, (err as Error).message)
      }
      // Long, human-scale gap between requests — this source is the most
      // block-sensitive one in the pipeline, so it gets the widest jitter.
      await delayWithJitter(page, 5_000)
    }
  }

  if (MAX_DETAIL > 0 && jobs.length > 0) await enrichWithDetail(page, jobs)

  console.log(`  [indeed] total: ${jobs.length}`)
  return jobs
}
