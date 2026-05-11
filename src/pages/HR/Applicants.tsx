import { Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { TableSkeleton } from '../../components/Skeleton'
import { StatusBadge } from '../../components/StatusBadge'
import { useToastStore } from '../../components/Toast'
import { Button, Card, Select } from '../../components/ui'
import { errorMessage, hrApi } from '../../services/api'
import type { Application, ApplicationStatus, Page } from '../../types'
import { dateLabel } from '../../utils/format'

export default function HRApplicants() {
  const { id } = useParams()
  const toast = useToastStore((state) => state.add)
  const [page, setPage] = useState<Page<Application> | null>(null)

  function load() {
    if (!id) return
    hrApi.applicants(Number(id)).then(({ data }) => setPage(data)).catch((error) => toast({ type: 'error', title: 'Could not load applicants', message: errorMessage(error) }))
  }

  useEffect(load, [id, toast])

  async function setStatus(applicationId: number, status: ApplicationStatus) {
    try {
      await hrApi.updateApplication(applicationId, status)
      toast({ type: 'success', title: 'Status updated' })
      load()
    } catch (error) {
      toast({ type: 'error', title: 'Could not update status', message: errorMessage(error) })
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-950">Applicants</h1>
      {!page ? <div className="mt-6" aria-live="polite" aria-busy="true"><span className="sr-only">Loading applicants</span><TableSkeleton rows={5} columns={5} /></div> : (
        <Card className="mt-6 overflow-x-auto p-0">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600"><tr><th className="p-4">Applicant</th><th className="p-4">Cover letter</th><th className="p-4">Status</th><th className="p-4">Applied</th><th className="p-4">Contact</th></tr></thead>
            <tbody>{page.content.map((application) => (
              <tr key={application.id} className="border-t border-slate-100 align-top">
                <td className="p-4 font-semibold text-slate-950">{application.applicant?.displayName ?? application.applicant?.email ?? 'Applicant'}</td>
                <td className="max-w-sm p-4 text-slate-600">{application.coverLetter || 'No cover letter.'}</td>
                <td className="p-4">
                  <div className="grid gap-2">
                    <StatusBadge status={application.status} />
                    <Select value={application.status} onChange={(e) => setStatus(application.id, e.target.value as ApplicationStatus)}>
                      <option value="applied">Applied</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="rejected">Rejected</option>
                      <option value="hired">Hired</option>
                    </Select>
                  </div>
                </td>
                <td className="p-4">{dateLabel(application.appliedAt)}</td>
                <td className="p-4">{application.applicant?.email ? <a href={`mailto:${application.applicant.email}`}><Button variant="secondary"><Mail size={15} /> Email</Button></a> : null}</td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      )}
    </main>
  )
}
