import { Download, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { TableSkeleton } from '../../components/Skeleton'
import { StatusBadge } from '../../components/StatusBadge'
import { useToastStore } from '../../components/Toast'
import { Button, Card, Select } from '../../components/ui'
import { errorMessage, hrApi } from '../../services/api'
import type { Application, ApplicationStatus, Page } from '../../types'
import { dateLabel } from '../../utils/format'

const STATUS_OPTIONS: { value: ApplicationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'applied', label: 'Applied' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'hired', label: 'Hired' },
]

function parseSkills(raw?: string): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, 5) : []
  } catch {
    return raw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 5)
  }
}

export default function HRApplicants() {
  const { id } = useParams()
  const toast = useToastStore((state) => state.add)
  const [page, setPage] = useState<Page<Application> | null>(null)
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all')

  function load() {
    if (!id) return
    hrApi.applicants(Number(id)).then(({ data }) => setPage(data)).catch((error) =>
      toast({ type: 'error', title: 'Could not load applicants', message: errorMessage(error) }),
    )
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

  const filtered = page?.content.filter((a) => statusFilter === 'all' || a.status === statusFilter) ?? []
  const total = page?.totalElements ?? 0

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Applicants</h1>
          {page && (
            <p className="mt-1 text-sm text-slate-500">
              {total} applicant{total !== 1 ? 's' : ''} total
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600" htmlFor="status-filter">
            Filter by status
          </label>
          <Select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | 'all')}
            className="w-44"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {!page ? (
        <div className="mt-6" aria-live="polite" aria-busy="true">
          <span className="sr-only">Loading applicants</span>
          <TableSkeleton rows={5} columns={6} />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="mt-6 p-10 text-center text-slate-500">
          {statusFilter === 'all'
            ? 'No applicants yet.'
            : `No applicants with status "${statusFilter}".`}
        </Card>
      ) : (
        <Card className="mt-6 overflow-x-auto p-0">
          <table className="w-full min-w-[1060px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-4">Applicant</th>
                <th className="p-4">Profile</th>
                <th className="p-4">Cover Letter</th>
                <th className="p-4">CV</th>
                <th className="p-4">Status</th>
                <th className="p-4">Applied</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((application) => {
                const skills = parseSkills(application.skills)
                return (
                  <tr key={application.id} className="border-t border-slate-100 align-top">
                    {/* Applicant name + headline + contact */}
                    <td className="p-4">
                      <p className="font-semibold text-slate-950">
                        {application.applicant?.displayName ??
                          application.applicant?.email ??
                          'Applicant'}
                      </p>
                      {application.headline && (
                        <p className="mt-0.5 text-xs text-slate-500">{application.headline}</p>
                      )}
                      <div className="mt-2 space-y-0.5">
                        {application.applicant?.email && (
                          <a
                            href={`mailto:${application.applicant.email}`}
                            className="flex items-center gap-1 text-xs text-pink-600 hover:underline"
                          >
                            <Mail size={11} />
                            {application.applicant.email}
                          </a>
                        )}
                        {application.applicant?.phone && (
                          <p className="text-xs text-slate-500">{application.applicant.phone}</p>
                        )}
                      </div>
                    </td>

                    {/* Seeker profile: experience, visa status, skills */}
                    <td className="p-4">
                      <div className="space-y-1">
                        {application.yearsExperience != null && (
                          <p className="text-xs text-slate-700">
                            {application.yearsExperience}{' '}
                            yr{application.yearsExperience !== 1 ? 's' : ''} exp
                          </p>
                        )}
                        {application.visaStatus && (
                          <p className="text-xs capitalize text-slate-500">
                            {application.visaStatus.replace(/_/g, ' ')}
                          </p>
                        )}
                        {skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {skills.map((skill) => (
                              <span
                                key={skill}
                                className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                        {application.yearsExperience == null &&
                          !application.visaStatus &&
                          skills.length === 0 && (
                            <span className="text-xs text-slate-400">No profile</span>
                          )}
                      </div>
                    </td>

                    {/* Cover letter */}
                    <td className="max-w-xs p-4">
                      {application.coverLetter ? (
                        <p className="line-clamp-3 text-sm text-slate-600">
                          {application.coverLetter}
                        </p>
                      ) : (
                        <span className="text-xs italic text-slate-400">No cover letter</span>
                      )}
                    </td>

                    {/* CV download */}
                    <td className="p-4">
                      {application.cvUrl ? (
                        <a
                          href={application.cvUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        >
                          <Button variant="secondary" className="whitespace-nowrap">
                            <Download size={13} /> Download CV
                          </Button>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">No CV</span>
                      )}
                    </td>

                    {/* Status badge + dropdown */}
                    <td className="p-4">
                      <div className="grid gap-2">
                        <StatusBadge status={application.status} />
                        <Select
                          value={application.status}
                          onChange={(e) =>
                            setStatus(application.id, e.target.value as ApplicationStatus)
                          }
                        >
                          <option value="applied">Applied</option>
                          <option value="reviewed">Reviewed</option>
                          <option value="shortlisted">Shortlisted</option>
                          <option value="rejected">Rejected</option>
                          <option value="hired">Hired</option>
                        </Select>
                      </div>
                    </td>

                    {/* Applied date */}
                    <td className="whitespace-nowrap p-4 text-slate-500">
                      {dateLabel(application.appliedAt)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
    </main>
  )
}
