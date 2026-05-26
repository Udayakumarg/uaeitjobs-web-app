import {
  Activity, AlertCircle, CheckCircle, Clock, Play,
  RefreshCw, Repeat2, TrendingUp, Zap
} from 'lucide-react'
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
  const insertRate = run.fetched > 0 ? Math.round((run.inserted / run.fetched) * 100) : null

  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
      <td className="py-2.5 px-4 text-xs text-slate-500 whitespace-nowrap">
        {new Date(run.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        {duration != null && <span className="ml-1.5 text-slate-400">({duration}s)</span>}
      </td>
      <td className="py-2.5 px-4"><SourceBadge source={run.source} /></td>
      <td className="py-2.5 px-4 text-xs text-slate-600 max-w-[200px] truncate" title={run.keyword ?? ''}>
        {run.keyword ?? <span className="text-slate-300">—</span>}
      </td>
      <td className="py-2.5 px-4 text-center text-sm font-semibold text-slate-700">{run.fetched}</td>
      <td className="py-2.5 px-4 text-center">
        {run.inserted > 0
          ? <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">+{run.inserted}</span>
          : <span className="text-xs text-slate-300">0</span>}
      </td>
      <td className="py-2.5 px-4 text-center text-xs">
        {insertRate != null && run.fetched > 0
          ? <span className={insertRate >= 30 ? 'text-emerald-600 font-medium' : insertRate >= 10 ? 'text-amber-600' : 'text-red-400'}>
              {insertRate}%
            </span>
          : <span className="text-slate-200">—</span>}
      </td>
      <td className="py-2.5 px-4 text-center text-xs text-slate-400">
        {dupes > 0 ? dupes : <span className="text-slate-200">—</span>}
      </td>
      <td className="py-2.5 px-4 text-center text-xs">
        {run.rejectedHard + run.rejectedScore > 0
          ? <span className="text-red-400">{run.rejectedHard + run.rejectedScore}</span>
          : <span className="text-slate-200">—</span>}
      </td>
      <td className="py-2.5 px-4 max-w-[180px]">
        {run.error
          ? <span className="text-xs text-red-500 truncate block" title={run.error}>{run.error}</span>
          : run.finishedAt
            ? <span className="text-xs text-emerald-500 font-medium">OK</span>
            : <span className="text-xs text-amber-500 animate-pulse">running…</span>}
      </td>
    </tr>
  )
}

function StatCard({
  label, value, sub, icon, color, bg
}: {
  label: string; value: string | number; sub?: string
  icon: React.ReactNode; color: string; bg: string
}) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className={`rounded-xl p-2.5 ${bg} ${color} shrink-0`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-900 tabular-nums">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="text-xs text-slate-500 mt-0.5 truncate">{label}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </Card>
  )
}

function keywordStats(runs: IngestRunLog[]) {
  const map = new Map<string, { fetched: number; inserted: number; runs: number }>()
  for (const r of runs) {
    if (!r.keyword || r.source !== 'jsearch') continue
    const e = map.get(r.keyword) ?? { fetched: 0, inserted: 0, runs: 0 }
    e.fetched  += r.fetched
    e.inserted += r.inserted
    e.runs++
    map.set(r.keyword, e)
  }
  return [...map.entries()]
    .map(([kw, s]) => ({ keyword: kw, ...s, rate: s.fetched > 0 ? Math.round((s.inserted / s.fetched) * 100) : 0 }))
    .sort((a, b) => b.inserted - a.inserted)
    .slice(0, 15)
}

