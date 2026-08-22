/**
 * LinkedIn scraper — guest-API strategy.
 *
 * Replaces the previous authenticated Playwright scraper, which aborted before
 * it ever reached discovery: it called ensureLinkedInSession() first, and a
 * dead li_at cookie threw straight out of the process. Because li_at expires
 * roughly monthly and could only be refreshed from a residential IP with a
 * Gmail OTP, that design failed on a timer.
 *
 * LinkedIn serves the same job data to anonymous clients over two guest
 * endpoints, so this needs no login, no browser, no cookie file and no proxy.
 *
 * Two phases:
 *   1. Discovery — walk the keyword x location matrix, collecting search cards.
 *      A card alone carries id, title, company, location, date and apply URL,
 *      which is already enough to persist a job. This is the phase nothing
 *      else in the system provides: both single-URL import endpoints need a
 *      human to paste one link.
 *   2. Detail — optional enrichment for full descriptions. Off by default;
 *      see FETCH_DETAIL below. Failures degrade a job, never drop it.
 *
 * Tunables (all optional):
 *   LI_CONCURRENCY   parallel queries / detail fetches   (default 4)
 *   LI_DELAY_MS      pause between requests in a query   (default 250)
 *   LI_MAX_PAGES     pages per query, 10 results each    (default 30)
 *   LI_BARREN_PAGES  duplicate pages before giving up    (default 3)
 *   LI_FETCH_DETAIL  "true" to also pull descriptions    (default off)
 *   LI_MAX_DETAIL    cap on detail fetches, 0 = no cap   (default 0)
 *   LI_KEYWORDS      comma-separated keyword override
 *   LI_LOCATIONS     comma-separated location override
 *   LI_FRESHNESS     e.g. r604800 to limit to the past week
 */
import { ScrapedJob } from '../../types'
import { ExhaustedError, fetchHtml, intEnv, mapWithConcurrency, sleep } from './client'
import { JobDetail, SearchCard, parseDetail, parseSearchCards, toScrapedJob } from './parse'
import { Query, buildQueries, detailUrl, searchUrl } from './queries'

const RESULTS_PER_PAGE = 10

const CONCURRENCY = Math.max(1, intEnv('LI_CONCURRENCY', 4))
const DELAY_MS = intEnv('LI_DELAY_MS', 250)
const MAX_PAGES = Math.max(1, intEnv('LI_MAX_PAGES', 30))
const MAX_DETAIL = intEnv('LI_MAX_DETAIL', 0)

/**
 * Detail enrichment is off by default.
 *
 * A search card alone is enough to persist a job: RelevanceScorer awards 40
 * points for a tech-domain title, which is exactly MIN_SCORE, and hardReject
 * only needs a UAE location — which the card carries. Descriptions therefore
 * buy listing quality and skill extraction, not insertion.
 *
 * Leaving it off also avoids duplicating LinkedInScraperService, which already
 * does this parsing server-side for the single-URL import endpoints.
 */
const FETCH_DETAIL = process.env.LI_FETCH_DETAIL === 'true'

/** Consecutive all-duplicate pages tolerated before a query is abandoned. */
const BARREN_PAGE_LIMIT = Math.max(1, intEnv('LI_BARREN_PAGES', 3))

/**
 * Set on SIGINT/SIGTERM so both phases wind down at the next checkpoint and
 * the caller still receives everything collected so far.
 */
let aborted = false
function onSignal() {
  if (aborted) return
  aborted = true
  console.warn('  [linkedin] Interrupt received — finishing with partial results')
}
process.once('SIGINT', onSignal)
process.once('SIGTERM', onSignal)

export async function scrapeLinkedIn(): Promise<ScrapedJob[]> {
  const queries = buildQueries()
  console.log(
    `  [linkedin] ${queries.length} queries ` +
    `(${new Set(queries.map(q => q.keyword)).size} keywords x ${new Set(queries.map(q => q.location)).size} locations) ` +
    `· concurrency ${CONCURRENCY} · up to ${MAX_PAGES} pages each`,
  )

  const cards = await discover(queries)
  if (cards.length === 0) {
    console.warn('  [linkedin] Discovery returned nothing — treating as a failed run')
    return []
  }

  const details = await fetchDetails(cards)

  const jobs = cards.map(card => toScrapedJob(card, details.get(card.externalId)))
  const described = jobs.filter(j => details.has(j.externalId)).length

  console.log(
    `  [linkedin] ${jobs.length} jobs ` +
    `(${described} with full description, ${jobs.length - described} from card data only)`,
  )
  return jobs
}

