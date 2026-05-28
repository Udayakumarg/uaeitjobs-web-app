/**
 * GulfTalent scraper — uses plain HTTP + cheerio (no headless browser needed).
 * GulfTalent serves SSR HTML to regular HTTP clients, which is far simpler
 * and more reliable than trying to pass Cloudflare's headless detection.
 */
import axios from 'axios'
import * as cheerio from 'cheerio'
import { ScrapedJob } from '../types'

const SEARCH_SLUGS = [
  'software-engineer',
  'full-stack-developer',
  'devops-engineer',
  'data-engineer',
  'backend-developer',
  'frontend-developer',
  'mobile-developer',
  'cloud-engineer',
  'qa-engineer',
  'cybersecurity',
  'it-manager',
  'solution-architect',
]

const MAX_PAGES = parseInt(process.env.MAX_PAGES ?? '3', 10)
const BASE = 'https://www.gulftalent.com'

const http = axios.create({
  timeout: 20_000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  },
})

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

function inferEmirate(text: string): string | undefined {
  const t = (text ?? '').toLowerCase()
  if (t.includes('dubai'))          return 'dubai'
  if (t.includes('abu dhabi'))      return 'abu_dhabi'
  if (t.includes('sharjah'))        return 'sharjah'
  if (t.includes('ajman'))          return 'ajman'
  if (t.includes('ras al khaimah')) return 'ras_al_khaimah'
  if (t.includes('fujairah'))       return 'fujairah'
  return undefined
}

function parseDate(text: string): string | undefined {
  try {
    const d = new Date(text)
    if (!isNaN(d.getTime())) return d.toISOString().substring(0, 10)
  } catch { /* ignore */ }
  return undefined
}

function jobIdFromHref(href: string): string | null {
  const m = href.match(/-(\d{4,})(?:\/|$)/)
  return m ? m[1] : null
}

async function fetchPage(slug: string, pageNum: number): Promise<ScrapedJob[]> {
  const url = pageNum === 1
    ? `${BASE}/uae/jobs/title/${slug}`
    : `${BASE}/uae/jobs/title/${slug}/${pageNum}`

  const { data: html, status } = await http.get<string>(url)
  if (status !== 200) {
    console.warn(`  [gulftalent] HTTP ${status} — ${url} (IP may be blocked)`)
    return []
  }

  const $ = cheerio.load(html)
  const jobs: ScrapedJob[] = []

  // Job cards: anchor tags linking to job detail pages
  // WebFetch showed: <a href="/mobile/uae/jobs/software-engineer-ii-580329">
  $('a[href*="/uae/jobs/"]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    if (!href.match(/\/uae\/jobs\/[a-z].*-\d+/)) return  // must end with -ID

    const jobId = jobIdFromHref(href)
    if (!jobId) return

    const title    = $(el).find('h3').text().trim() || $(el).find('h2').text().trim()
    const ps       = $(el).find('p')
    const company  = ps.eq(0).text().trim() || 'Unknown'
    const location = ps.eq(1).text().trim() || 'United Arab Emirates'
    const dateText = ps.eq(2).text().trim()

    if (!title) return

    const cleanHref = href.replace('/mobile/', '/')
    const applyUrl  = cleanHref.startsWith('http') ? cleanHref : `${BASE}${cleanHref}`

    jobs.push({
      externalId: jobId,
      title,
      company,
      description: `${title} at ${company} in ${location}`,
      location: location.includes('AE') ? location : `${location}, AE`,
      emirate: inferEmirate(location),
      applyUrl,
      publisher: 'GulfTalent',
      postedAt: dateText ? parseDate(dateText) : undefined,
    })
  })

  return jobs
}

export async function scrapeGulfTalent(): Promise<ScrapedJob[]> {
  const seen = new Set<string>()
  const jobs: ScrapedJob[] = []

  for (const slug of SEARCH_SLUGS) {
    for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
      console.log(`  [gulftalent] "${slug}" p${pageNum}`)
      try {
        const page = await fetchPage(slug, pageNum)
        let newCount = 0
        for (const job of page) {
          if (!seen.has(`gulftalent_${job.externalId}`)) {
            seen.add(`gulftalent_${job.externalId}`)
            jobs.push(job)
            newCount++
          }
        }
        console.log(`  [gulftalent] "${slug}" p${pageNum}: +${newCount}`)
        if (newCount === 0) break
        await sleep(600)
      } catch (err) {
        console.warn(`  [gulftalent] "${slug}" p${pageNum} error:`, (err as Error).message)
        break
      }
    }
  }

  console.log(`  [gulftalent] total: ${jobs.length}`)
  return jobs
}
