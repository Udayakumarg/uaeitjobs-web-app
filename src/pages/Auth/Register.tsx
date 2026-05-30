import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowRight, BadgeCheck, BriefcaseBusiness, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { PasswordInput } from '../../components/PasswordInput'
import { PasswordStrength, passwordMeetsAllRules } from '../../components/PasswordStrength'
import { useToastStore } from '../../components/Toast'
import { Button, Card, Field, Input, Select } from '../../components/ui'
import { authApi, errorMessage, fieldErrors } from '../../services/api'
import type { UserType } from '../../types'

const schema = z.object({
  userType: z.enum(['job_seeker', 'hr']),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(120, 'Password is too long')
    .refine(passwordMeetsAllRules, {
      message: 'Password must include uppercase, lowercase, and a number',
    }),
  country: z.string().optional().or(z.literal('')),
})

// Country dial codes — UAE first, then sorted by relevance to UAE job market
const DIAL_CODES = [
  { flag: '🇦🇪', name: 'UAE',          dial: '+971' },
  { flag: '🇮🇳', name: 'India',        dial: '+91'  },
  { flag: '🇵🇰', name: 'Pakistan',     dial: '+92'  },
  { flag: '🇵🇭', name: 'Philippines',  dial: '+63'  },
  { flag: '🇪🇬', name: 'Egypt',        dial: '+20'  },
  { flag: '🇸🇦', name: 'Saudi Arabia', dial: '+966' },
  { flag: '🇶🇦', name: 'Qatar',        dial: '+974' },
  { flag: '🇰🇼', name: 'Kuwait',       dial: '+965' },
  { flag: '🇧🇭', name: 'Bahrain',      dial: '+973' },
  { flag: '🇴🇲', name: 'Oman',         dial: '+968' },
  { flag: '🇱🇧', name: 'Lebanon',      dial: '+961' },
  { flag: '🇯🇴', name: 'Jordan',       dial: '+962' },
  { flag: '🇧🇩', name: 'Bangladesh',   dial: '+880' },
  { flag: '🇱🇰', name: 'Sri Lanka',    dial: '+94'  },
  { flag: '🇳🇵', name: 'Nepal',        dial: '+977' },
  { flag: '🇬🇧', name: 'UK',           dial: '+44'  },
  { flag: '🇺🇸', name: 'USA',          dial: '+1'   },
  { flag: '🇨🇦', name: 'Canada',       dial: '+1'   },
  { flag: '🇦🇺', name: 'Australia',    dial: '+61'  },
  { flag: '🇫🇷', name: 'France',       dial: '+33'  },
  { flag: '🇩🇪', name: 'Germany',      dial: '+49'  },
  { flag: '🇳🇬', name: 'Nigeria',      dial: '+234' },
  { flag: '🇰🇪', name: 'Kenya',        dial: '+254' },
  { flag: '🇿🇦', name: 'South Africa', dial: '+27'  },
]

const COUNTRIES = [
  'United Arab Emirates', 'India', 'Pakistan', 'Philippines', 'Egypt',
  'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Oman',
  'Lebanon', 'Jordan', 'Bangladesh', 'Sri Lanka', 'Nepal',
  'United Kingdom', 'United States', 'Canada', 'Australia',
  'France', 'Germany', 'Nigeria', 'Kenya', 'South Africa', 'Other',
]

type FormValues = z.infer<typeof schema>

const PERKS = [
  { icon: BriefcaseBusiness, label: 'Focused UAE IT roles and hiring workflows' },
  { icon: BadgeCheck, label: 'Email verification and protected account access' },
  { icon: UsersRound, label: 'Separate job seeker and HR dashboards' },
]

