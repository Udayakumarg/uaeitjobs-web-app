import { Activity, AlertCircle, CheckCircle, Clock, Play, RefreshCw, Repeat2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useToastStore } from '../../components/Toast'
import { Button, Card } from '../../components/ui'
import { adminApi, errorMessage } from '../../services/api'
import type { IngestRunLog, IngestStatus } from '../../types'

const SOURCE_COLORS: Record<string, string> = {
  jsearch:   'bg-violet-100 text-violet-700',
  adzuna:    'bg-sky-100 text-sky-700',
  remoteok:  'bg-emerald-100 text-emerald-700',
  himalayas: 'bg-amber-100 text-amber-700',
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${SOURCE_COLORS[source] ?? 'bg-slate-100 text-slate-600'}`}>
      {source}
    </span>
  )
}

function RunRow({ run }: { run: IngestRunLog }) {
  const dupes = run.duplicatesL1 + run.duplicatesL2 + run.duplicatesL3
  const duration = run.finishedAt
    ? Math.round((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)
    : null

  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
      <td className="py-2.5 px-4 text-xs text-slate-500 whitespace-nowrap">
        {new Date(run.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        {duration != null && <span className="ml-1.5 text-slate-400">({duration}s)</span>}
      </td>
      <td className="py-2.5 px-4"><SourceBadge source={run.source} /></td>
      <td className="py-2.5 px-4 text-xs text-slate-600 max-w-[220px] truncate" title={run.keyword ?? ''}>
        {run.keyword ?? <span className="text-slate-300">—</span>}
      </td>
      <td className="py-2.5 px-4 text-center text-sm font-semibold text-slate-800">{run.fetched}</td>
      <td className="py-2.5 px-4 text-center">
        {run.inserted > 0
          ? <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">+{run.inserted}</span>
          : <span className="text-xs text-slate-300">0</span>}
      </td>
      <td className="py-2.5 px-4 text-center text-xs text-slate-400">
        {dupes > 0 ? dupes : <span className="text-slate-200">—</span>}
      </td>
      <td className="py-2.5 px-4 text-center text-xs text-slate-400">
        {run.rejectedHard + run.rejectedScore > 0
          ? run.rejectedHard + run.rejectedScore
          : <span className="text-slate-200">—</span>}
      </td>
      <td className="py-2.5 px-4 max-w-[200px] truncate">
        {run.error
          ? <span className="text-xs text-red-500" title={run.error}>{run.error}</span>
          : run.finishedAt
            ? <span className="text-xs text-emerald-500">OK</span>
            : <span className="text-xs text-amber-500 animate-pulse">running…</span>}
      </td>
    </tr>
  )
}

function StatCard({ label, value, icon, color, bg }: { label: string; value: number; icon: React.ReactNode; color: string; bg: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className={`rounded-lg p-2 ${bg} ${color}`}>{icon}</span>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value.toLocaleString()}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </Card>
  )
}

export default function IngestDashboard() {
  const [status, setStatus] = useState<IngestStatus | null>(null)
  const [triggering, setTriggering] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { add: toast } = useToastStore()

  const load = async () => {
    try {
      const { data } = await adminApi.ingestStatus(100)
      setStatus(data)
    } catch { /* silent */ }
  }

  useEffect(() => {
    load()
    intervalRef.current = setInterval(load, 8000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const trigger = async () => {
    setTriggering(true)
    try {
      const { data } = await adminApi.runIngest()
      toast({ type: 'success', title: 'Ingest started', message: data.message })
      setTimeout(load, 1500)
    } catch (e) {
      toast({ type: 'error', title: 'Failed to start', message: errorMessage(e) })
    } finally {
      setTriggering(false)
    }
  }

  // Today's aggregates
  const today = new Date().toDateString()
  const todayRuns = status?.recent.filter(r => new Date(r.startedAt).toDateString() === today) ?? []
  const totalFetched  = todayRuns.reduce((s, r) => s + r.fetched, 0)
  const totalInserted = todayRuns.reduce((s, r) => s + r.inserted, 0)
  const totalDupes    = todayRuns.reduce((s, r) => s + r.duplicatesL1 + r.duplicatesL2 + r.duplicatesL3, 0)
  const totalRejected = todayRuns.reduce((s, r) => s + r.rejectedHard + r.rejectedScore, 0)

  // Efficiency % — how many fetched jobs were actually new
  const efficiency = totalFetched > 0 ? Math.round((totalInserted / totalFetched) * 100) : null

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ingest Monitor</h1>
          <p className="mt-1 text-sm text-slate-500">
            Live job ingestion stats — auto-refreshes every 8 s
            {efficiency != null && (
              <span className="ml-2 font-medium text-slate-700">
                · today's fetch efficiency: <span className={efficiency >= 50 ? 'text-emerald-600' : 'text-amber-600'}>{efficiency}%</span>
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status?.running && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              <Activity size={12} className="animate-pulse" /> Running…
            </span>
          )}
          <Button onClick={load} variant="secondary" size="sm">
            <RefreshCw size={13} /> Refresh
          </Button>
          <Button onClick={trigger} disabled={triggering || !!status?.running} size="sm">
            <Play size={13} /> {triggering ? 'Starting…' : 'Run Now'}
          </Button>
        </div>
      </div>

      {/* Today's summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Fetched today"  value={totalFetched}  icon={<Repeat2 size={16} />}      color="text-violet-600" bg="bg-violet-50" />
        <StatCard label="New jobs saved" value={totalInserted} icon={<CheckCircle size={16} />}  color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard label="Duplicates"     value={totalDupes}    icon={<Clock size={16} />}          color="text-slate-500"   bg="bg-slate-100" />
        <StatCard label="Rejected"       value={totalRejected} icon={<AlertCircle size={16} />}   color="text-red-500"     bg="bg-red-50" />
      </div>

      {/* Runs table */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Recent runs</h2>
          <span className="text-xs text-slate-400">Last 100 entries · newest first</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2.5">Time</th>
                <th className="px-4 py-2.5">Source</th>
                <th className="px-4 py-2.5">Keyword</th>
                <th className="px-4 py-2.5 text-center">Fetched</th>
                <th className="px-4 py-2.5 text-center">Inserted</th>
                <th className="px-4 py-2.5 text-center">Dupes</th>
                <th className="px-4 py-2.5 text-center">Rejected</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {!status && (
                <tr><td colSpan={8} className="py-12 text-center text-sm text-slate-400">Loading…</td></tr>
              )}
              {status?.recent.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-sm text-slate-400">No ingest runs yet</td></tr>
              )}
              {status?.recent.map(r => <RunRow key={r.id} run={r} />)}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
