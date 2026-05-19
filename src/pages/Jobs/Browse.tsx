import { ChevronLeft, ChevronRight, Clock, Grid2X2, List, RefreshCw, SearchX, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { JobCard } from '../../components/JobCard'
import { JobFilters, type JobFilterValues } from '../../components/JobFilters'
import { CardSkeleton } from '../../components/Skeleton'
import { Button, Container, EmptyState } from '../../components/ui'
import { errorMessage, jobsApi } from '../../services/api'
import type { Job, Page } from '../../types'
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
} from '../../utils/recentSearches'

const emptyPage: Page<Job> = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 }

export default function JobBrowse() {
  const [params, setParams] = useSearchParams()
  const [page, setPage] = useState<Page<Job>>(emptyPage)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [recent, setRecent] = useState<string[]>(() => getRecentSearches())

  const filters = useMemo<JobFilterValues>(() => ({
    q: params.get('q') ?? '',
    type: params.get('type') ?? '',
    level: params.get('level') ?? '',
    location: params.get('location') ?? '',
    skills: params.get('skills') ?? '',
    visaType: params.get('visaType') ?? '',
    emirate: params.get('emirate') ?? '',
    immediateJoiner: params.get('immediateJoiner') === 'true',
    remoteUae: params.get('remoteUae') === 'true',
  }), [params])

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError('')
    const currentPage = Number(params.get('page') ?? 0)
    const hasStructured =
      filters.type ||
      filters.level ||
      filters.location ||
      filters.skills ||
      filters.visaType ||
      filters.emirate ||
      filters.immediateJoiner ||
      filters.remoteUae
    const request = filters.q
      ? jobsApi.search(filters.q, currentPage, 20)
      : hasStructured
        ? jobsApi.filter({
            type: filters.type || undefined,
            level: filters.level || undefined,
            location: filters.location || undefined,
            skills: filters.skills || undefined,
            visaType: filters.visaType || undefined,
            emirate: filters.emirate || undefined,
            immediateJoiner: filters.immediateJoiner ? true : undefined,
            remoteUae: filters.remoteUae ? true : undefined,
            page: currentPage,
            size: 20,
          })
        : jobsApi.list({ page: currentPage, size: 20 })

    request.then(({ data }) => mounted && setPage(data))
      .catch((err) => mounted && setError(errorMessage(err)))
      .finally(() => mounted && setLoading(false))

    // Record successful queries so visitors get a quick-recall list
    if (filters.q) {
      addRecentSearch(filters.q)
      setRecent(getRecentSearches())
    }

    return () => { mounted = false }
  }, [filters, params])

  function applyFilters(values: JobFilterValues) {
    const next = new URLSearchParams()
    Object.entries(values).forEach(([key, value]) => {
      if (value === '' || value === false || value === null || value === undefined) return
      next.set(key, typeof value === 'boolean' ? 'true' : String(value))
    })
    setParams(next)
  }

  function go(nextPage: number) {
    const next = new URLSearchParams(params)
    next.set('page', String(nextPage))
    setParams(next)
  }

  const VISA_LABELS: Record<string, string> = {
    free_visa: 'Free visa',
    employment_visa: 'Sponsored visa',
    own_visa: 'Own visa',
    visit_visa_accepted: 'Visit visa OK',
  }
  const EMIRATE_LABELS: Record<string, string> = {
    dubai: 'Dubai',
    abu_dhabi: 'Abu Dhabi',
    sharjah: 'Sharjah',
    ajman: 'Ajman',
    fujairah: 'Fujairah',
    ras_al_khaimah: 'Ras Al Khaimah',
    umm_al_quwain: 'Umm Al Quwain',
  }

  const activeChips = [
    filters.q && { key: 'q', label: `"${filters.q}"` },
    filters.type && { key: 'type', label: filters.type.replace('_', ' ') },
    filters.level && { key: 'level', label: filters.level },
    filters.location && { key: 'location', label: filters.location },
    filters.skills && { key: 'skills', label: filters.skills },
    filters.visaType && { key: 'visaType', label: VISA_LABELS[filters.visaType] ?? filters.visaType },
    filters.emirate && { key: 'emirate', label: EMIRATE_LABELS[filters.emirate] ?? filters.emirate },
    filters.immediateJoiner && { key: 'immediateJoiner', label: 'Immediate joiner' },
    filters.remoteUae && { key: 'remoteUae', label: 'Remote UAE' },
  ].filter(Boolean) as Array<{ key: string; label: string }>

  function removeChip(key: string) {
    const reset = key === 'immediateJoiner' || key === 'remoteUae' ? false : ''
    applyFilters({ ...filters, [key]: reset } as JobFilterValues)
  }

  function pickRecent(query: string) {
    applyFilters({
      q: query,
      type: '',
      level: '',
      location: '',
      skills: '',
      visaType: '',
      emirate: '',
      immediateJoiner: false,
      remoteUae: false,
    })
  }

  function dismissRecent(query: string) {
    removeRecentSearch(query)
    setRecent(getRecentSearches())
  }

  function clearRecent() {
    clearRecentSearches()
    setRecent([])
  }

  const showRecent = !filters.q && recent.length > 0

  return (
    <Container className="py-10 sm:py-14">
      {/* Heading */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Jobs</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Browse UAE IT roles
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {loading
              ? 'Loading roles…'
              : error
                ? 'Could not load roles.'
                : `${page.totalElements.toLocaleString()} ${page.totalElements === 1 ? 'role' : 'roles'} matching your search.`}
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <button
            className={`rounded-md p-2 transition ${
              view === 'grid' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
            }`}
            onClick={() => setView('grid')}
            aria-label="Grid view"
          >
            <Grid2X2 size={18} />
          </button>
          <button
            className={`rounded-md p-2 transition ${
              view === 'list' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
            }`}
            onClick={() => setView('list')}
            aria-label="List view"
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Recent searches (localStorage — visible for both logged-in and anonymous visitors) */}
      {showRecent ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            Recent
          </span>
          {recent.map((query) => (
            <span
              key={query}
              className="group inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-indigo-50 hover:text-indigo-700 hover:ring-indigo-100"
            >
              <button
                type="button"
                onClick={() => pickRecent(query)}
                className="max-w-[200px] truncate"
                title={`Search for "${query}"`}
              >
                {query}
              </button>
              <button
                type="button"
                onClick={() => dismissRecent(query)}
                className="grid h-5 w-5 place-items-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label={`Remove "${query}" from recent searches`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={clearRecent}
            className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            Clear all
          </button>
        </div>
      ) : null}

      {/* Sticky filter bar */}
      <div className="sticky top-[68px] z-30 -mx-4 bg-gradient-to-b from-[#f7f8fa] via-[#f7f8fa] to-transparent px-4 pb-3 pt-1 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <JobFilters value={filters} onApply={applyFilters} />
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Active:</span>
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => removeChip(chip.key)}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              {chip.label}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      ) : null}

      {/* Results */}
      <section aria-live="polite" aria-busy={loading} className="mt-6">
        {loading ? (
          <>
            <span className="sr-only">Loading jobs</span>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <CardSkeleton key={index} />
              ))}
            </div>
          </>
        ) : null}

        {error ? (
          <EmptyState
            title={error}
            description="We couldn't reach the jobs service. Try refreshing."
            action={
              <Button onClick={() => window.location.reload()}>
                <RefreshCw size={16} /> Retry
              </Button>
            }
          />
        ) : null}

        {!loading && !error && page.content.length === 0 ? (
          <EmptyState
            icon={<SearchX size={20} />}
            title="No matching roles found"
            description="Try removing a filter or searching for a related skill or company."
            action={
              <Button variant="secondary" onClick={() => applyFilters({ q: '', type: '', level: '', location: '', skills: '', visaType: '', emirate: '', immediateJoiner: false, remoteUae: false })}>
                Clear filters
              </Button>
            }
          />
        ) : null}

        {!loading && !error && page.content.length > 0 ? (
          <>
            <span className="sr-only">{page.totalElements} jobs loaded</span>
            <div
              className={
                view === 'grid'
                  ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3'
                  : 'grid gap-4'
              }
            >
              {page.content.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>

            <nav
              aria-label="Pagination"
              className="mt-10 flex flex-col items-center justify-between gap-3 sm:flex-row"
            >
              <Button
                variant="secondary"
                disabled={page.number <= 0}
                onClick={() => go(page.number - 1)}
              >
                <ChevronLeft size={16} /> Previous
              </Button>
              <span className="text-sm font-medium text-slate-600">
                Page <span className="text-slate-950">{page.number + 1}</span> of{' '}
                {Math.max(page.totalPages, 1)}
              </span>
              <Button
                variant="secondary"
                disabled={page.number + 1 >= page.totalPages}
                onClick={() => go(page.number + 1)}
              >
                Next <ChevronRight size={16} />
              </Button>
            </nav>
          </>
        ) : null}
      </section>
    </Container>
  )
}
