import { ExternalLink, RotateCcw, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CompanyLogo } from '../../components/CompanyLogo'
import { CardSkeleton } from '../../components/Skeleton'
import { StatusBadge } from '../../components/StatusBadge'
import { useToastStore } from '../../components/Toast'
import { Card, EmptyState, Select } from '../../components/ui'
import { seekerApi, errorMessage } from '../../services/api'
import type { Application, ApplicationStatus } from '../../types'
import { money, relativeTime, dateLabel } from '../../utils/format'
import { isSafeUrl } from '../../utils/url'

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'applied',     label: 'Applied' },
  { value: 'reviewed',    label: 'Reviewed' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'rejected',    label: 'Rejected' },
  { value: 'hired',       label: 'Hired' },
]

export default function JobSeekerApplications() {
  const toast = useToastStore(s => s.add)
  const [items,   setItems]   = useState<Application[] | null>(null)
  // The real total — items.length was capped at whatever page size was
  // requested below, so a seeker with more than that many applications was
  // always told a count equal to the page size, never the true number.
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)

  // Everything below is client-side — up to 100 applications are already
  // loaded in one shot, and a personal list this size doesn't need a
  // server round-trip just to search or re-sort it.
  const [query,      setQuery]      = useState('')
  const [status,     setStatus]     = useState<ApplicationStatus | ''>('')
  const [sortOrder,  setSortOrder]  = useState<'newest' | 'oldest'>('newest')

  useEffect(() => {
    seekerApi.applications(0, 100)
      .then(({ data }) => { setItems(data.content); setTotal(data.totalElements) })
      .catch(err => toast({ type: 'error', title: 'Could not load applications', message: errorMessage(err) }))
      .finally(() => setLoading(false))
  }, [toast])

  const visibleItems = useMemo(() => {
    if (!items) return null
    const q = query.trim().toLowerCase()
    const filtered = items.filter(app => {
      if (status && app.status !== status) return false
      if (!q) return true
      return (app.job?.title.toLowerCase().includes(q))
          || (app.job?.companyName.toLowerCase().includes(q))
    })
    return [...filtered].sort((a, b) => {
      const at = a.appliedAt ? new Date(a.appliedAt).getTime() : 0
      const bt = b.appliedAt ? new Date(b.appliedAt).getTime() : 0
      return sortOrder === 'newest' ? bt - at : at - bt
    })
  }, [items, query, status, sortOrder])

  const hasFilters = query.trim() !== '' || status !== ''

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">My applications</h1>
          {items && items.length > 0 && (
            <p className="mt-1 text-sm text-slate-500">{total} job{total !== 1 ? 's' : ''} applied</p>
          )}
        </div>
        <Link
          to="/jobs"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Browse more jobs
        </Link>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid gap-3" aria-live="polite" aria-busy="true">
          <span className="sr-only">Loading applications</span>
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} lines={2} />)}
        </div>
      )}

      {/* Empty state — never applied at all */}
      {!loading && items?.length === 0 && (
        <EmptyState
          title="No applications yet."
          description="Click Apply Now on any job to track it here automatically."
          action={
            <Link
              to="/jobs"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Browse jobs
            </Link>
          }
        />
      )}

      {/* Toolbar — search, status filter, applied-date sort */}
      {!loading && items && items.length > 0 && (
        <Card className="mb-4 flex flex-col gap-3 p-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by job title or company…"
              aria-label="Search applications"
              className="min-h-11 w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm shadow-sm transition hover:border-slate-300 focus:border-pink-600 focus:outline-none focus:ring-4 focus:ring-pink-600/15"
            />
          </div>
          <Select value={status} onChange={e => setStatus(e.target.value as ApplicationStatus | '')} className="sm:w-44" aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Select value={sortOrder} onChange={e => setSortOrder(e.target.value as 'newest' | 'oldest')} className="sm:w-52" aria-label="Sort by applied date">
            <option value="newest">Applied date: Newest first</option>
            <option value="oldest">Applied date: Oldest first</option>
          </Select>
        </Card>
      )}

      {/* Filtered-to-nothing state — applications exist, none match */}
      {!loading && visibleItems && items && items.length > 0 && visibleItems.length === 0 && (
        <EmptyState
          title="No applications match your filters."
          description="Try a different search term or clear the status filter."
          action={
            hasFilters ? (
              <button
                onClick={() => { setQuery(''); setStatus('') }}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Clear filters
              </button>
            ) : undefined
          }
        />
      )}

      {/* Application cards */}
      {visibleItems && visibleItems.length > 0 && (
        <div className="grid gap-3">
          {visibleItems.map(app => (
            <ApplicationCard key={app.id} app={app} />
          ))}
        </div>
      )}
    </main>
  )
}

function ApplicationCard({ app }: { app: Application }) {
  const job     = app.job
  const salary  = job ? money(job.salaryMin, job.salaryMax, job.salaryCurrency) : null
  const rawApplyUrl = job?.applyUrl ?? job?.linkedinUrl ?? null
  const applyUrl = isSafeUrl(rawApplyUrl) ? rawApplyUrl : null

  // Meta line: company · location · job type
  const meta = [
    job?.companyName,
    job?.locationUae,
    job?.jobType?.replace('_', '-'),
  ].filter(Boolean).join(' · ')

  return (
    <Card className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap">

      {/* Logo */}
      <CompanyLogo
        logoUrl={job?.companyLogoUrl}
        companyName={job?.companyName ?? ''}
        size="sm"
        className="shrink-0 self-start mt-0.5"
      />

      {/* Details */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          {job ? (
            <Link
              to={`/jobs/${job.id}`}
              className="font-semibold text-slate-950 transition hover:text-pink-700 leading-snug"
            >
              {job.title}
            </Link>
          ) : (
            <span className="font-semibold text-slate-950">Job no longer available</span>
          )}
          {/* Status badge — only show when it's moved past "applied" */}
          {app.status !== 'applied'
            ? <StatusBadge status={app.status} />
            : (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6.5L4.8 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Applied
              </span>
            )
          }
        </div>
        <p className="text-sm text-slate-500 truncate">
          {meta}
          {app.appliedAt && (
            <span className="text-slate-400" title={`Applied ${dateLabel(app.appliedAt)}`}> · {relativeTime(app.appliedAt)}</span>
          )}
          {salary && (
            <span className="text-emerald-700 font-medium"> · {salary}</span>
          )}
        </p>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        {job && (
          <Link
            to={`/jobs/${job.id}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ExternalLink size={13} /> View
          </Link>
        )}
        {applyUrl && (
          <a
            href={applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-pink-100 bg-pink-50 px-3 text-xs font-semibold text-pink-700 transition hover:bg-pink-100"
          >
            <RotateCcw size={12} /> Apply Again
          </a>
        )}
      </div>

    </Card>
  )
}
