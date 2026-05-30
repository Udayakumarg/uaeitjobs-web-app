import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowRight, CheckCircle2, KeyRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { PasswordInput } from '../../components/PasswordInput'
import { PasswordStrength, passwordMeetsAllRules } from '../../components/PasswordStrength'
import { Button, Card, Field } from '../../components/ui'
import { authApi, errorMessage } from '../../services/api'

const schema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(120, 'Password is too long')
    .refine(passwordMeetsAllRules, {
      message: 'Password must include uppercase, lowercase, and a number',
    }),
  confirm: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
})

type FormValues = z.infer<typeof schema>

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [done, setDone] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const passwordValue = watch('password') ?? ''

  async function onSubmit(values: FormValues) {
    setServerError('')
    if (!token) {
      setServerError('Reset token is missing. Please use the link from your email.')
      return
    }
    try {
      await authApi.resetPassword(token, values.password)
      setDone(true)
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
            Choose a new password
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            Pick a strong password for your UAEITJOBS account. You'll be asked to sign in with it after saving.
          </p>
          <div className="mt-8 flex items-center gap-3 border-t border-slate-200 pt-6 text-sm font-medium text-slate-700">
            <KeyRound className="h-5 w-5 text-pink-700" />
            Links expire after 1 hour — use it before it does
          </div>
        </div>
      </section>

      <Card className="animate-fade-in-up border-slate-200 p-6 shadow-lg shadow-slate-950/5 sm:p-8">
        {done ? (
          <div className="flex flex-col items-center py-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
              <CheckCircle2 size={28} />
            </span>
            <h2 className="mt-5 text-2xl font-semibold text-slate-900">Password updated</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Your password has been changed. You can now sign in with your new credentials.
            </p>
            <Link
              to="/login"
              className="mt-8 inline-flex items-center gap-1.5 rounded-lg bg-[#BE185D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#9D174D]"
            >
              Go to sign in
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-700">New password</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-950">Choose a new password</h2>
              <p className="mt-2 text-sm text-slate-600">
                Must be at least 8 characters with uppercase, lowercase, and a number.
              </p>
            </div>

            {!token && (
              <p
                className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700"
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  No reset token found. Please use the link from your email, or{' '}
                  <Link to="/forgot-password" className="underline">
                    request a new one
                  </Link>
                  .
                </span>
              </p>
            )}

            <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <Field label="New password" required error={errors.password?.message}>
                <PasswordInput
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  aria-invalid={Boolean(errors.password)}
                  {...register('password')}
                />
              </Field>

              <PasswordStrength value={passwordValue} />

              <Field label="Confirm password" required error={errors.confirm?.message}>
                <PasswordInput
                  autoComplete="new-password"
                  placeholder="Repeat your new password"
                  aria-invalid={Boolean(errors.confirm)}
                  {...register('confirm')}
                />
              </Field>

              {serverError ? (
                <p
                  className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {serverError}{' '}
                    {serverError.toLowerCase().includes('expired') || serverError.toLowerCase().includes('invalid') ? (
                      <Link to="/forgot-password" className="underline font-semibold">
                        Request a new link
                      </Link>
                    ) : null}
                  </span>
                </p>
              ) : null}

              <Button
                size="lg"
                disabled={isSubmitting || !token}
                className="mt-2 bg-[#BE185D] hover:bg-[#9D174D]"
              >
                {isSubmitting ? 'Saving...' : 'Save new password'}
                <ArrowRight size={18} />
              </Button>

              <p className="text-center text-sm text-slate-600">
                Back to{' '}
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
