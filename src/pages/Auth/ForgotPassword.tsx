import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowRight, CheckCircle2, KeyRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button, Card, Field, Input } from '../../components/ui'
import { authApi, errorMessage } from '../../services/api'

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
})

type FormValues = z.infer<typeof schema>

export default function ForgotPassword() {
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  async function onSubmit(values: FormValues) {
    setServerError('')
    try {
      await authApi.forgotPassword(values.email.trim())
      setSent(true)
    } catch (error) {
      setServerError(errorMessage(error))
    }
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_440px] lg:py-16">
      <section className="hidden lg:block">
        <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <img src="/logo-full.png" alt="UAEITJOBS.com" className="mb-6 h-20 w-auto" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-700">Password reset</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
            Forgot your password?
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            Enter the email address linked to your account and we'll send you a secure link to choose a new password.
          </p>
          <div className="mt-8 flex items-center gap-3 border-t border-slate-200 pt-6 text-sm font-medium text-slate-700">
            <KeyRound className="h-5 w-5 text-pink-700" />
            Reset links expire after 1 hour for your security
          </div>
        </div>
      </section>

      <Card className="animate-fade-in-up border-slate-200 p-6 shadow-lg shadow-slate-950/5 sm:p-8">
        {sent ? (
          <div className="flex flex-col items-center py-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
              <CheckCircle2 size={28} />
            </span>
            <h2 className="mt-5 text-2xl font-semibold text-slate-900">Check your inbox</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              If <span className="font-medium text-slate-800">{getValues('email')}</span> is registered,
              we've sent a password reset link. It expires in 1 hour.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Don't see it? Check your spam folder or{' '}
              <button
                type="button"
                className="font-semibold text-pink-700 hover:text-pink-800"
                onClick={() => setSent(false)}
              >
                try again
              </button>
              .
            </p>
            <Link
              to="/login"
              className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-pink-700 hover:text-pink-800"
            >
              Back to sign in
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-700">Forgot password</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-950">Reset your password</h2>
              <p className="mt-2 text-sm text-slate-600">
                Enter your email and we'll send you a reset link.
              </p>
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

              {serverError ? (
                <p
                  className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{serverError}</span>
                </p>
              ) : null}

              <Button size="lg" disabled={isSubmitting} className="mt-2 bg-[#BE185D] hover:bg-[#9D174D]">
                {isSubmitting ? 'Sending...' : 'Send reset link'}
                <ArrowRight size={18} />
              </Button>

              <p className="text-center text-sm text-slate-600">
                Remember your password?{' '}
                <Link className="font-semibold text-pink-700 hover:text-pink-800" to="/login">
                  Sign in
                </Link>
              </p>
            </form>
          </>
        )}
      </Card>
    </main>
  )
}
