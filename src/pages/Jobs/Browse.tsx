import { ChevronLeft, ChevronRight, Grid2X2, List, RefreshCw, SearchX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { JobCard } from '../../components/JobCard'
import { JobFilters, type JobFilterValues } from '../../components/JobFilters'
import { CardSkeleton } from '../../components/Skeleton'
import { Button, Container, EmptyState } from '../../components/ui'
import { errorMessage, jobsApi } from '../../services/api'
import type { Job, Page } from '../../types'

const emptyPage: Page<Job> = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 }

export default function JobBrowse() {
  const [params, setParams] = useSearchParams()
  const [page, setPage] = useState<Page<Job>>(emptyPage)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const filters = useMemo<JobFilterValues>(() => ({
    q: params.get('q') ?? '',
    type: params.get('type') ?? '',
    level: params.get('level') ?? '',
    location: params.get('location') ?? '',
    skills: params.get('skills') ?? '',
  }), [params])

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError('')
    const currentPage = Number(params.get('page') ?? 0)
    const request = filters.q
      ? jobsApi.search(filters.q, currentPage, 20)
      : (filters.type || filters.level || filters.location || filters.skills)
        ? jobsApi.filter({ type: filters.type, level: filters.level, location: filters.location, skills: filters.skills, page: currentPage, size: 20 })
        : jobsApi.list({ page: currentPage, size: 20 })

    request.then(({ data }) => mounted && setPage(data))
      .catch((err) => mounted && setError(errorMessage(err)))
      .finally(() => mounted && setLoading(false))

    return () => { mounted = false }
  }, [filters, params])

  function applyFilters(values: JobFilterValues) {
    const next = new URLSearchParams()
    Object.entries(values).forEach(([key, value]) => {
      if (value) next.set(key, value)
    })
    setParams(next)
  }

  function go(nextPage: number) {
    const next = new URLSearchParams(params)
    next.set('page', String(nextPage))
    setParams(next)
  }

  const activeChips = [
    filters.q && { key: 'q', label: `“${filters.q}”` },
    filters.type && { key: 'type', label: filters.type.replace('_', ' ') },
    filters.level && { key: 'level', label: filters.level },
    filters.location && { key: 'location', label: filters.location },
    filters.skills && { key: 'skills', label: filters.skills },
  ].filter(Boolean) as Array<{ key: string; label: string }>

  function removeChip(key: string) {
    applyFilters({ ...filters, [key]: '' })
  }

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
              <Button variant="secondary" onClick={() => applyFilters({ q: '', type: '', level: '', location: '', skills: '' })}>
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
