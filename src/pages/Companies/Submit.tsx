import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, CheckCircle2, Send } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button, Card, Container, Field, Input } from '../../components/ui'
import { useToastStore } from '../../components/Toast'
import { companiesApi, errorMessage } from '../../services/api'

/**
 * Authenticated submission form — /companies/submit.
 * Per product spec the form intentionally captures only:
 *   - company name
 *   - careers page URL
 * Categorisation, description and city are added by an admin during review,
 * which keeps the contributor friction low and signal high.
 *
 * The submission is created with status=PENDING and only appears on the
 * public directory after an admin approves it via /admin/companies.
 */
const schema = z.object({
  name: z.string()
    .min(2, 'Company name is required')
    .max(200, 'Too long — keep it under 200 characters')
    .trim(),
  careersUrl: z.string()
    .min(1, 'Careers URL is required')
    .max(1000)
    .url('Must be a full URL — include https://')
    .refine((v) => /^https?:\/\//i.test(v), 'Must start with http:// or https://'),
})

type FormValues = z.infer<typeof schema>

export default function CompanySubmit() {
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.add)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: { name: '', careersUrl: '' },
  })

  async function onSubmit(values: FormValues) {
    try {
      await companiesApi.submit(values)
      setSent(true)
      addToast({
        type: 'success',
        title: 'Submission received',
        message: 'An admin will review your company shortly.',
      })
    } catch (e) {
      addToast({ type: 'error', title: 'Submission failed', message: errorMessage(e) })
    }
  }

  return (
    <Container className="max-w-2xl py-10">
      <Link to="/companies" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-pink-700">
        <ArrowLeft className="h-4 w-4" /> Back to directory
      </Link>

      <Card className="mt-4 p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Submit a missing company
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Know a UAE organisation that hires for IT roles but isn’t in our directory?
          Tell us the name and their careers page URL — we’ll review and add it.
        </p>

        {sent ? (
          <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-base font-semibold">Thanks — submission received.</p>
                <p className="mt-1 text-sm leading-6">
                  An admin will review it shortly. Approved entries usually appear within 24 hours.
                </p>
                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" onClick={() => navigate('/companies')}>
                    Browse directory
                  </Button>
                  <Button variant="ghost" onClick={() => setSent(false)}>
                    Submit another
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid gap-5">
            <Field label="Company name" required error={errors.name?.message}>
              <Input
                {...register('name')}
                placeholder="e.g. Halian"
                autoComplete="organization"
                aria-invalid={!!errors.name || undefined}
              />
            </Field>

            <Field
              label="Careers page URL"
              required
              error={errors.careersUrl?.message}
              hint="The official careers / jobs page on the company's own domain — not a LinkedIn or Indeed link."
            >
              <Input
                {...register('careersUrl')}
                type="url"
                placeholder="https://www.example.com/careers"
                autoComplete="url"
                aria-invalid={!!errors.careersUrl || undefined}
              />
            </Field>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600">
              We add the category, city and description ourselves during review,
              so you only need to give us these two fields. Submissions are rate-limited
              to 5 per day per user.
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => navigate('/companies')}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Send className="h-4 w-4" />
                {isSubmitting ? 'Submitting…' : 'Submit for review'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </Container>
  )
}
