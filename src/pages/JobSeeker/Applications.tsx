import { ExternalLink, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CompanyLogo } from '../../components/CompanyLogo'
import { CardSkeleton } from '../../components/Skeleton'
import { StatusBadge } from '../../components/StatusBadge'
import { useToastStore } from '../../components/Toast'
import { Card, EmptyState } from '../../components/ui'
import { seekerApi, errorMessage } from '../../services/api'
import type { Application } from '../../types'
import { money, relativeTime } from '../../utils/format'

export default function JobSeekerApplications() {
  const toast = useToastStore(s => s.add)
  const [items,   setItems]   = useState<Application[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    seekerApi.applications(0, 100)
      .then(({ data }) => setItems(data.content))
      .catch(err => toast({ type: 'error', title: 'Could not load applications', message: errorMessage(err) }))
      .finally(() => setLoading(false))
  }, [toast])

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">My applications</h1>
          {items && items.length > 0 && (
            <p className="mt-1 text-sm text-slate-500">{items.length} job{items.length !== 1 ? 's' : ''} applied</p>
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

      {/* Empty state */}
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

      {/* Application cards */}
      {items && items.length > 0 && (
        <div className="grid gap-3">
          {items.map(app => (
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
  const applyUrl = job?.applyUrl ?? job?.linkedinUrl ?? null

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
            <span className="text-slate-400"> · {relativeTime(app.appliedAt)}</span>
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
