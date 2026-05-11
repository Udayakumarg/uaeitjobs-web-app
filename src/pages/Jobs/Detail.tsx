import { Bookmark, BriefcaseBusiness, CalendarDays, Eye, MapPin, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CardSkeleton } from '../../components/Skeleton'
import { useToastStore } from '../../components/Toast'
import { Badge, Button, Card, Field, Textarea } from '../../components/ui'
import { errorMessage, jobsApi, seekerApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import type { Job } from '../../types'
import { dateLabel, labelize, money, parseSkills } from '../../utils/format'

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const toast = useToastStore((state) => state.add)
  const [job, setJob] = useState<Job | null>(null)
  const [coverLetter, setCoverLetter] = useState('')
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    jobsApi.detail(id)
      .then(({ data }) => setJob(data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [id])

  async function apply() {
    if (!user) {
      navigate('/login', { state: { from: `/jobs/${id}` } })
      return
    }
    if (user.userType !== 'job_seeker') {
      navigate('/access-denied')
      return
    }
    setApplying(true)
    try {
      await seekerApi.apply({ jobId: Number(id), coverLetter })
      toast({ type: 'success', title: 'Application submitted', message: 'You can track it from your dashboard.' })
    } catch (err) {
      toast({ type: 'error', title: 'Could not apply', message: errorMessage(err) })
    } finally {
      setApplying(false)
    }
  }

  async function save() {
    if (!user) return navigate('/login', { state: { from: `/jobs/${id}` } })
    try {
      await seekerApi.saveJob(Number(id))
      toast({ type: 'success', title: 'Saved job' })
    } catch (err) {
      toast({ type: 'error', title: 'Could not save', message: errorMessage(err) })
    }
  }

  if (loading) return <main className="mx-auto max-w-5xl px-4 py-10" aria-live="polite" aria-busy="true"><span className="sr-only">Loading job detail</span><CardSkeleton lines={5} /></main>
  if (error || !job) return <main className="mx-auto max-w-3xl px-4 py-16"><Card>{error || 'Job not found'}</Card></main>

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
      <section className="grid gap-5">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-950">{job.title}</h1>
              <p className="mt-2 text-lg text-slate-700">{job.companyName}</p>
            </div>
            {job.source === 'linkedin' ? <Badge tone="blue">LinkedIn import</Badge> : null}
          </div>
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1"><MapPin size={16} /> {job.locationUae || 'UAE'}</span>
            <span className="inline-flex items-center gap-1"><BriefcaseBusiness size={16} /> {labelize(job.jobType)}</span>
            <span className="inline-flex items-center gap-1"><Eye size={16} /> {job.viewCount ?? 0} views</span>
            <span className="inline-flex items-center gap-1"><CalendarDays size={16} /> {dateLabel(job.createdAt)}</span>
          </div>
          <p className="mt-5 text-xl font-semibold text-blue-800">{money(job.salaryMin, job.salaryMax, job.salaryCurrency)}</p>
          <div className="mt-5 flex flex-wrap gap-2">{parseSkills(job.skills).map((skill) => <Badge key={skill}>{skill}</Badge>)}</div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-slate-950">Description</h2>
          <p className="mt-3 whitespace-pre-line leading-7 text-slate-700">{job.description}</p>
        </Card>
        <Card>
          <h2 className="text-xl font-bold text-slate-950">Requirements</h2>
          <p className="mt-3 whitespace-pre-line leading-7 text-slate-700">{job.requirements || 'No specific requirements listed.'}</p>
        </Card>
      </section>

      <aside className="grid h-fit gap-4">
        <Card>
          <h2 className="text-lg font-bold text-slate-950">Apply for this role</h2>
          <Field label="Cover letter">
            <Textarea value={coverLetter} onChange={(event) => setCoverLetter(event.target.value)} placeholder="Briefly introduce yourself and your fit for this role." />
          </Field>
          <div className="mt-4 grid gap-2">
            <Button onClick={apply} disabled={applying}><Send size={16} /> {applying ? 'Applying...' : 'Apply now'}</Button>
            <Button variant="secondary" onClick={save}><Bookmark size={16} /> Save job</Button>
          </div>
        </Card>
        <Link className="text-sm font-semibold text-blue-700" to="/jobs">Back to all jobs</Link>
      </aside>
    </main>
  )
}
