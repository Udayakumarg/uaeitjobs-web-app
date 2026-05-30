import { Archive, ArchiveRestore, Briefcase, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useToastStore } from '../../components/Toast'
import { Button, Card } from '../../components/ui'
import { adminApi, errorMessage } from '../../services/api'
import type { Job } from '../../types'

type Filter = 'all' | 'active' | 'archived'

export default function AdminJobs() {
  const [jobs, setJobs]         = useState<Job[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(0)
  const [filter, setFilter]     = useState<Filter>('all')
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [busy, setBusy]         = useState<number | null>(null)
  const toast = useToastStore()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, size: 20 }
      if (filter === 'active')   params.active = true
      if (filter === 'archived') params.active = false
      if (search.trim())         params.q = search.trim()
      const { data } = await adminApi.jobs(params as never)
      setJobs(data.content)
      setTotal(data.totalElements)
    } catch (e) {
      toast.add({ type: 'error', title: 'Failed to load jobs', message: errorMessage(e) })
    } finally {
      setLoading(false)
    }
  }, [page, filter, search, toast])

  useEffect(() => { load() }, [load])

  const toggleActive = async (job: Job) => {
    const newActive = !job.active
    setBusy(job.id)
    try {
      await adminApi.setJobActive(job.id, newActive)
      toast.add({
        type: 'success',
        title: newActive ? 'Job restored' : 'Job archived',
        message: job.title,
      })
      load()
    } catch (e) {
      toast.add({ type: 'error', title: 'Action failed', message: errorMessage(e) })
    } finally {
      setBusy(null)
    }
  }

  const filterBtns: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'archived', label: 'Archived' },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Briefcase className="h-6 w-6 text-sky-500" />
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Job Management</h1>
        <span className="ml-auto text-sm text-slate-500">{total} job(s)</span>
      </div>

      {/* Toolbar */}
      <Card className="flex flex-wrap items-center gap-3 p-3">
        {/* Filter tabs */}
        <div className="flex rounded-lg border border-slate-200 text-sm">
          {filterBtns.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setFilter(key); setPage(0) }}
              className={`px-3 py-1.5 font-medium transition first:rounded-l-lg last:rounded-r-lg ${
                filter === key
                  ? 'bg-sky-500 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title or company..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : jobs.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No jobs found</td></tr>
            ) : jobs.map(job => (
              <tr key={job.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-mono text-xs text-slate-400">{job.id}</td>
                <td className="px-4 py-3 font-medium text-slate-800 max-w-[280px] truncate">{job.title}</td>
                <td className="px-4 py-3 text-slate-600 max-w-[160px] truncate">{job.companyName}</td>
                <td className="px-4 py-3 text-slate-500 max-w-[140px] truncate">{job.locationUae || '-'}</td>
                <td className="px-4 py-3">
                  <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    {job.source || 'manual'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    job.active ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {job.active ? 'Active' : 'Archived'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant={job.active ? 'secondary' : 'primary'}
                    onClick={() => toggleActive(job)}
                    disabled={busy === job.id}
                  >
                    {job.active ? (
                      <><Archive className="h-3.5 w-3.5" /> Archive</>
                    ) : (
                      <><ArchiveRestore className="h-3.5 w-3.5" /> Restore</>
                    )}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-slate-500">
            Page {page + 1} of {Math.ceil(total / 20)}
          </span>
          <Button size="sm" variant="secondary" disabled={(page + 1) * 20 >= total} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
