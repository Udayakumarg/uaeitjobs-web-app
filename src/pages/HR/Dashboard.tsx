import { Edit, Link2, Plus, Trash2, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TableSkeleton } from '../../components/Skeleton'
import { useToastStore } from '../../components/Toast'
import { Button, Card, EmptyState } from '../../components/ui'
import { errorMessage, hrApi } from '../../services/api'
import type { Job, Page } from '../../types'
import { dateLabel } from '../../utils/format'

export default function HRDashboard() {
  const toast = useToastStore((state) => state.add)
  const [page, setPage] = useState<Page<Job> | null>(null)

  function load() {
    hrApi.jobs().then(({ data }) => setPage(data)).catch((error) => toast({ type: 'error', title: 'Could not load jobs', message: errorMessage(error) }))
  }

  useEffect(load, [toast])

  async function remove(id: number) {
    if (!window.confirm('Delete this job posting?')) return
    try {
      await hrApi.deleteJob(id)
      toast({ type: 'success', title: 'Job deleted' })
      load()
    } catch (error) {
      toast({ type: 'error', title: 'Could not delete job', message: errorMessage(error) })
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">HR dashboard</h1>
          <p className="mt-2 text-slate-600">Post jobs, import LinkedIn roles, and manage applicants.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/hr/linkedin-import"><Button variant="secondary"><Link2 size={16} /> LinkedIn import</Button></Link>
          <Link to="/hr/jobs/new"><Button><Plus size={16} /> Post job</Button></Link>
        </div>
      </div>

      {!page ? <div className="mt-6" aria-live="polite" aria-busy="true"><span className="sr-only">Loading posted jobs</span><TableSkeleton rows={5} columns={5} /></div> : page.content.length === 0 ? (
        <EmptyState title="No jobs posted yet." action={<Link to="/hr/jobs/new"><Button>Post your first job</Button></Link>} />
      ) : (
        <Card className="mt-6 overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600"><tr><th className="p-4">Title</th><th className="p-4">Company</th><th className="p-4">Views</th><th className="p-4">Created</th><th className="p-4">Actions</th></tr></thead>
            <tbody>{page.content.map((job) => (
              <tr key={job.id} className="border-t border-slate-100">
                <td className="p-4 font-semibold text-slate-950">{job.title}</td>
                <td className="p-4">{job.companyName}</td>
                <td className="p-4">{job.viewCount ?? 0}</td>
                <td className="p-4">{dateLabel(job.createdAt)}</td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <Link to={`/hr/jobs/${job.id}/applicants`}><Button variant="secondary" aria-label={`View applicants for ${job.title}`}><Users size={15} /></Button></Link>
                    <Link to={`/hr/jobs/${job.id}/edit`}><Button variant="secondary" aria-label={`Edit ${job.title}`}><Edit size={15} /></Button></Link>
                    <Button variant="danger" aria-label={`Delete ${job.title}`} onClick={() => remove(job.id)}><Trash2 size={15} /></Button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      )}
    </main>
  )
}
