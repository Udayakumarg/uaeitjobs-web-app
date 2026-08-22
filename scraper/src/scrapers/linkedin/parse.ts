/**
 * Pure parsing layer for LinkedIn's guest endpoints.
 *
 * Every function here is a pure string -> data transform with no I/O, so the
 * selectors can be regression-tested against saved HTML fixtures without a
 * network call. When LinkedIn reshuffles its markup, this is the only file
 * that needs to change.
 */
import * as cheerio from 'cheerio'
import { ScrapedJob } from '../../types'

/** A job as it appears in the search-results feed. Enough to persist on its own. */
export interface SearchCard {
  externalId: string
  title: string
  company: string
  location: string
  applyUrl: string
  postedAt?: string
  companyLogoUrl?: string
}

/** The extra fields only the detail page carries. All optional by design. */
export interface JobDetail {
  description?: string
  seniority?: string
  employmentType?: string
  jobFunction?: string
  industries?: string
  /**
   * LinkedIn's own apply-flow classification: true when the apply button's
   * tracking name is "...apply-link-onsite" (LinkedIn Easy Apply — the
   * candidate never leaves LinkedIn), false when it's "...apply-link-offsite"
   * (LinkedIn redirects to the employer's own site). Verified present on the
   * guest detail page's primary CTA button; undefined if that marker is
   * absent for any reason, rather than guessing.
   */
  linkedinEasyApply?: boolean
}

// ─── Search results ───────────────────────────────────────────────────────────

/**
 * Parse a `seeMoreJobPostings/search` response into cards.
 *
 * Cards missing an id or title are skipped rather than emitted half-built —
 * a job with no title is noise the backend would reject anyway.
 */
export function parseSearchCards(html: string): SearchCard[] {
  const $ = cheerio.load(html)
  const cards: SearchCard[] = []

  $('[data-entity-urn]').each((_, el) => {
    const node = $(el)

    const urn = node.attr('data-entity-urn') ?? ''
    const externalId = /urn:li:jobPosting:(\d+)/.exec(urn)?.[1]
    if (!externalId) return

    const title = text(node.find('.base-search-card__title'))
    if (!title) return

    const company = text(node.find('.base-search-card__subtitle')) || 'Unknown'
    const rawLocation = text(node.find('.job-search-card__location'))

    // The full-link anchor carries the canonical slug URL; fall back to the
    // numeric-id form, which always resolves.
    const href = node.find('.base-card__full-link').attr('href')
      ?? node.find('a[href*="/jobs/view/"]').attr('href')

    cards.push({
      externalId,
      title,
      company,
      location: normaliseLocation(rawLocation),
      applyUrl: canonicalUrl(href, externalId),
      postedAt: node.find('time[datetime]').attr('datetime')?.trim() || undefined,
      companyLogoUrl: node.find('img[data-delayed-url]').attr('data-delayed-url')?.trim() || undefined,
    })
  })

  return cards
}

// ─── Detail page ──────────────────────────────────────────────────────────────

/**
 * Parse a `jobPosting/{id}` response.
 *
 * Note LinkedIn serves no JSON-LD on these guest detail pages, so this reads
 * the rendered markup directly.
 */
export function parseDetail(html: string): JobDetail {
  const $ = cheerio.load(html)

  // The description lives in a "show more" wrapper. Take the markup node when
  // present so we don't also swallow the expand/collapse button label.
  const body = $('.show-more-less-html__markup').first()
  const container = body.length ? body : $('.description__text').first()

  const detail: JobDetail = {
    description: blockText(container) || undefined,
  }

  // Criteria are subheader/value pairs: "Seniority level" -> "Mid-Senior level".
  $('.description__job-criteria-item').each((_, el) => {
    const item = $(el)
    const label = text(item.find('.description__job-criteria-subheader')).toLowerCase()
    const value = text(item.find('.description__job-criteria-text'))
    if (!value) return

    if (label.includes('seniority')) detail.seniority = value
    else if (label.includes('employment')) detail.employmentType = value
    else if (label.includes('function')) detail.jobFunction = value
    else if (label.includes('industr')) detail.industries = value
  })

  // The primary apply CTA's tracking name reveals LinkedIn's own apply-flow
  // classification, independent of anything the search card carries.
  if ($('[data-tracking-control-name*="apply-link-onsite"]').length) {
    detail.linkedinEasyApply = true
  } else if ($('[data-tracking-control-name*="apply-link-offsite"]').length) {
    detail.linkedinEasyApply = false
  }

  return detail
}

