/**
 * GulfTalent scraper — uses plain HTTP + cheerio (no headless browser needed).
 * GulfTalent serves SSR HTML to regular HTTP clients.
 *
 * Verified live 2026-08: this is NOT a Cloudflare/WAF block the way Bayt is.
 * Isolated by testing one header at a time — a Chrome-spoofing User-Agent
 * triggers a 403 by itself regardless of any other header, while dropping
 * it entirely (no override — an honest non-browser identity) passes with a
 * 302 to a /mobile/ path, then 200. The WAF here specifically flags
 * "browser UA arriving over a simple HTTP client" as the suspicious
 * pattern, not "non-browser client" itself — the opposite of what the
 * previous Chrome-spoofing header was built to defeat.
 *
 * The /mobile/ redirect also changed the whole card markup (title/company/
 * location/date all moved to different classes with no more heading tags),
 * which independently explains why extraction found nothing even on runs
 * that got past the old 403.
 */
import axios from 'axios'
import * as cheerio from 'cheerio'
import { ScrapedJob } from '../types'
import { inferEmirate } from '../utils/location'

// Verified live against GulfTalent's actual title taxonomy 2026-08 — several
// of the original slugs (devops-engineer, data-engineer, frontend-developer,
// cybersecurity) now 404 outright; replaced with slugs the site currently
// serves for the same specialisms.
const SEARCH_SLUGS = [
  'software-engineer',
  'full-stack-developer',
  'devops',
  'data-scientist',
  'backend-developer',
  'front-end-developer',
  'mobile-developer',
  'cloud-engineer',
  'qa-engineer',
  'cyber-security',
  'it-manager',
  'solution-architect',
]

const MAX_PAGES = parseInt(process.env.MAX_PAGES ?? '3', 10)
const BASE = 'https://www.gulftalent.com'

const http = axios.create({
  timeout: 20_000,
  // No User-Agent override on purpose — see module docstring. Accept-only
  // is enough for the site to serve real content; this is a deliberate
  // non-browser identity, not an oversight.
  headers: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
  maxRedirects: 5,
})

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

/** GulfTalent's card date is plain text like "9 Jun 2026" — parses fine with the native Date constructor. */
function parseDate(text: string): string | undefined {
  try {
    const d = new Date(text)
    if (!isNaN(d.getTime())) return d.toISOString().substring(0, 10)
  } catch { /* ignore */ }
  return undefined
}

/** Fallback only — data-ga-label on the card is the real, stable ID; this covers the rare card missing it. */
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
    console.warn(`  [gulftalent] HTTP ${status} — ${url}`)
    return []
  }

  const $ = cheerio.load(html)
  const jobs: ScrapedJob[] = []

  // Verified live 2026-08 against the /mobile/ redirect target — card is the
  // anchor itself (data-cy="job-result-link"), not a wrapper around one.
  $('a[href*="/uae/jobs/"]').each((_, el) => {
    const card = $(el)
    const href = card.attr('href') ?? ''
    if (!href.match(/\/uae\/jobs\/[a-z].*-\d+/)) return  // must end with -ID

    const jobId = card.attr('data-ga-label') || jobIdFromHref(href)
    if (!jobId) return

    const title    = card.find('.title').first().text().trim()
    const company  = card.find('.company-name').first().text().trim() || 'Unknown'
    const location = card.find('.location').first().text().trim() || 'United Arab Emirates'
    const dateText = card.find('.date').first().text().trim()

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
