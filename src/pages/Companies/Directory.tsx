import { Building2, ExternalLink, Plus, Search, ShieldCheck, Star } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, Container, EmptyState, Select } from '../../components/ui'
import { useToastStore } from '../../components/Toast'
import { companiesApi, errorMessage } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import type { HiringActivity, HiringCompany, HiringCompanyFilters } from '../../types'

const PAGE_SIZE = 24

/* Mapping for the small "hiring status" pill on each card. */
const ACTIVITY_LABEL: Record<HiringActivity, string> = {
  ACTIVE_HIRING:   'Active hiring',
  FREQUENT_HIRING: 'Frequent hiring',
  OCCASIONAL:      'Occasional',
}
const ACTIVITY_TONE: Record<HiringActivity, 'green' | 'teal' | 'slate'> = {
  ACTIVE_HIRING:   'green',
  FREQUENT_HIRING: 'teal',
  OCCASIONAL:      'slate',
}

/**
 * UAE IT Hiring Companies Directory — public list page.
 *
 * Sourced from {@code GET /api/v1/companies}. Filterable by city / category,
 * searchable by name. Featured companies appear first. Submission CTA points
 * to {@code /companies/submit} (auth required).
 *
 * SEO note: this is rendered client-side from a Vite SPA, so we set
 * document.title + meta description on mount and inject JSON-LD ItemList
 * schema for Google. Server-side sitemap entries are emitted by SeoController.
 */
export default function CompaniesDirectory() {
  const [items, setItems]   = useState<HiringCompany[]>([])
  const [total, setTotal]   = useState(0)
  const [page, setPage]     = useState(0)
  const [q, setQ]           = useState('')
  const [city, setCity]     = useState('')
  const [category, setCategory] = useState('')
  const [filters, setFilters] = useState<HiringCompanyFilters>({ cities: [], categories: [] })
  const [loading, setLoading] = useState(false)

  // IMPORTANT: select just `add` (a stable function ref) — calling
  // `useToastStore()` with no selector returns a new object on every
  // store change, which would re-create `load` and infinite-loop the
  // fetch on every failed request.
  const addToast = useToastStore((s) => s.add)
  const user     = useAuthStore((s) => s.user)

  // ── SEO meta ──────────────────────────────────────────────────────────
  useEffect(() => {
    const prevTitle = document.title
    document.title = 'UAE IT Hiring Companies — Directory of Tech Employers | UAEITJOBS'
    setMeta(
      'description',
      'Browse UAE organisations hiring for IT and technology roles. Click straight through to each company’s careers page. Banks, telecoms, government, startups and consultancies.',
    )
    return () => { document.title = prevTitle }
  }, [])

  // ── Load filter options once ─────────────────────────────────────────
  useEffect(() => {
    companiesApi.filters()
      .then((r) => setFilters(r.data))
      .catch(() => { /* dropdowns just stay empty */ })
  }, [])

  // ── Load list whenever query/filters/page change ─────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await companiesApi.list({
        q: q.trim() || undefined,
        city: city || undefined,
        category: category || undefined,
        page,
        size: PAGE_SIZE,
      })
      setItems(data.content)
      setTotal(data.totalElements)
    } catch (e) {
      addToast({ type: 'error', title: 'Failed to load companies', message: errorMessage(e) })
    } finally {
      setLoading(false)
    }
  }, [q, city, category, page, addToast])

  // Debounce search input — avoid hammering the API on every keystroke.
  useEffect(() => {
    const id = window.setTimeout(load, 250)
    return () => window.clearTimeout(id)
  }, [load])

  // Reset to first page when filters change.
  const resetAndSet = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(0) }

  // ── JSON-LD ItemList schema ──────────────────────────────────────────
  const jsonLd = useMemo(() => {
    return JSON.stringify({
      '@context': 'https://schema.org',
      '@type':    'ItemList',
      name:       'UAE IT Hiring Companies',
      itemListElement: items.slice(0, 50).map((c, i) => ({
        '@type':   'ListItem',
        position:  i + 1,
        url:       `https://www.uaeitjobs.com/companies/${c.slug}`,
        name:      c.name,
      })),
    })
  }, [items])

  return (
    <Container className="py-10">
      {/* JSON-LD — picked up by Google for rich-result eligibility. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-700">Directory</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            UAE IT Hiring Companies
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            {total > 0
              ? `${total} UAE organisation${total === 1 ? '' : 's'} that hire for IT and technology roles. Click any name to jump straight to their careers page.`
              : 'UAE organisations that hire for IT and technology roles. Click any name to jump straight to their careers page.'}
          </p>
        </div>
        <Link to={user ? '/companies/submit' : '/login?from=/companies/submit'}>
          <Button variant="primary"><Plus className="h-4 w-4" /> Submit a company</Button>
        </Link>
      </header>

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <Card className="mb-6 flex flex-col gap-3 p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => resetAndSet(setQ)(e.target.value)}
            placeholder="Search company name…"
            aria-label="Search companies"
            className="min-h-11 w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm shadow-sm transition hover:border-slate-300 focus:border-pink-600 focus:outline-none focus:ring-4 focus:ring-pink-600/15"
          />
        </div>
        <Select value={city} onChange={(e) => resetAndSet(setCity)(e.target.value)} className="sm:w-52" aria-label="Filter by city">
          <option value="">All cities</option>
          {filters.cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select value={category} onChange={(e) => resetAndSet(setCategory)(e.target.value)} className="sm:w-56" aria-label="Filter by category">
          <option value="">All categories</option>
          {filters.categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </Card>

      {/* ── Grid ───────────────────────────────────────────────────────── */}
      {loading && items.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title="No companies match your filters"
          description="Try clearing the search or filters, or submit a company we're missing."
          action={
            <Link to={user ? '/companies/submit' : '/login?from=/companies/submit'}>
              <Button variant="primary"><Plus className="h-4 w-4" /> Submit a company</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => <CompanyCard key={c.id} c={c} />)}
        </div>
      )}

      {/* ── Pagination ─────────────────────────────────────────────────── */}
      {total > PAGE_SIZE ? (
        <nav className="mt-8 flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 0 || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-600">
            Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={(page + 1) * PAGE_SIZE >= total || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </nav>
      ) : null}
    </Container>
  )
}

