import { useEffect, useState } from 'react'
import { JobCard } from '../../components/JobCard'
import { useToastStore } from '../../components/Toast'
import { EmptyState } from '../../components/ui'
import { errorMessage, seekerApi } from '../../services/api'
import type { Job } from '../../types'

export default function SavedJobs() {
  const toast = useToastStore((state) => state.add)
  const [jobs, setJobs] = useState<Job[] | null>(null)

  useEffect(() => {
    seekerApi.savedJobs()
      .then(({ data }) => setJobs(data.map((item) => item.job)))
      .catch((error) => toast({ type: 'error', title: 'Could not load saved jobs', message: errorMessage(error) }))
  }, [toast])

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-950">Saved jobs</h1>
      {!jobs ? <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-64 animate-pulse rounded-lg bg-slate-200" />)}</div> : null}
      {jobs?.length === 0 ? <EmptyState title="No saved jobs yet." /> : null}
      {jobs && jobs.length > 0 ? <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{jobs.map((job) => <JobCard key={job.id} job={job} />)}</div> : null}
    </main>
  )
}
