import { Edit, ExternalLink, Globe, Plus, Trash2, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TableSkeleton } from '../../components/Skeleton'
import { useToastStore } from '../../components/Toast'
import { Button, Card, EmptyState } from '../../components/ui'
import { errorMessage, hrApi } from '../../services/api'
import type { Job, Page } from '../../types'
import { dateLabel } from '../../utils/format'

type TabValue = 'all' | 'posted' | 'imported'

const TABS: { value: TabValue; label: string }[] = [
  { value: 'all',      label: 'All'         },
  { value: 'posted',   label: 'Direct posts' },
  { value: 'imported', label: 'Imported'    },
]

function isImported(job: Job) {
  return job.source === 'linkedin' || !!job.applyUrl || !!job.linkedinUrl
}

function LiIcon() {
  return (
    <svg width={10} height={10} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function SourceBadge({ job }: { job: Job }) {
  if (job.source === 'linkedin' || !!job.linkedinUrl) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#0a66c2]/10 px-2 py-0.5 text-[11px] font-semibold text-[#0a66c2]">
        <LiIcon /> LinkedIn
      </span>
    )
  }
  if (job.applyUrl) {
    let host = ''
    try { host = new URL(job.applyUrl).hostname.replace(/^www\./, '') } catch { /* ignore */ }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
        <ExternalLink size={10} /> {host || 'URL import'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
      Direct
    </span>
  )
}

export default function HRDashboard() {
  const toast = useToastStore((state) => state.add)
  const [page, setPage] = useState<Page<Job> | null>(null)
  const [tab, setTab] = useState<TabValue>('all')

  function load() {
    hrApi.jobs().then(({ data }) => setPage(data)).catch((error) =>
      toast({ type: 'error', title: 'Could not load jobs', message: errorMessage(error) }),
    )
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

  const allJobs = page?.content ?? []
  const filtered = allJobs.filter((job) => {
    if (tab === 'posted')   return !isImported(job)
    if (tab === 'imported') return isImported(job)
    return true
  })

  const counts = {
    all:      allJobs.length,
    posted:   allJobs.filter((j) => !isImported(j)).length,
    imported: allJobs.filter((j) => isImported(j)).length,
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">HR dashboard</h1>
          <p className="mt-2 text-slate-600">Post jobs, import from any URL or LinkedIn, and manage applicants.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/hr/linkedin-import"><Button variant="secondary"><Globe size={16} /> Import from URL</Button></Link>
          <Link to="/hr/jobs/new"><Button><Plus size={16} /> Post job</Button></Link>
        </div>
      </div>

      {!page ? (
        <div className="mt-6" aria-live="polite" aria-busy="true">
          <span className="sr-only">Loading posted jobs</span>
          <TableSkeleton rows={5} columns={5} />
        </div>
      ) : allJobs.length === 0 ? (
        <EmptyState title="No jobs posted yet." action={<Link to="/hr/jobs/new"><Button>Post your first job</Button></Link>} />
      ) : (
        <>
          {/* Filter tabs */}
          <div className="mt-6 flex gap-1 border-b border-slate-200">
            {TABS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                className={[
                  'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                  tab === value
                    ? 'border-pink-600 text-pink-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800',
                ].join(' ')}
              >
                {label}
                <span className={[
                  'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                  tab === value ? 'bg-pink-100 text-pink-700' : 'bg-slate-100 text-slate-500',
                ].join(' ')}>
                  {counts[value]}
                </span>
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <Card className="mt-4 p-10 text-center text-slate-500">
              No {tab === 'posted' ? 'directly posted' : 'imported'} jobs yet.
            </Card>
          ) : (
            <Card className="mt-4 overflow-x-auto p-0">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-4">Title</th>
                    <th className="p-4">Company</th>
                    <th className="p-4">Source</th>
                    <th className="p-4">Views</th>
                    <th className="p-4">Created</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((job) => (
                    <tr key={job.id} className="border-t border-slate-100">
                      <td className="p-4 font-semibold text-slate-950">{job.title}</td>
                      <td className="p-4 text-slate-600">{job.companyName}</td>
                      <td className="p-4"><SourceBadge job={job} /></td>
                      <td className="p-4 text-slate-600">{job.viewCount ?? 0}</td>
                      <td className="p-4 text-slate-500">{dateLabel(job.createdAt)}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Link to={`/hr/jobs/${job.id}/applicants`}>
                            <Button variant="secondary" aria-label={`View applicants for ${job.title}`}>
                              <Users size={15} />
                            </Button>
                          </Link>
                          <Link to={`/hr/jobs/${job.id}/edit`}>
                            <Button variant="secondary" aria-label={`Edit ${job.title}`}>
                              <Edit size={15} />
                            </Button>
                          </Link>
                          <Button variant="danger" aria-label={`Delete ${job.title}`} onClick={() => remove(job.id)}>
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </main>
  )
}
