import { KeyRound, Mail, RefreshCw, Send } from 'lucide-react'
import { useState } from 'react'
import { Card } from '../../../components/ui'
import { useToastStore } from '../../../components/Toast'
import { adminApi, authApi, errorMessage } from '../../../services/api'
import type { FrictionSignal } from '../../../types'

// ── Label maps ────────────────────────────────────────────────────────────────

const SIGNAL_LABELS: Record<string, string> = {
  REPEATED_FAILURES:    'Repeated failures',
  EMPLOYER_INACTIVE:    'Employer inactive',
  VERIFIED_NEVER_LOGIN: 'Never signed in',
  STUCK_PENDING_LONG:   'Stuck pending',
}

const SEVERITY_STYLES: Record<string, string> = {
  HIGH:   'bg-rose-100 text-rose-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW:    'bg-sky-100 text-sky-700',
}

const SIGNAL_STYLES: Record<string, string> = {
  REPEATED_FAILURES:    'bg-rose-50 text-rose-600',
  EMPLOYER_INACTIVE:    'bg-violet-50 text-violet-600',
  VERIFIED_NEVER_LOGIN: 'bg-slate-100 text-slate-600',
  STUCK_PENDING_LONG:   'bg-amber-50 text-amber-600',
}

// ── Action button ─────────────────────────────────────────────────────────────

interface ActionProps {
  signal: FrictionSignal
  onDone: () => void
}

function ActionButton({ signal, onDone }: ActionProps) {
  const [busy, setBusy] = useState(false)
  const { add: toast } = useToastStore()

  const handle = async () => {
    setBusy(true)
    try {
      switch (signal.suggestedAction) {
        case 'RESEND_VERIFICATION':
          await adminApi.resendVerification(signal.userId)
          toast({ type: 'success', title: 'Email sent', message: `Verification resent to ${signal.email}` })
          break
        case 'RESET_PASSWORD':
          await authApi.forgotPassword(signal.email)
          toast({ type: 'success', title: 'Reset link sent', message: `Password reset email sent to ${signal.email}` })
          break
        case 'SEND_WELCOME':
          await adminApi.sendWelcome(signal.userId)
          toast({ type: 'success', title: 'Welcome email sent', message: `Onboarding email sent to ${signal.email}` })
          break
        default:
          toast({ type: 'info', title: 'No action', message: 'Review this user manually in the Users tab.' })
      }
      onDone()
    } catch (e) {
      toast({ type: 'error', title: 'Action failed', message: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  const cfg: Record<string, { icon: React.ElementType; label: string; style: string }> = {
    RESEND_VERIFICATION: { icon: Mail,      label: 'Resend verification', style: 'text-sky-600 hover:bg-sky-50' },
    RESET_PASSWORD:      { icon: KeyRound,  label: 'Send reset link',     style: 'text-rose-600 hover:bg-rose-50' },
    SEND_WELCOME:        { icon: Send,      label: 'Send welcome',        style: 'text-violet-600 hover:bg-violet-50' },
    REVIEW:              { icon: RefreshCw, label: 'Review',              style: 'text-slate-500 hover:bg-slate-50' },
  }

  const c = cfg[signal.suggestedAction] ?? cfg.REVIEW
  const Icon = c.icon

  return (
    <button
      onClick={handle}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-40 ${c.style}`}
    >
      <Icon size={11} className={busy ? 'animate-spin' : ''} />
      {c.label}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  signals: FrictionSignal[]
  onActionDone: () => void
}

export default function FrictionSignals({ signals, onActionDone }: Props) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-50 text-amber-500 text-xs font-bold">!</span>
        <h2 className="text-sm font-semibold text-slate-800">Friction signals</h2>
        <span className="text-xs text-slate-400">Accounts that may need a nudge</span>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
          {signals.length}
        </span>
      </div>

      {signals.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-400">
          No friction signals — all accounts look healthy.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-50">
                <th className="px-4 py-2 w-20">Severity</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Signal</th>
                <th className="px-4 py-2 hidden lg:table-cell">Details</th>
                <th className="px-4 py-2 w-16 text-center hidden sm:table-cell">Days</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {signals.map((s, idx) => (
                <tr key={`${s.userId}-${s.signalType}-${idx}`} className="hover:bg-slate-50/60 transition-colors">

                  {/* Severity */}
                  <td className="px-4 py-2.5">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${SEVERITY_STYLES[s.severity] ?? 'bg-slate-100 text-slate-600'}`}>
                      {s.severity}
                    </span>
                  </td>

                  {/* Email */}
                  <td className="px-4 py-2.5">
                    <span className="block max-w-[200px] truncate font-medium text-slate-800">{s.email}</span>
                    <span className="text-[10px] text-slate-400">{s.userType.replace('_', ' ')}</span>
                  </td>

                  {/* Signal type */}
                  <td className="px-4 py-2.5">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${SIGNAL_STYLES[s.signalType] ?? 'bg-slate-100 text-slate-600'}`}>
                      {SIGNAL_LABELS[s.signalType] ?? s.signalType}
                    </span>
                    {s.failedLoginAttempts24h > 0 && (
                      <span className="ml-1.5 text-[10px] text-rose-500 font-semibold">
                        ×{s.failedLoginAttempts24h}
                      </span>
                    )}
                  </td>

                  {/* Message */}
                  <td className="px-4 py-2.5 hidden lg:table-cell">
                    <span className="max-w-xs block truncate text-xs text-slate-500">{s.message}</span>
                  </td>

                  {/* Days */}
                  <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                    <span className="text-xs font-semibold tabular-nums text-slate-600">
                      {s.daysSinceCreated}d
                    </span>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-2.5 text-right">
                    <ActionButton signal={s} onDone={onActionDone} />
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
