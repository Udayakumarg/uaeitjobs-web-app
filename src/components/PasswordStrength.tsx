import { Check, X } from 'lucide-react'

export interface PasswordRule {
  label: string
  test: (value: string) => boolean
}

export const PASSWORD_RULES: PasswordRule[] = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'One uppercase letter (A-Z)', test: (v) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter (a-z)', test: (v) => /[a-z]/.test(v) },
  { label: 'One number (0-9)', test: (v) => /\d/.test(v) },
]

export function passwordMeetsAllRules(value: string) {
  return PASSWORD_RULES.every((rule) => rule.test(value))
}

export function passwordScore(value: string) {
  return PASSWORD_RULES.filter((rule) => rule.test(value)).length
}

export function PasswordStrength({ value }: { value: string }) {
  const score = passwordScore(value)
  const total = PASSWORD_RULES.length
  const tone =
    score === 0
      ? 'bg-slate-200'
      : score < total / 2
        ? 'bg-red-500'
        : score < total
          ? 'bg-amber-500'
          : 'bg-green-500'
  const label =
    score === 0
      ? 'Enter a password'
      : score < total / 2
        ? 'Weak'
        : score < total
          ? 'Good'
          : 'Strong'

  return (
    <div className="grid gap-2.5">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1">
          {Array.from({ length: total }).map((_, index) => (
            <span
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                index < score ? tone : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-semibold text-slate-600">{label}</span>
      </div>
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {PASSWORD_RULES.map((rule) => {
          const passed = rule.test(value)
          return (
            <li
              key={rule.label}
              className={`flex items-center gap-1.5 text-[11px] font-medium ${
                passed ? 'text-green-700' : 'text-slate-500'
              }`}
            >
              <span
                className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                  passed ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {passed ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
              </span>
              {rule.label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