/* ───────────────────────────── Card ──────────────────────────── */
function CompanyCard({ c }: { c: HiringCompany }) {
  return (
    <article className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-pink-200 hover:shadow-md">
      {c.featured ? (
        <Star className="absolute right-4 top-4 h-4 w-4 fill-amber-400 stroke-amber-500" aria-label="Featured" />
      ) : null}

      <Link to={`/companies/${c.slug}`} className="flex-1">
        <h2 className="pr-6 text-lg font-semibold tracking-tight text-slate-950 group-hover:text-pink-700">
          {c.name}
        </h2>
        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500">
          {c.city ? <span>{c.city}</span> : null}
          {c.city && c.category ? <span aria-hidden="true">·</span> : null}
          {c.category ? <span>{c.category}</span> : null}
        </div>
        {c.description ? (
          <p className="mt-3 line-clamp-2 text-sm text-slate-600">{c.description}</p>
        ) : null}
      </Link>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={ACTIVITY_TONE[c.hiringStatus]}>{ACTIVITY_LABEL[c.hiringStatus]}</Badge>
          {c.urlVerified ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
              <ShieldCheck className="h-3 w-3" /> Verified
            </span>
          ) : null}
        </div>
        <a
          href={c.careersUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-pink-200 hover:text-pink-700"
          onClick={(e) => e.stopPropagation()}
        >
          Careers <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </article>
  )
}

/* Tiny helper — finds or creates <meta name="..."> in <head>. */
function setMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.name = name
    document.head.appendChild(el)
  }
  el.content = content
}
