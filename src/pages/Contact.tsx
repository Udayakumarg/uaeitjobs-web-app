import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowRight, CheckCircle2, Mail, MapPin, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button, Card, Field, Input } from '../components/ui'
import { contactApi, errorMessage } from '../services/api'

const schema = z.object({
  name:    z.string().min(1, 'Name is required').max(100),
  email:   z.string().min(1, 'Email is required').email('Enter a valid email address'),
  subject: z.string().min(1, 'Subject is required').max(200),
  message: z.string().min(10, 'Please write at least 10 characters').max(2000),
})

type FormValues = z.infer<typeof schema>

const REASONS = [
  { label: 'Job listing issue', value: 'Job listing issue' },
  { label: 'Account / login problem', value: 'Account / login problem' },
  { label: 'Partnership enquiry', value: 'Partnership enquiry' },
  { label: 'General question', value: 'General question' },
  { label: 'Other', value: 'Other' },
]

export default function Contact() {
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { subject: '' },
  })

  const currentSubject = watch('subject')

  async function onSubmit(values: FormValues) {
    setServerError('')
    try {
      await contactApi.send(values)
      setSent(true)
    } catch (error) {
      setServerError(errorMessage(error))
    }
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_520px] lg:py-16">

      {/* ── Left info panel ───────────────────────────────────────────── */}
      <section className="hidden lg:block">
        <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <img src="/logo-full.png" alt="UAEITJOBS.com" className="mb-6 h-20 w-auto" />

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-700">Get in touch</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
            We're here to help.
          </h1>
          <p className="mt-4 max-w-sm text-base leading-7 text-slate-600">
            Questions about a job listing, your account, or working with us? Send a message and we'll reply within one business day.
          </p>

          <ul className="mt-8 grid gap-5 border-t border-slate-200 pt-6">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pink-50 text-pink-700 ring-1 ring-inset ring-pink-100">
                <Mail size={17} />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Email us</p>
                <a
                  href="mailto:hello@uaeitjobs.com"
                  className="text-sm text-pink-700 hover:text-pink-800"
                >
                  hello@uaeitjobs.com
                </a>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pink-50 text-pink-700 ring-1 ring-inset ring-pink-100">
                <MapPin size={17} />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Based in</p>
                <p className="text-sm text-slate-600">Dubai, United Arab Emirates</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pink-50 text-pink-700 ring-1 ring-inset ring-pink-100">
                <MessageSquare size={17} />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Response time</p>
                <p className="text-sm text-slate-600">Within 1 business day</p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* ── Right form card ───────────────────────────────────────────── */}
      <Card className="animate-fade-in-up border-slate-200 p-6 shadow-lg shadow-slate-950/5 sm:p-8">
        {sent ? (
          <div className="flex flex-col items-center py-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
              <CheckCircle2 size={28} />
            </span>
            <h2 className="mt-5 text-2xl font-semibold text-slate-900">Message sent</h2>
            <p className="mt-3 max-w-xs text-sm leading-6 text-slate-600">
              Thanks for reaching out. We'll get back to you within one business day.
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-8 text-sm font-semibold text-pink-700 hover:text-pink-800"
            >
              Send another message
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-700">Contact</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-950">Send us a message</h2>
              <p className="mt-2 text-sm text-slate-600">Fill in the form and we'll reply to your email.</p>
            </div>

            {/* Quick-select topic chips */}
            <div className="mb-5">
              <p className="mb-2 text-xs font-semibold text-slate-500">What is this about?</p>
              <div className="flex flex-wrap gap-2">
                {REASONS.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setValue('subject', r.value, { shouldValidate: true })}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      currentSubject === r.value
                        ? 'border-pink-300 bg-pink-50 text-pink-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your name" required error={errors.name?.message}>
                  <Input
                    autoComplete="name"
                    placeholder="Mohammed Al-Rashid"
                    aria-invalid={Boolean(errors.name)}
                    {...register('name')}
                  />
                </Field>
                <Field label="Your email" required error={errors.email?.message}>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    aria-invalid={Boolean(errors.email)}
                    {...register('email')}
                  />
                </Field>
              </div>

              <Field label="Subject" required error={errors.subject?.message}>
                <Input
                  placeholder="e.g. Account issue, job listing question…"
                  aria-invalid={Boolean(errors.subject)}
                  {...register('subject')}
                />
              </Field>

              <Field label="Message" required error={errors.message?.message}>
                <textarea
                  rows={6}
                  placeholder="Tell us what's on your mind…"
                  aria-invalid={Boolean(errors.message)}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                  {...register('message')}
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
                {isSubmitting ? 'Sending…' : 'Send message'}
                <ArrowRight size={18} />
              </Button>
            </form>
          </>
        )}
      </Card>
    </main>
  )
}
