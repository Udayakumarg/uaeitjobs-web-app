import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TableSkeleton } from '../../components/Skeleton'
import { StatusBadge } from '../../components/StatusBadge'
import { Card, EmptyState } from '../../components/ui'
import { errorMessage, seekerApi } from '../../services/api'
import type { Application, Page } from '../../types'
import { dateLabel } from '../../utils/format'

export default function JobSeekerApplications() {
  const [page, setPage] = useState<Page<Application> | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    seekerApi.applications().then(({ data }) => setPage(data)).catch((err) => setError(errorMessage(err)))
  }, [])

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-950">My applications</h1>
      {error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-red-700">{error}</p> : null}
      {!page ? <div className="mt-6" aria-live="polite" aria-busy="true"><span className="sr-only">Loading applications</span><TableSkeleton rows={5} columns={4} /></div> : page.content.length === 0 ? <EmptyState title="No applications yet." /> : (
        <Card className="mt-6 overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600"><tr><th className="p-4">Role</th><th className="p-4">Company</th><th className="p-4">Status</th><th className="p-4">Applied</th></tr></thead>
            <tbody>{page.content.map((application) => (
              <tr key={application.id} className="border-t border-slate-100">
                <td className="p-4 font-semibold text-slate-950">{application.job ? <Link className="text-teal-700" to={`/jobs/${application.job.id}`}>{application.job.title}</Link> : 'Job'}</td>
                <td className="p-4">{application.job?.companyName ?? 'Company'}</td>
                <td className="p-4"><StatusBadge status={application.status} /></td>
                <td className="p-4">{dateLabel(application.appliedAt)}</td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      )}
    </main>
  )
}
