import { Grid2X2, List, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { JobCard } from '../../components/JobCard'
import { JobFilters, type JobFilterValues } from '../../components/JobFilters'
import { Button, EmptyState } from '../../components/ui'
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

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-blue-700">Jobs</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Browse UAE IT roles</h1>
        </div>
        <div className="inline-flex rounded-md border border-slate-200 bg-white p-1">
          <button className={`rounded-md p-2 ${view === 'grid' ? 'bg-blue-700 text-white' : 'text-slate-600'}`} onClick={() => setView('grid')} aria-label="Grid view"><Grid2X2 size={18} /></button>
          <button className={`rounded-md p-2 ${view === 'list' ? 'bg-blue-700 text-white' : 'text-slate-600'}`} onClick={() => setView('list')} aria-label="List view"><List size={18} /></button>
        </div>
      </div>

      <JobFilters value={filters} onChange={applyFilters} onSubmit={() => applyFilters(filters)} />

      <section aria-live="polite" aria-busy={loading}>
        {loading ? (
          <>
            <span className="sr-only">Loading jobs</span>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-64 animate-pulse rounded-lg bg-slate-200" />)}</div>
          </>
        ) : null}
        {error ? <EmptyState title={error} action={<Button onClick={() => window.location.reload()}><RefreshCw size={16} /> Retry</Button>} /> : null}
        {!loading && !error && page.content.length === 0 ? <EmptyState title="No jobs found. Try adjusting the search filters." /> : null}
        {!loading && !error && page.content.length > 0 ? (
          <>
            <span className="sr-only">{page.totalElements} jobs loaded</span>
            <div className={view === 'grid' ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3' : 'grid gap-4'}>
              {page.content.map((job) => <JobCard key={job.id} job={job} />)}
            </div>
            <div className="mt-8 flex items-center justify-between">
              <Button variant="secondary" disabled={page.number <= 0} onClick={() => go(page.number - 1)}>Previous</Button>
              <span className="text-sm font-medium text-slate-600">Page {page.number + 1} of {Math.max(page.totalPages, 1)}</span>
              <Button variant="secondary" disabled={page.number + 1 >= page.totalPages} onClick={() => go(page.number + 1)}>Next</Button>
            </div>
          </>
        ) : null}
      </section>
    </main>
  )
}
