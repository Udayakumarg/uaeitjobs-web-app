import { Card } from '../../../components/ui'
import type { LoginHealthToday } from '../../../types'

const REASON_LABELS: Record<string, string> = {
  INVALID_PASSWORD:   'Wrong password',
  USER_NOT_FOUND:     'Unknown email',
  EMAIL_NOT_VERIFIED: 'Email not verified',
  TOO_MANY_ATTEMPTS:  'Rate limited',
  SERVER_ERROR:       'Server error',
}

const REASON_COLOR: Record<string, string> = {
  INVALID_PASSWORD:   'bg-rose-400',
  USER_NOT_FOUND:     'bg-amber-400',
  EMAIL_NOT_VERIFIED: 'bg-sky-400',
  TOO_MANY_ATTEMPTS:  'bg-violet-400',
  SERVER_ERROR:       'bg-slate-400',
}

interface Props {
  data: LoginHealthToday
}

export default function LoginFailureBreakdown({ data }: Props) {
  const entries = Object.entries(data.failureBreakdown)
  const max = entries.reduce((m, [, v]) => Math.max(m, v), 0)

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-rose-50 text-rose-500">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zM7.25 5a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0V5zm.75 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
          </svg>
        </span>
        <h2 className="text-sm font-semibold text-slate-800">Failure breakdown — today</h2>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
          {data.failures.toLocaleString()} total
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-400">
          No login failures recorded today.
        </p>
      ) : (
        <ul className="divide-y divide-slate-50 px-4 py-2">
          {entries.map(([reason, count]) => {
            const pct = max === 0 ? 0 : Math.round((count / max) * 100)
            const label = REASON_LABELS[reason] ?? reason.replace(/_/g, ' ')
            const barColor = REASON_COLOR[reason] ?? 'bg-slate-400'
            return (
              <li key={reason} className="flex items-center gap-3 py-2.5">
                <span className="w-36 shrink-0 text-[12px] font-medium text-slate-600 truncate">{label}</span>
                <div className="flex-1">
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${barColor} transition-all duration-500`}
                      style={{ width: `${Math.max(pct, 3)}%` }}
                    />
                  </div>
                </div>
                <span className="w-10 text-right text-xs font-bold tabular-nums text-slate-700">
                  {count.toLocaleString()}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
