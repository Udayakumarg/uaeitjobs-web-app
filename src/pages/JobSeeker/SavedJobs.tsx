import { BookmarkX, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CardSkeleton } from '../../components/Skeleton'
import { useToastStore } from '../../components/Toast'
import { Card, EmptyState } from '../../components/ui'
import { errorMessage, seekerApi } from '../../services/api'
import type { Job } from '../../types'
import { dateLabel, relativeTime } from '../../utils/format'

interface SavedItem {
  savedId: number
  job: Job
  savedAt: string
}

export default function SavedJobs() {
  const toast = useToastStore((state) => state.add)
  const [items, setItems] = useState<SavedItem[] | null>(null)

  useEffect(() => {
    seekerApi.savedJobs()
      .then(({ data }) => setItems(data.map((d) => ({ savedId: d.id, job: d.job, savedAt: d.savedAt }))))
      .catch((error) => toast({ type: 'error', title: 'Could not load saved jobs', message: errorMessage(error) }))
  }, [toast])

  async function unsave(jobId: number) {
    // Optimistic remove
    setItems((prev) => prev?.filter((item) => item.job.id !== jobId) ?? null)
    try {
      await seekerApi.unsaveJob(jobId)
      toast({ type: 'success', title: 'Removed from saved jobs' })
    } catch (err) {
      toast({ type: 'error', title: 'Could not remove', message: errorMessage(err) })
      // Re-fetch to restore accurate state
      seekerApi.savedJobs()
        .then(({ data }) => setItems(data.map((d) => ({ savedId: d.id, job: d.job, savedAt: d.savedAt }))))
        .catch(() => {})
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-950">Saved jobs</h1>

      {/* Loading skeleton */}
      {!items ? (
        <div className="mt-6 grid gap-3" aria-live="polite" aria-busy="true">
          <span className="sr-only">Loading saved jobs</span>
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} lines={2} />)}
        </div>
      ) : null}

      {/* Empty state */}
      {items?.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No saved jobs yet."
            description="Browse open roles and bookmark positions you want to revisit."
            action={
              <Link
                to="/jobs"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Browse jobs
              </Link>
            }
          />
        </div>
      ) : null}

      {/* Saved jobs list */}
      {items && items.length > 0 ? (
        <div className="mt-6 grid gap-3">
          {items.map(({ savedId, job, savedAt }) => (
            <Card key={savedId} className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap">
              <div className="min-w-0 flex-1">
                <Link
                  to={`/jobs/${job.id}`}
                  className="font-semibold text-slate-950 transition hover:text-pink-700"
                >
                  {job.title}
                </Link>
                <p className="mt-0.5 text-sm text-slate-500">
                  {job.companyName}
                  {job.locationUae ? ` · ${job.locationUae}` : ''}
                  {savedAt ? ` · Saved ${relativeTime(savedAt) || dateLabel(savedAt)}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  to={`/jobs/${job.id}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <ExternalLink size={13} /> View
                </Link>
                <button
                  type="button"
                  onClick={() => unsave(job.id)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                  aria-label={`Remove ${job.title} from saved jobs`}
                >
                  <BookmarkX size={13} /> Remove
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </main>
  )
}
