import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { useToastStore } from '../../components/Toast'
import { Button, Card, Field, Input, Select, Textarea } from '../../components/ui'
import { errorMessage, hrApi, jobsApi } from '../../services/api'
import type { JobRequest } from '../../types'

const schema = z.object({
  title: z.string().min(3, 'Enter a job title'),
  companyName: z.string().min(2, 'Enter a company name'),
  description: z.string().min(20, 'Description should be at least 20 characters'),
  requirements: z.string().optional(),
  salaryMin: z.preprocess((value) => value === '' ? undefined : value, z.coerce.number().optional()),
  salaryMax: z.preprocess((value) => value === '' ? undefined : value, z.coerce.number().optional()),
  salaryCurrency: z.string().default('AED'),
  jobType: z.string().min(1, 'Select a job type'),
  experienceLevel: z.string().min(1, 'Select experience level'),
  locationUae: z.string().min(1, 'Select a location'),
  skills: z.string().optional(),
  expiresAt: z.string().optional(),
})

export type JobFormValues = z.infer<typeof schema>

const defaults: JobFormValues = {
  title: '',
  companyName: '',
  description: '',
  requirements: '',
  salaryMin: undefined,
  salaryMax: undefined,
  salaryCurrency: 'AED',
  jobType: 'full_time',
  experienceLevel: 'mid_3_5_yrs',
  locationUae: 'Dubai',
  skills: '',
  expiresAt: '',
}

export default function PostJob() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToastStore((state) => state.add)
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<JobFormValues>({ resolver: zodResolver(schema) as Resolver<JobFormValues>, defaultValues: defaults })

  useEffect(() => {
    if (!id) return
    jobsApi.detail(id).then(({ data }) => reset({
      title: data.title,
      companyName: data.companyName,
      description: data.description,
      requirements: data.requirements ?? '',
      salaryMin: data.salaryMin ?? undefined,
      salaryMax: data.salaryMax ?? undefined,
      salaryCurrency: data.salaryCurrency ?? 'AED',
      jobType: data.jobType ?? 'full_time',
      experienceLevel: data.experienceLevel ?? 'mid_3_5_yrs',
      locationUae: data.locationUae ?? 'Dubai',
      skills: data.skills ?? '',
      expiresAt: data.expiresAt?.slice(0, 10) ?? '',
    })).catch((error) => setServerError(errorMessage(error)))
  }, [id, reset])

  async function onSubmit(values: JobFormValues) {
    setServerError('')
    const payload: JobRequest = { ...values, salaryMin: values.salaryMin || null, salaryMax: values.salaryMax || null }
    try {
      const response = id ? await hrApi.updateJob(Number(id), payload) : await hrApi.createJob(payload)
      toast({ type: 'success', title: id ? 'Job updated' : 'Job posted', message: response.data.title })
      navigate('/hr')
    } catch (error) {
      setServerError(errorMessage(error))
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-950">{id ? 'Edit job' : 'Post a job'}</h1>
      <Card className="mt-6">
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title" error={errors.title?.message}><Input {...register('title')} /></Field>
            <Field label="Company" error={errors.companyName?.message}><Input {...register('companyName')} /></Field>
            <Field label="Job type" error={errors.jobType?.message}><Select {...register('jobType')}><option value="full_time">Full-time</option><option value="contract">Contract</option><option value="part_time">Part-time</option></Select></Field>
            <Field label="Experience" error={errors.experienceLevel?.message}><Select {...register('experienceLevel')}><option value="fresher">Fresher</option><option value="junior_1_2_yrs">1-2 yrs</option><option value="mid_3_5_yrs">3-5 yrs</option><option value="senior_5_plus">5+ yrs</option></Select></Field>
            <Field label="Location" error={errors.locationUae?.message}><Select {...register('locationUae')}><option>Dubai</option><option>Abu Dhabi</option><option>Sharjah</option><option>Ajman</option><option>Ras Al Khaimah</option><option>Remote</option></Select></Field>
            <Field label="Skills"><Input {...register('skills')} placeholder="Java, Spring Boot, PostgreSQL" /></Field>
            <Field label="Salary min"><Input type="number" {...register('salaryMin')} /></Field>
            <Field label="Salary max"><Input type="number" {...register('salaryMax')} /></Field>
          </div>
          <Field label="Description" error={errors.description?.message}><Textarea {...register('description')} /></Field>
          <Field label="Requirements"><Textarea {...register('requirements')} /></Field>
          {serverError ? <p className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{serverError}</p> : null}
          <Button className="w-fit" disabled={isSubmitting}><Save size={16} /> {isSubmitting ? 'Saving...' : 'Save job'}</Button>
        </form>
      </Card>
    </main>
  )
}
