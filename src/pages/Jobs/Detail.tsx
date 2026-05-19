import {
  ArrowLeft,
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Eye,
  MapPin,
  Share2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CardSkeleton } from '../../components/Skeleton'
import { useToastStore } from '../../components/Toast'
import { Badge, Button, Card, Container } from '../../components/ui'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { errorMessage, jobsApi, seekerApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import type { Job } from '../../types'
import { dateLabel, initials, labelize, money, parseSkills, relativeTime } from '../../utils/format'

/** Build a schema.org/JobPosting payload for Google rich-results. */
function buildJobPostingJsonLd(job: Job): Record<string, unknown> {
  const emirateAddress: Record<string, string> = {
    dubai: 'Dubai',
    abu_dhabi: 'Abu Dhabi',
    sharjah: 'Sharjah',
    ajman: 'Ajman',
    fujairah: 'Fujairah',
    ras_al_khaimah: 'Ras Al Khaimah',
    umm_al_quwain: 'Umm Al Quwain',
  }
  const locality = job.emirate ? emirateAddress[job.emirate] : job.locationUae || 'United Arab Emirates'
  const employmentMap: Record<string, string> = {
    full_time: 'FULL_TIME',
    part_time: 'PART_TIME',
    contract: 'CONTRACTOR',
    internship: 'INTERN',
    temporary: 'TEMPORARY',
  }

  const payload: Record<string, unknown> = {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: job.title,
    description: `<p>${(job.description ?? '').replace(/</g, '&lt;')}</p>${job.requirements ? `<h3>Requirements</h3><p>${job.requirements.replace(/</g, '&lt;')}</p>` : ''}`,
    datePosted: job.createdAt,
    validThrough: job.expiresAt,
    employmentType: job.jobType ? employmentMap[job.jobType] ?? job.jobType.toUpperCase() : undefined,
    directApply: true,
    hiringOrganization: {
      '@type': 'Organization',
      name: job.companyName,
      sameAs: 'https://www.uaeitjobs.com',
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: locality,
        addressCountry: 'AE',
      },
    },
    identifier: {
      '@type': 'PropertyValue',
      name: 'UAEITJOBS',
      value: String(job.id),
    },
  }

  if (job.remoteUae) {
    payload.jobLocationType = 'TELECOMMUTE'
    payload.applicantLocationRequirements = {
      '@type': 'Country',
      name: 'United Arab Emirates',
    }
  }

  if (job.salaryMin || job.salaryMax) {
    payload.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: job.salaryCurrency || 'AED',
      value: {
        '@type': 'QuantitativeValue',
        minValue: job.salaryMin ?? undefined,
        maxValue: job.salaryMax ?? undefined,
        unitText: 'MONTH',
      },
    }
  }

  return payload
}

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const toast = useToastStore((state) => state.add)
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // SEO — title, description and JobPosting JSON-LD. The hook handles
  // tag insertion + cleanup; empty values mean we skip until the job loads.
  useDocumentMeta(
    job
      ? {
          title: `${job.title} at ${job.companyName}`,
          description: (job.description ?? '').slice(0, 160) || `${job.title} role at ${job.companyName} in ${job.locationUae || 'UAE'}.`,
          canonical: `https://www.uaeitjobs.com/jobs/${job.id}`,
          jsonLd: buildJobPostingJsonLd(job),
        }
      : { title: 'Job detail', description: 'Loading role…' },
  )

  useEffect(() => {
    if (!id) return
    jobsApi
      .detail(id)
      .then(({ data }) => setJob(data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [id])

  async function save() {
    if (!user) return navigate('/login', { state: { from: `/jobs/${id}` } })
    try {
      await seekerApi.saveJob(Number(id))
      toast({ type: 'success', title: 'Saved job', message: 'Available from your dashboard.' })
    } catch (err) {
      toast({ type: 'error', title: 'Could not save', message: errorMessage(err) })
    }
  }

  async function share() {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: job?.title ?? 'Job', url })
      } else {
        await navigator.clipboard.writeText(url)
        toast({ type: 'success', title: 'Link copied' })
      }
    } catch {
      /* user cancelled */
    }
  }

  if (loading) {
    return (
      <Container className="py-10" aria-live="polite" aria-busy="true">
        <span className="sr-only">Loading job detail</span>
        <CardSkeleton lines={5} />
      </Container>
    )
  }

  if (error || !job) {
    return (
      <Container className="py-16">
        <Card>{error || 'Job not found.'}</Card>
      </Container>
    )
  }

  const skills = parseSkills(job.skills)
  const salary = money(job.salaryMin, job.salaryMax, job.salaryCurrency)
  const posted = relativeTime(job.createdAt)

  return (
    <>
      {/* Top breadcrumb / back nav */}
      <div className="border-b border-slate-200/70 bg-white/70">
        <Container className="flex items-center justify-between py-4">
          <Link
            to="/jobs"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-950"
          >
            <ArrowLeft size={16} /> Back to all roles
          </Link>
          <button
            onClick={share}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-950"
          >
            <Share2 size={16} /> Share
          </button>
        </Container>
      </div>

      <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_380px]">
        {/* Main column */}
        <section className="grid gap-6">
          {/* Hero panel */}
          <article className="surface-panel overflow-hidden">
            <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white p-7 sm:p-9">
              <div className="flex items-start gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-lg font-bold tracking-tight text-slate-700 shadow-sm ring-1 ring-slate-200">
                  {initials(job.companyName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
                    {job.companyName}
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                    {job.title}
                  </h1>
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={15} /> {job.locationUae || 'UAE'}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <BriefcaseBusiness size={15} /> {labelize(job.jobType)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Eye size={15} /> {job.viewCount ?? 0} views
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays size={15} /> {posted || dateLabel(job.createdAt)}
                    </span>
                  </div>
                </div>
                {job.source === 'linkedin' ? (
                  <Badge tone="blue">LinkedIn import</Badge>
                ) : null}
              </div>

              {/* UAE essentials badges */}
              {job.visaType || job.emirate || job.immediateJoiner || job.remoteUae ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {job.visaType ? (
                    <Badge tone="teal">
                      {job.visaType === 'free_visa' && 'Free visa'}
                      {job.visaType === 'employment_visa' && 'Visa sponsored'}
                      {job.visaType === 'own_visa' && 'Own visa required'}
                      {job.visaType === 'visit_visa_accepted' && 'Visit visa accepted'}
                    </Badge>
                  ) : null}
                  {job.emirate ? <Badge tone="slate">{labelize(job.emirate)}</Badge> : null}
                  {job.immediateJoiner ? <Badge tone="amber">Immediate joiner</Badge> : null}
                  {job.remoteUae ? <Badge tone="green">Remote in UAE</Badge> : null}
                </div>
              ) : null}

              {/* Quick facts */}
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Salary
                  </p>
                  <p className="mt-1.5 text-base font-semibold tracking-tight text-slate-950">
                    {salary}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Experience
                  </p>
                  <p className="mt-1.5 text-base font-semibold tracking-tight text-slate-950">
                    {labelize(job.experienceLevel)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Job type
                  </p>
                  <p className="mt-1.5 text-base font-semibold tracking-tight text-slate-950">
                    {labelize(job.jobType)}
                  </p>
                </div>
              </div>

              {skills.length ? (
                <div className="mt-6 flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </article>

          {/* Description */}
          <article className="surface-panel p-7 sm:p-9">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">About the role</h2>
            <p className="prose-job mt-4">{job.description}</p>
          </article>

          {/* Requirements */}
          <article className="surface-panel p-7 sm:p-9">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">Requirements</h2>
            <p className="prose-job mt-4">
              {job.requirements || 'No specific requirements listed for this role.'}
            </p>
          </article>
        </section>

        {/* Sticky sidebar */}
        <aside className="grid h-fit gap-4 lg:sticky lg:top-24">
          <Card>
            <p className="eyebrow">Apply</p>
            <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-950">
              Apply on the original posting
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              UAEITJOBS is a curated discovery layer — your application goes directly to the
              recruiter on the source platform.
            </p>

            <div className="mt-4 grid gap-2">
              <a
                href={job.applyUrl || job.linkedinUrl || `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent((job.title ?? '') + ' ' + (job.companyName ?? ''))}&location=United%20Arab%20Emirates`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                <ExternalLink size={16} /> Apply on company website
              </a>
              <Button variant="secondary" onClick={save}>
                <Bookmark size={16} /> Save for later
              </Button>
              <button
                type="button"
                onClick={share}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Share2 size={16} /> Share role
              </button>
            </div>

            <ul className="mt-5 grid gap-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-700" />
                100% free — no signup needed to apply
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-700" />
                Save roles to your shortlist (login)
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-700" />
                Filter by stack, visa, emirate and more
              </li>
            </ul>
          </Card>

          <Card className="bg-slate-950 text-white">
            <p className="eyebrow eyebrow-dark">Hiring company</p>
            <h3 className="mt-1.5 text-lg font-semibold tracking-tight">{job.companyName}</h3>
            <p className="mt-1 text-sm text-slate-300">
              UAE-based, verified employer hiring across {job.locationUae || 'the UAE'}.
            </p>
            <Link
              to={`/jobs?q=${encodeURIComponent(job.companyName ?? '')}`}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-300 hover:text-indigo-200"
            >
              See more roles from {job.companyName} →
            </Link>
          </Card>
        </aside>
      </Container>
    </>
  )
}