// ─── Phase 1: discovery ───────────────────────────────────────────────────────

/**
 * Walk every query to exhaustion, deduplicating by job id as we go.
 *
 * Queries run in parallel; pages within a query stay sequential because the
 * stop condition is "this page returned nothing new".
 */
async function discover(queries: Query[]): Promise<SearchCard[]> {
  const byId = new Map<string, SearchCard>()
  let completed = 0
  let failed = 0

  await mapWithConcurrency(queries, CONCURRENCY, async (query) => {
    if (aborted) return

    let added = 0
    let barrenPages = 0
    for (let page = 0; page < MAX_PAGES; page++) {
      if (aborted) break

      let html: string
      try {
        html = await fetchHtml(searchUrl(query, page * RESULTS_PER_PAGE))
      } catch (err) {
        // Paginating past the end is the normal way a query finishes.
        if (err instanceof ExhaustedError) break
        failed++
        console.warn(
          `  [linkedin] "${query.keyword}" @ ${query.location} p${page + 1}: ${(err as Error).message}`,
        )
        break
      }

      const parsed = parseSearchCards(html)
      if (parsed.length === 0) break

      let fresh = 0
      for (const card of parsed) {
        if (byId.has(card.externalId)) continue
        byId.set(card.externalId, card)
        fresh++
      }
      added += fresh

      // Overlapping queries legitimately share their first pages — "software
      // engineer" in Dubai repeats much of the same search UAE-wide — so a
      // single duplicate page is not a reason to abandon a query that may
      // still hold unique results deeper in. Only give up once several
      // consecutive pages have yielded nothing new.
      barrenPages = fresh === 0 ? barrenPages + 1 : 0
      if (barrenPages >= BARREN_PAGE_LIMIT) break

      if (DELAY_MS) await sleep(DELAY_MS)
    }

    completed++
    console.log(
      `  [linkedin] [${completed}/${queries.length}] "${query.keyword}" @ ${query.location}: ` +
      `+${added} · ${byId.size} unique so far`,
    )
  })

  console.log(
    `  [linkedin] Discovery complete — ${byId.size} unique jobs from ${completed} queries` +
    (failed ? ` (${failed} failed)` : ''),
  )
  return [...byId.values()]
}

// ─── Phase 2: detail enrichment ───────────────────────────────────────────────

/**
 * Fetch full descriptions. Returns only what succeeded — callers fall back to
 * card data for the rest, so a partial map is a valid outcome, not an error.
 */
async function fetchDetails(cards: SearchCard[]): Promise<Map<string, JobDetail>> {
  const details = new Map<string, JobDetail>()

  if (!FETCH_DETAIL) {
    console.log('  [linkedin] Detail fetch off — card data only (set LI_FETCH_DETAIL=true to enrich)')
    return details
  }

  const targets = MAX_DETAIL > 0 ? cards.slice(0, MAX_DETAIL) : cards
  if (targets.length < cards.length) {
    console.log(`  [linkedin] Detail capped at ${targets.length}/${cards.length} by LI_MAX_DETAIL`)
  }

  console.log(`  [linkedin] Fetching ${targets.length} job descriptions…`)
  let done = 0
  let failed = 0

  await mapWithConcurrency(targets, CONCURRENCY, async (card) => {
    if (aborted) return

    try {
      const detail = parseDetail(await fetchHtml(detailUrl(card.externalId)))
      // A posting with no description body adds nothing over the card.
      if (detail.description || detail.employmentType) {
        details.set(card.externalId, detail)
      }
    } catch {
      failed++
    }

    if (++done % 250 === 0) {
      console.log(`  [linkedin] Detail ${done}/${targets.length} · ${details.size} enriched`)
    }
    if (DELAY_MS) await sleep(DELAY_MS)
  })

  if (failed) console.warn(`  [linkedin] ${failed} detail fetches failed — those jobs keep card data`)
  return details
}
