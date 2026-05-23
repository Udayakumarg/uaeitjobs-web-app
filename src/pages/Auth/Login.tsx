import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowRight, BriefcaseBusiness, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { PasswordInput } from '../../components/PasswordInput'
import { useToastStore } from '../../components/Toast'
import { Button, Card, Field, Input } from '../../components/ui'
import { authApi, errorMessage, fieldErrors, statusCode } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, setSession } = useAuthStore()
  const toast = useToastStore((state) => state.add)
  const [serverError, setServerError] = useState('')
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  if (user) return <Navigate to={user.userType === 'hr' ? '/hr' : '/seeker'} replace />

  async function onSubmit(values: FormValues) {
    setServerError('')
    try {
      const { data } = await authApi.login({ email: values.email.trim(), password: values.password })
      setSession(data)
      toast({ type: 'success', title: 'Welcome back', message: 'You are signed in.' })
      navigate((location.state as { from?: string } | null)?.from ?? (data.user.userType === 'hr' ? '/hr' : '/seeker'))
    } catch (error) {
      if (statusCode(error) === 401) {
        setServerError('Invalid email or password. Please check your details and try again.')
        return
      }

      const knownFieldErrors = Object.entries(fieldErrors(error)).filter(([field]) => field === 'email' || field === 'password')
      knownFieldErrors.forEach(([field, message]) => setError(field as 'email' | 'password', { type: 'server', message }))

      if (knownFieldErrors.length === 0) {
        setServerError(errorMessage(error))
      }
    }
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_440px] lg:py-16">
      <section className="hidden lg:block">
        <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <img src="/logo-full.png" alt="UAEITJOBS.com" className="mb-6 h-20 w-auto" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-700">Account access</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
            Sign in to manage UAE technology hiring.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            Review applications, saved roles, job postings, and applicants from one secure workspace.
          </p>
          <div className="mt-8 grid gap-3 border-t border-slate-200 pt-6">
            <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <ShieldCheck className="h-5 w-5 text-pink-700" />
              Protected JWT session with refresh token handling
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <BriefcaseBusiness className="h-5 w-5 text-pink-700" />
              Separate dashboards for job seekers and HR teams
            </div>
          </div>
        </div>
      </section>

      <Card className="animate-fade-in-up border-slate-200 p-6 shadow-lg shadow-slate-950/5 sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-700">Welcome back</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">Sign in</h2>
          <p className="mt-2 text-sm text-slate-600">Use your registered email and password.</p>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="Email" required error={errors.email?.message}>
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.email)}
              {...register('email')}
            />
          </Field>

          <Field label="Password" required error={errors.password?.message}>
            <PasswordInput
              autoComplete="current-password"
              placeholder="Enter your password"
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
          </Field>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-pink-700 focus:ring-pink-600" {...register('remember')} />
            Remember me
          </label>

          {serverError ? (
            <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{serverError}</span>
            </p>
          ) : null}

          <Button size="lg" disabled={isSubmitting} className="mt-2 bg-slate-950 hover:bg-slate-800">
            {isSubmitting ? 'Signing in...' : 'Sign in'}
            <ArrowRight size={18} />
          </Button>

          <p className="text-center text-sm text-slate-600">
            New here?{' '}
            <Link className="font-semibold text-pink-700 hover:text-pink-800" to="/register">
              Create an account
            </Link>
          </p>
        </form>
      </Card>
    </main>
  )
}