export default function IngestDashboard() {
  const [status, setStatus]         = useState<IngestStatus | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [tab, setTab]               = useState<'runs' | 'keywords'>('runs')
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
      if (data.status === 'already_running') {
        toast({ type: 'info', title: 'Already running', message: data.message })
      } else {
        toast({ type: 'success', title: 'Ingest started', message: data.message })
      }
      setTimeout(load, 1500)
    } catch (e) {
      toast({ type: 'error', title: 'Failed to start', message: errorMessage(e) })
    } finally {
      setTriggering(false)
    }
  }

  const recent = status?.recent ?? []
  const allFetched  = recent.reduce((s, r) => s + r.fetched,   0)
  const allInserted = recent.reduce((s, r) => s + r.inserted,  0)
  const allDupes    = recent.reduce((s, r) => s + r.duplicatesL1 + r.duplicatesL2 + r.duplicatesL3, 0)
  const allRejected = recent.reduce((s, r) => s + r.rejectedHard + r.rejectedScore, 0)

  const today         = new Date().toDateString()
  const todayRuns     = recent.filter(r => new Date(r.startedAt).toDateString() === today)
  const todayInserted = todayRuns.reduce((s, r) => s + r.inserted, 0)
  const todayFetched  = todayRuns.reduce((s, r) => s + r.fetched,  0)
  const efficiency    = todayFetched > 0 ? Math.round((todayInserted / todayFetched) * 100) : null

  const kwStats = keywordStats(recent)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap size={22} className="text-violet-500" /> Ingest Monitor
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Live job ingestion · auto-refresh every 8 s
            {efficiency != null && (
              <span className={`ml-2 font-semibold ${efficiency >= 30 ? 'text-emerald-600' : 'text-amber-600'}`}>
                · today {efficiency}% efficiency
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status?.running && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 animate-pulse">
              <Activity size={12} /> Running…
            </span>
          )}
          <Button onClick={load} variant="secondary" size="sm">
            <RefreshCw size={13} /> Refresh
          </Button>
          <Button
            onClick={trigger}
            disabled={triggering || !!status?.running}
            size="sm"
          >
            <Play size={13} />
            {triggering ? 'Starting…' : status?.running ? 'Running…' : 'Run Now'}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Fetched (last 100 runs)"
          value={allFetched}
          sub={`${todayFetched} today`}
          icon={<Repeat2 size={18} />}
          color="text-violet-600" bg="bg-violet-50"
        />
        <StatCard
          label="New jobs saved"
          value={allInserted}
          sub={`${todayInserted} today`}
          icon={<CheckCircle size={18} />}
          color="text-emerald-600" bg="bg-emerald-50"
        />
        <StatCard
          label="Duplicates skipped"
          value={allDupes}
          icon={<Clock size={18} />}
          color="text-slate-500" bg="bg-slate-100"
        />
        <StatCard
          label="Rejected (hard + score)"
          value={allRejected}
          icon={<AlertCircle size={18} />}
          color="text-red-500" bg="bg-red-50"
        />
      </div>

      {/* Pipeline efficiency bar */}
      {allFetched > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <TrendingUp size={13} /> Pipeline efficiency (last 100 runs)
            </span>
            <span className="text-xs text-slate-500">
              {allInserted.toLocaleString()} saved · {allDupes.toLocaleString()} dupes · {allRejected.toLocaleString()} rejected
            </span>
          </div>
          <div className="h-3 rounded-full bg-slate-100 overflow-hidden flex">
            <div
              className="bg-emerald-500 transition-all duration-500"
              style={{ width: `${(allInserted / allFetched) * 100}%` }}
              title={`Saved: ${Math.round((allInserted / allFetched) * 100)}%`}
            />
            <div
              className="bg-slate-300"
              style={{ width: `${(allDupes / allFetched) * 100}%` }}
              title={`Dupes: ${Math.round((allDupes / allFetched) * 100)}%`}
            />
            <div
              className="bg-red-300"
              style={{ width: `${(allRejected / allFetched) * 100}%` }}
              title={`Rejected: ${Math.round((allRejected / allFetched) * 100)}%`}
            />
          </div>
          <div className="flex gap-4 mt-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Saved</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-300 inline-block" /> Duplicates</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-300 inline-block" /> Rejected</span>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-4 flex items-center justify-between">
          <div className="flex">
            {(['runs', 'keywords'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  tab === t
                    ? 'border-violet-500 text-violet-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {t === 'runs' ? 'Recent Runs' : 'Keyword Performance'}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400 pr-2">Last 100 entries</span>
        </div>

        {tab === 'runs' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-2.5">Time</th>
                  <th className="px-4 py-2.5">Source</th>
                  <th className="px-4 py-2.5">Keyword</th>
                  <th className="px-4 py-2.5 text-center">Fetched</th>
                  <th className="px-4 py-2.5 text-center">Saved</th>
                  <th className="px-4 py-2.5 text-center">Rate</th>
                  <th className="px-4 py-2.5 text-center">Dupes</th>
                  <th className="px-4 py-2.5 text-center">Rejected</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {!status && (
                  <tr><td colSpan={9} className="py-16 text-center text-sm text-slate-400">Loading…</td></tr>
                )}
                {status?.recent.length === 0 && (
                  <tr><td colSpan={9} className="py-16 text-center text-sm text-slate-400">No ingest runs yet</td></tr>
                )}
                {status?.recent.map(r => <RunRow key={r.id} run={r} />)}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'keywords' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-2.5">Keyword</th>
                  <th className="px-4 py-2.5 text-center">Runs</th>
                  <th className="px-4 py-2.5 text-center">Fetched</th>
                  <th className="px-4 py-2.5 text-center">Saved</th>
                  <th className="px-4 py-2.5 text-center">Rate</th>
                  <th className="px-4 py-2.5">Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {kwStats.length === 0 && (
                  <tr><td colSpan={6} className="py-16 text-center text-sm text-slate-400">No keyword data yet</td></tr>
                )}
                {kwStats.map(k => (
                  <tr key={k.keyword} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="py-2.5 px-4 text-sm font-medium text-slate-800">{k.keyword}</td>
                    <td className="py-2.5 px-4 text-center text-xs text-slate-500">{k.runs}</td>
                    <td className="py-2.5 px-4 text-center text-sm text-slate-700">{k.fetched}</td>
                    <td className="py-2.5 px-4 text-center">
                      {k.inserted > 0
                        ? <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">+{k.inserted}</span>
                        : <span className="text-xs text-slate-300">0</span>}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`text-xs font-semibold ${k.rate >= 30 ? 'text-emerald-600' : k.rate >= 10 ? 'text-amber-600' : 'text-red-400'}`}>
                        {k.rate}%
                      </span>
                    </td>
                    <td className="py-2.5 px-4 w-36">
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${k.rate >= 30 ? 'bg-emerald-500' : k.rate >= 10 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${Math.min(100, k.rate * 2)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
