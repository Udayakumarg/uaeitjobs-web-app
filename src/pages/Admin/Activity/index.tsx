import {
  Activity,
  CheckCircle2,
  Clock,
  Globe2,
  LogIn,
  Mail,
  RefreshCw,
  Shield,
  TrendingUp,
  Users,
  UserX,
  Wifi,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useToastStore } from '../../../components/Toast'
import { Button, Card } from '../../../components/ui'
import { adminApi, errorMessage } from '../../../services/api'
import type { FrictionSignal, UserActivityStats, UserRow } from '../../../types'
import FrictionSignals from './FrictionSignals'
import LoginFailureBreakdown from './LoginFailureBreakdown'
import LoginHealthSummary from './LoginHealthSummary'

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const m  = Math.floor(ms / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function shortDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{children}</p>
  )
}

// ── Hero stat card ────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: number
  color?: string
  sub?: string
}

function StatCard({ icon: Icon, label, value, color = 'text-sky-500', sub }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 ${color}`}>
          <Icon size={18} />
        </span>
        <span className="text-2xl font-bold tabular-nums text-slate-900">{value.toLocaleString()}</span>
      </div>
      <p className="mt-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  )
}

// ── Engagement strip — compact single card replacing the second row of 5 ──────

interface EngagementItem {
  label: string
  value: number
  color: string
  icon: React.ElementType
}

function EngagementStrip({ data }: { data: UserActivityStats }) {
  const items: EngagementItem[] = [
    { label: 'Active today',   value: data.activeToday,      color: 'text-violet-600', icon: LogIn      },
    { label: 'Active 7 days',  value: data.activeLast7Days,  color: 'text-violet-500', icon: Activity   },
    { label: 'Active 30 days', value: data.activeLast30Days, color: 'text-violet-400', icon: Activity   },
    { label: 'New this week',  value: data.newLast7Days,     color: 'text-pink-500',   icon: TrendingUp },
    { label: 'New this month', value: data.newLast30Days,    color: 'text-pink-400',   icon: Shield     },
  ]
  return (
    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          <TrendingUp size={11} />
          Engagement
        </span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-5 sm:divide-y-0">
        {items.map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3 sm:flex-col sm:gap-1 sm:px-3 sm:py-3 sm:text-center">
            <Icon size={14} className={`shrink-0 ${color} opacity-60`} />
            <div className="sm:w-full">
              <p className={`text-lg font-bold tabular-nums leading-none ${color}`}>{value.toLocaleString()}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── User row table ────────────────────────────────────────────────────────────

interface UserTableProps {
  title: string
  icon: React.ElementType
  iconColor?: string
  rows: UserRow[]
  emptyMessage: string
  showResend?: boolean
  showLastLogin?: boolean
  onResend?: (user: UserRow) => void
  resendingId?: number | null
}

function UserTable({
  title, icon: Icon, iconColor = 'text-sky-500',
  rows, emptyMessage, showResend, showLastLogin, onResend, resendingId,
}: UserTableProps) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <Icon size={16} className={iconColor} />
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
          {rows.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-400">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Joined</th>
                {showLastLogin && <th className="px-4 py-2">Last login</th>}
                {showResend && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="max-w-[220px] truncate px-4 py-2.5 font-medium text-slate-800">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      u.userType === 'hr'     ? 'bg-sky-100 text-sky-700'
                      : u.userType === 'admin' ? 'bg-red-100 text-red-700'
                      : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {u.userType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{timeAgo(u.createdAt)}</td>
                  {showLastLogin && (
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{shortDate(u.lastLogin)}</td>
                  )}
                  {showResend && (
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => onResend?.(u)}
                        disabled={resendingId === u.id}
                        title="Resend activation email"
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-sky-600 hover:bg-sky-50 disabled:opacity-40 transition-colors"
                      >
                        <Mail size={12} />
                        Resend
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const AUTO_REFRESH_SECS = 60

export default function AdminActivity() {
  const [data,    setData]    = useState<UserActivityStats | null>(null)
  const [signals, setSignals] = useState<FrictionSignal[]>([])
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECS)
  const [resendingId, setResendingId] = useState<number | null>(null)
  const { add: toast } = useToastStore()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [activityRes, signalsRes] = await Promise.all([
        adminApi.activity(),
        adminApi.frictionSignals(),
      ])
      setData(activityRes.data)
      setSignals(signalsRes.data)
      setCountdown(AUTO_REFRESH_SECS)
    } catch (e) {
      toast({ type: 'error', title: 'Failed to load activity', message: errorMessage(e) })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  // 60-second auto-refresh + countdown ticker
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { load(); return AUTO_REFRESH_SECS }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [load])

  const handleResend = async (user: UserRow) => {
    setResendingId(user.id)
    try {
      await adminApi.resendVerification(user.id)
      toast({ type: 'success', title: 'Email sent', message: `Activation email resent to ${user.email}` })
    } catch (e) {
      toast({ type: 'error', title: 'Failed to resend', message: errorMessage(e) })
    } finally {
      setResendingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Activity className="h-6 w-6 text-sky-500" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Activity</h1>
          <p className="text-sm text-slate-400">Live snapshot · auto-refreshes every 60 s</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* countdown ring */}
          <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold tabular-nums text-slate-500 shadow-sm">
            <RefreshCw size={10} className={loading ? 'animate-spin text-sky-500' : 'text-slate-300'} />
            {countdown}s
          </span>
          <Button size="sm" variant="secondary" className="flex items-center gap-1.5" onClick={load} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <p className="py-16 text-center text-sm text-slate-400">Loading…</p>
      ) : data ? (
        <>
          {/* ── User base ──────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <SectionLabel>User base</SectionLabel>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard icon={Users}        label="Total users"      value={data.totalUsers}     color="text-slate-500" />
              <StatCard icon={CheckCircle2} label="Verified"         value={data.verifiedUsers}  color="text-emerald-500" />
              <StatCard icon={Clock}        label="Pending"          value={data.pendingUsers}   color="text-amber-500"
                sub={data.stuckPending.length > 0 ? `${data.stuckPending.length} stuck >24h` : undefined} />
              <StatCard icon={Wifi}         label="Active sessions"  value={data.activeSessions} color="text-sky-500" />
              <StatCard icon={UserX}        label="Never logged in"  value={data.neverLoggedIn}  color="text-rose-400" />
            </div>
            <EngagementStrip data={data} />
          </section>

          {/* ── Login health ────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <SectionLabel>Login health — today</SectionLabel>
            <LoginHealthSummary data={data.loginHealthToday} />
            {data.loginHealthToday.failures > 0 && (
              <LoginFailureBreakdown data={data.loginHealthToday} />
            )}
          </section>

          {/* ── Friction signals ────────────────────────────────────────────── */}
          <section className="space-y-3">
            <SectionLabel>
              Friction signals
              {signals.length > 0 && (
                <span className="ml-2 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-100 px-1 text-[10px] font-bold text-amber-700">
                  {signals.length}
                </span>
              )}
            </SectionLabel>
            <FrictionSignals signals={signals} onActionDone={load} />
          </section>

          {/* ── User lists ──────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <SectionLabel>User lists</SectionLabel>

            <div className="grid gap-4 lg:grid-cols-2">
              <UserTable
                title="Stuck pending (>24h unverified)"
                icon={Clock}
                iconColor="text-amber-500"
                rows={data.stuckPending}
                emptyMessage="No users stuck on pending — great!"
                showResend
                onResend={handleResend}
                resendingId={resendingId}
              />
              <UserTable
                title="Verified but never signed in"
                icon={UserX}
                iconColor="text-rose-400"
                rows={data.neverReturned}
                emptyMessage="All verified users have signed in at least once."
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
              <UserTable
                title="Recent sign-ups"
                icon={TrendingUp}
                iconColor="text-pink-500"
                rows={data.recentSignups}
                emptyMessage="No recent registrations."
                showLastLogin
              />

              {/* Top countries */}
              <Card className="p-0 overflow-hidden">
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                  <Globe2 size={16} className="text-sky-500" />
                  <h2 className="text-sm font-semibold text-slate-800">Top countries</h2>
                </div>
                {data.topCountries.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-400">No country data yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-50">
                    {data.topCountries.map(({ country, count }) => {
                      const pct = Math.round((count / data.totalUsers) * 100)
                      return (
                        <li key={country} className="flex items-center gap-3 px-4 py-2.5">
                          <span className="flex-1 truncate text-sm text-slate-700">{country}</span>
                          <span className="text-xs font-semibold tabular-nums text-slate-900">{count.toLocaleString()}</span>
                          <div className="w-16 shrink-0">
                            <div className="h-1.5 w-full rounded-full bg-slate-100">
                              <div className="h-1.5 rounded-full bg-sky-400" style={{ width: `${Math.max(pct, 4)}%` }} />
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Card>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
