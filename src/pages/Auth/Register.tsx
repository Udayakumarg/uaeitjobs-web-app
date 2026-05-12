import { zodResolver } from '@hookform/resolvers/zod'
import { BadgeCheck, Briefcase, Sparkles, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
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
  phone: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

const PERKS = [
  { icon: Briefcase, label: 'Track every application in one place' },
  { icon: BadgeCheck, label: 'Verified UAE-based employers only' },
  { icon: Sparkles, label: 'AI-assisted CV parsing and skill matching' },
]

export default function Register() {
  const navigate = useNavigate()
  const toast = useToastStore((state) => state.add)
  const [serverError, setServerError] = useState('')

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
    defaultValues: { userType: 'job_seeker', country: 'United Arab Emirates' },
  })
  const userType = watch('userType')
  const passwordValue = watch('password') ?? ''

  async function onSubmit(values: FormValues) {
    setServerError('')
    try {
      await authApi.register({
        email: values.email.trim(),
        password: values.password,
        userType: values.userType as UserType,
        phone: values.phone?.trim() || undefined,
        country: values.country?.trim() || undefined,
      })
      toast({
        type: 'success',
        title: 'Account created',
        message: 'Check your inbox for a verification link, then sign in.',
      })
      navigate('/login')
    } catch (error) {
      const serverFieldErrors = fieldErrors(error)
      const known: Array<keyof FormValues> = ['email', 'password', 'phone', 'country', 'userType']
      Object.entries(serverFieldErrors).forEach(([field, message]) => {
        if ((known as string[]).includes(field)) {
          setError(field as keyof FormValues, { type: 'server', message })
        }
      })
      if (Object.keys(serverFieldErrors).length === 0) {
        setServerError(errorMessage(error))
      }
    }
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_500px] lg:py-16">
      <section className="hidden lg:block">
        <div className="sticky top-24">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Create account</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
            Build your career in the UAE's IT sector.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            Whether you're hunting for your next role or hiring top talent across Dubai and Abu Dhabi,
            uaeitjobs gives you the tools to move faster.
          </p>
          <ul className="mt-8 grid gap-4">
            {PERKS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100">
                  <Icon size={18} />
                </span>
                <span className="text-sm font-medium text-slate-700">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Card className="animate-fade-in-up p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-950">Sign up</h2>
          <p className="mt-1 text-sm text-slate-600">It takes less than a minute.</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1.5">
          {(['job_seeker', 'hr'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setValue('userType', type, { shouldValidate: true })}
              className={`min-h-10 rounded-lg text-sm font-semibold transition-all ${
                userType === type
                  ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200'
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
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.email)}
              {...register('email')}
            />
          </Field>

          <Field label="Phone" hint="Optional, used for shortlist notifications">
            <Input autoComplete="tel" placeholder="+971 50 000 0000" {...register('phone')} />
          </Field>

          <Field label="Country">
            <Select {...register('country')}>
              <option>United Arab Emirates</option>
              <option>India</option>
              <option>Pakistan</option>
              <option>Philippines</option>
              <option>Egypt</option>
              <option>Other</option>
            </Select>
          </Field>

          <Field label="Password" required error={errors.password?.message}>
            <PasswordInput
              autoComplete="new-password"
              placeholder="Create a strong password"
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
          </Field>

          <PasswordStrength value={passwordValue} />

          {serverError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {serverError}
            </p>
          ) : null}

          <Button size="lg" disabled={isSubmitting} className="mt-2">
            <UserPlus size={18} />
            {isSubmitting ? 'Creating your account…' : 'Create account'}
          </Button>

          <p className="text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link className="font-semibold text-blue-700 hover:text-blue-800" to="/login">
              Sign in
            </Link>
          </p>
        </form>
      </Card>
    </main>
  )
}