// ─── Assembly ─────────────────────────────────────────────────────────────────

/**
 * Merge a card with its (possibly absent) detail into the backend's contract.
 *
 * Detail is optional on purpose: a failed detail fetch degrades the job's
 * richness, it never drops the job.
 */
export function toScrapedJob(card: SearchCard, detail?: JobDetail): ScrapedJob {
  const description = detail?.description
    ?? `${card.title} at ${card.company} — ${card.location}`

  return {
    externalId: card.externalId,
    title: card.title,
    company: card.company,
    description,
    location: card.location,
    emirate: inferEmirate(card.location),
    applyUrl: card.applyUrl,
    publisher: 'LinkedIn',
    postedAt: card.postedAt,
    jobType: mapEmploymentType(detail?.employmentType),
    remoteUae: isRemote(card, detail),
    linkedinEasyApply: detail?.linkedinEasyApply,
  }
}

// ─── Normalisation ────────────────────────────────────────────────────────────

/**
 * Map free-text location onto the backend's emirate enum.
 *
 * Hyphens are normalised first because LinkedIn writes the multi-word emirates
 * as "Ras al-Khaimah" — matching against spaced names alone silently fails.
 * The multi-word names are tested before the single-word ones so that
 * "Umm Al Quwain" cannot be short-circuited by a substring match.
 */
export function inferEmirate(text: string): string | undefined {
  const t = (text ?? '').toLowerCase().replace(/-/g, ' ')
  if (t.includes('abu dhabi')) return 'abu_dhabi'
  if (t.includes('ras al khaimah')) return 'ras_al_khaimah'
  if (t.includes('umm al quwain')) return 'umm_al_quwain'
  if (t.includes('dubai')) return 'dubai'
  if (t.includes('sharjah')) return 'sharjah'
  if (t.includes('ajman')) return 'ajman'
  if (t.includes('fujairah')) return 'fujairah'
  if (t.includes('al ain')) return 'abu_dhabi'
  return undefined
}

/**
 * "Dubai, Dubai, United Arab Emirates" -> "Dubai, AE".
 *
 * LinkedIn repeats the city as its own region, so consecutive duplicate
 * segments are collapsed before the country suffix is replaced.
 */
export function normaliseLocation(raw: string): string {
  const withoutCountry = (raw ?? '')
    .replace(/,?\s*(United Arab Emirates|UAE|U\.A\.E\.?)\s*$/i, '')
    .trim()

  if (!withoutCountry) return 'United Arab Emirates, AE'

  const segments = withoutCountry
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  const deduped = segments.filter((s, i) => i === 0 || s.toLowerCase() !== segments[i - 1].toLowerCase())

  return deduped.length ? `${deduped.join(', ')}, AE` : 'United Arab Emirates, AE'
}

/** LinkedIn's employment-type labels -> the backend's job_type values. */
export function mapEmploymentType(raw?: string): string {
  const u = (raw ?? '').toUpperCase()
  if (!u) return 'full_time'
  if (u.includes('PART')) return 'part_time'
  if (u.includes('CONTRACT')) return 'contract'
  if (u.includes('TEMPORARY')) return 'contract'
  if (u.includes('INTERN')) return 'internship'
  return 'full_time'
}

function isRemote(card: SearchCard, detail?: JobDetail): boolean {
  const haystack = `${card.location} ${card.title} ${detail?.description ?? ''}`.toLowerCase()
  return /\bremote\b|\bwork from home\b/.test(haystack)
}

// ─── Cheerio helpers ──────────────────────────────────────────────────────────

/**
 * A selection returned by `$(…)`, named without reference to cheerio's
 * internal node types so this survives a cheerio major-version bump.
 */
type Selection = ReturnType<cheerio.CheerioAPI>

function text(node: Selection): string {
  return node.first().text().replace(/\s+/g, ' ').trim()
}

/** Collapse a rich-text block to plain text while keeping line structure. */
function blockText(node: Selection): string {
  if (!node.length) return ''
  return node
    .html()
    ?.replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|div|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim() ?? ''
}

function canonicalUrl(href: string | undefined, externalId: string): string {
  const cleaned = href?.trim().split('?')[0]
  if (cleaned && /^https?:\/\//.test(cleaned)) return cleaned
  return `https://www.linkedin.com/jobs/view/${externalId}/`
}
