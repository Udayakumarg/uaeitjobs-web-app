import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useToastStore } from '../../components/Toast'
import { Button, Card, Field, Input, Select } from '../../components/ui'
import { authApi, errorMessage, fieldErrors } from '../../services/api'
import type { UserType } from '../../types'

const schema = z.object({
  userType: z.enum(['job_seeker', 'hr']),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  country: z.string().optional(),
}).refine((values) => values.password === values.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords must match',
})

type FormValues = z.infer<typeof schema>

export default function Register() {
  const navigate = useNavigate()
  const toast = useToastStore((state) => state.add)
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, watch, setValue, setError, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { userType: 'job_seeker' },
  })
  const userType = watch('userType')

  async function onSubmit(values: FormValues) {
    setServerError('')
    try {
      await authApi.register({
        email: values.email,
        password: values.password,
        userType: values.userType as UserType,
        phone: values.phone,
        country: values.country,
      })
      toast({ type: 'success', title: 'Account created', message: 'Check your email for verification, then sign in.' })
      navigate('/login')
    } catch (error) {
      const serverFieldErrors = fieldErrors(error)
      Object.entries(serverFieldErrors).forEach(([field, message]) => {
        if (field in schema.shape || field === 'confirmPassword') {
          setError(field as keyof FormValues, { type: 'server', message })
        }
      })
      setServerError(errorMessage(error))
    }
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[1fr_460px]">
      <section className="pt-8">
        <p className="text-sm font-semibold uppercase text-blue-700">Create account</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">Join as talent or hiring team.</h1>
        <p className="mt-4 max-w-xl text-slate-600">Job seekers can track applications and saved roles. HR users can post jobs, import from LinkedIn, and manage applicants.</p>
      </section>
      <Card>
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-md bg-slate-100 p-1">
          {(['job_seeker', 'hr'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setValue('userType', type)}
              className={`min-h-10 rounded-md text-sm font-semibold ${userType === type ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'}`}
            >
              {type === 'hr' ? 'HR recruiter' : 'Job seeker'}
            </button>
          ))}
        </div>
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <input type="hidden" {...register('userType')} />
          <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="email" {...register('email')} /></Field>
          <Field label="Phone"><Input autoComplete="tel" {...register('phone')} /></Field>
          <Field label="Country"><Select {...register('country')}><option>United Arab Emirates</option><option>India</option><option>Pakistan</option><option>Philippines</option><option>Other</option></Select></Field>
          <Field label="Password" error={errors.password?.message}><Input type="password" autoComplete="new-password" {...register('password')} /></Field>
          <Field label="Confirm password" error={errors.confirmPassword?.message}><Input type="password" autoComplete="new-password" {...register('confirmPassword')} /></Field>
          {serverError ? <p className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{serverError}</p> : null}
          <Button disabled={isSubmitting}><UserPlus size={18} /> {isSubmitting ? 'Creating...' : 'Create account'}</Button>
          <p className="text-sm text-slate-600">Already registered? <Link className="font-semibold text-blue-700" to="/login">Login</Link></p>
        </form>
      </Card>
    </main>
  )
}
