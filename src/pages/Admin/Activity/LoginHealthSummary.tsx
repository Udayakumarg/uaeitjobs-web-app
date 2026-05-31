import { CheckCircle2, LogIn, ShieldAlert, TrendingDown } from 'lucide-react'
import type { LoginHealthToday } from '../../../types'

interface Props {
  data: LoginHealthToday
}

interface HealthCardProps {
  icon: React.ElementType
  label: string
  value: string | number
  colorClass: string
  bgClass: string
  sub?: string
}

function HealthCard({ icon: Icon, label, value, colorClass, bgClass, sub }: HealthCardProps) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${bgClass} ${colorClass}`}>
          <Icon size={18} />
        </span>
        <span className={`text-2xl font-bold tabular-nums ${colorClass}`}>{value}</span>
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  )
}

/** Returns color classes for a success-rate value (0–100). */
function rateColor(rate: number): { text: string; bg: string } {
  if (rate >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-50' }
  if (rate >= 60) return { text: 'text-amber-600',   bg: 'bg-amber-50'   }
  return                { text: 'text-rose-600',     bg: 'bg-rose-50'    }
}

/** Returns color classes based on failure count relative to total attempts. */
function failureColor(failures: number, attempts: number): { text: string; bg: string } {
  if (attempts === 0 || failures === 0) return { text: 'text-emerald-600', bg: 'bg-emerald-50' }
  const failRate = failures / attempts
  if (failRate > 0.4) return { text: 'text-rose-600',   bg: 'bg-rose-50'   }
  if (failRate > 0.2) return { text: 'text-amber-600',  bg: 'bg-amber-50'  }
  return                     { text: 'text-emerald-600', bg: 'bg-emerald-50' }
}

export default function LoginHealthSummary({ data }: Props) {
  const rate    = rateColor(data.successRate)
  const fail    = failureColor(data.failures, data.attempts)

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <HealthCard
        icon={LogIn}
        label="Login attempts today"
        value={data.attempts.toLocaleString()}
        colorClass="text-slate-600"
        bgClass="bg-slate-50"
        sub="since midnight UTC"
      />
      <HealthCard
        icon={CheckCircle2}
        label="Successful logins"
        value={data.successes.toLocaleString()}
        colorClass="text-emerald-600"
        bgClass="bg-emerald-50"
      />
      <HealthCard
        icon={TrendingDown}
        label="Failed logins"
        value={data.failures.toLocaleString()}
        colorClass={fail.text}
        bgClass={fail.bg}
        sub={data.attempts > 0 ? `${Math.round((data.failures / data.attempts) * 100)}% of attempts` : undefined}
      />
      <HealthCard
        icon={ShieldAlert}
        label="Success rate"
        value={`${data.successRate}%`}
        colorClass={rate.text}
        bgClass={rate.bg}
        sub={
          data.successRate >= 80 ? 'Healthy'
          : data.successRate >= 60 ? 'Watch closely'
          : 'Needs attention'
        }
      />
    </div>
  )
}