export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialType = searchParams.get('type') === 'hr' ? 'hr' : 'job_seeker'
  const toast = useToastStore((state) => state.add)
  const [serverError, setServerError] = useState('')
  const [dialCode, setDialCode]       = useState('+971')
  const [rawPhone, setRawPhone]       = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { userType: initialType, country: 'United Arab Emirates' },
  })
  const userType = watch('userType')
  const passwordValue = watch('password') ?? ''

  async function onSubmit(values: FormValues) {
    setServerError('')
    const phone = rawPhone.trim() ? `${dialCode}${rawPhone.replace(/\s/g, '')}` : undefined
    try {
      await authApi.register({
        email: values.email.trim(),
        password: values.password,
        userType: values.userType as UserType,
        phone,
        country: values.country?.trim() || undefined,
      })
      toast({
        type: 'success',
        title: 'Account created',
        message: 'Check your inbox for a verification link, then sign in.',
      })
      navigate('/login')
    } catch (error) {
      const known: Array<keyof FormValues> = ['email', 'password', 'country', 'userType']
      const knownFieldErrors = Object.entries(fieldErrors(error)).filter(([field]) => (known as string[]).includes(field))
      knownFieldErrors.forEach(([field, message]) => setError(field as keyof FormValues, { type: 'server', message }))

      if (knownFieldErrors.length === 0) {
        const message = errorMessage(error)
        if (message.toLowerCase().includes('email')) {
          setError('email', { type: 'server', message })
        } else {
          setServerError(message)
        }
      }
    }
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_500px] lg:py-16">
      <section className="hidden lg:block">
        <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <img src="/logo-full.png" alt="UAEITJOBS.com" className="mb-6 h-20 w-auto" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-700">Create account</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
            A focused workspace for UAE technology hiring.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            Create an account to manage applications, saved jobs, job postings, and applicants without the clutter of a generic job board.
          </p>
          <ul className="mt-8 grid gap-4 border-t border-slate-200 pt-6">
            {PERKS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-pink-50 text-pink-700 ring-1 ring-inset ring-pink-100">
                  <Icon size={18} />
                </span>
                <span className="text-sm font-medium text-slate-700">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Card className="animate-fade-in-up border-slate-200 p-6 shadow-lg shadow-slate-950/5 sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-700">Join UAEITJOBS</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">Create account</h2>
          <p className="mt-2 text-sm text-slate-600">Choose your account type and continue.</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1.5">
          {(['job_seeker', 'hr'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setValue('userType', type, { shouldValidate: true })}
              className={`min-h-10 rounded-lg text-sm font-semibold transition-all ${
                userType === type
                  ? 'bg-white text-pink-700 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {type === 'hr' ? 'HR / Recruiter' : 'Job seeker'}
            </button>
          ))}
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <input type="hidden" {...register('userType')} />

          <Field label="Email" required error={errors.email?.message}>
            <Input type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={Boolean(errors.email)} {...register('email')} />
          </Field>

          <Field label="Phone" hint="Optional · used for shortlist notifications">
            <div className="flex h-10 overflow-hidden rounded-lg border border-slate-200 transition-all focus-within:border-pink-500 focus-within:ring-2 focus-within:ring-pink-500/20">
              <select
                value={dialCode}
                onChange={e => setDialCode(e.target.value)}
                aria-label="Country dial code"
                className="shrink-0 border-r border-slate-200 bg-slate-50 px-2 text-sm text-slate-700 focus:outline-none"
              >
                {DIAL_CODES.map(({ flag, name, dial }) => (
                  <option key={name} value={dial}>{flag} {dial}</option>
                ))}
              </select>
              <input
                type="tel"
                value={rawPhone}
                onChange={e => setRawPhone(e.target.value)}
                placeholder="50 000 0000"
                autoComplete="tel-national"
                className="min-w-0 flex-1 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </Field>

          <Field label="Country">
            <Select {...register('country')}>
              {COUNTRIES.map(c => <option key={c}>{c}</option>)}
            </Select>
          </Field>

          <Field label="Password" required error={errors.password?.message}>
            <PasswordInput autoComplete="new-password" placeholder="Create a strong password" aria-invalid={Boolean(errors.password)} {...register('password')} />
          </Field>

          <PasswordStrength value={passwordValue} />

          {serverError ? (
            <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{serverError}</span>
            </p>
          ) : null}

          <Button size="lg" disabled={isSubmitting} className="mt-2 bg-[#BE185D] hover:bg-[#9D174D]">
            {isSubmitting ? 'Creating your account...' : 'Create account'}
            <ArrowRight size={18} />
          </Button>

          <p className="text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link className="font-semibold text-pink-700 hover:text-pink-800" to="/login">
              Sign in
            </Link>
          </p>
        </form>
      </Card>
    </main>
  )
}
