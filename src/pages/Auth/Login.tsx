import { zodResolver } from '@hookform/resolvers/zod'
import { LogIn } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button, Card, Field, Input } from '../../components/ui'
import { errorMessage, authApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../components/Toast'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  remember: z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, setSession } = useAuthStore()
  const toast = useToastStore((state) => state.add)
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) })

  if (user) return <Navigate to={user.userType === 'hr' ? '/hr' : '/seeker'} replace />

  async function onSubmit(values: FormValues) {
    setServerError('')
    try {
      const { data } = await authApi.login({ email: values.email, password: values.password })
      setSession(data)
      toast({ type: 'success', title: 'Welcome back', message: 'You are signed in.' })
      navigate((location.state as { from?: string } | null)?.from ?? (data.user.userType === 'hr' ? '/hr' : '/seeker'))
    } catch (error) {
      setServerError(errorMessage(error))
    }
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[1fr_420px]">
      <section className="pt-8">
        <p className="text-sm font-semibold uppercase text-blue-700">Sign in</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">Continue your UAE tech hiring journey.</h1>
        <p className="mt-4 max-w-xl text-slate-600">Use your job seeker or HR account to manage applications, saved roles, job posts, and applicants.</p>
      </section>
      <Card>
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="email" {...register('email')} /></Field>
          <Field label="Password" error={errors.password?.message}><Input type="password" autoComplete="current-password" {...register('password')} /></Field>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300" {...register('remember')} /> Remember me
          </label>
          {serverError ? <p className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{serverError}</p> : null}
          <Button disabled={isSubmitting}><LogIn size={18} /> {isSubmitting ? 'Signing in...' : 'Login'}</Button>
          <p className="text-sm text-slate-600">New here? <Link className="font-semibold text-blue-700" to="/register">Create an account</Link></p>
        </form>
      </Card>
    </main>
  )
}
