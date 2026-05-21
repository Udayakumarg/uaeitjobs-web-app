import {
  ArrowLeft,
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  ExternalLink,
  MapPin,
  Share2,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CompanyLogo } from '../../components/CompanyLogo'
import { useToastStore } from '../../components/Toast'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { errorMessage, jobsApi, seekerApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import type { Job } from '../../types'
import { labelize, money, parseSkills, relativeTime } from '../../utils/format'

function buildJobPostingJsonLd(job: Job): Record<string, unknown> {
  const emirateAddress: Record<string, string> = {
    dubai: 'Dubai', abu_dhabi: 'Abu Dhabi', sharjah: 'Sharjah',
    ajman: 'Ajman', fujairah: 'Fujairah', ras_al_khaimah: 'Ras Al Khaimah', umm_al_quwain: 'Umm Al Quwain',
  }
  const employmentMap: Record<string, string> = {
    full_time: 'FULL_TIME', part_time: 'PART_TIME', contract: 'CONTRACTOR',
    internship: 'INTERN', temporary: 'TEMPORARY',
  }
  const locality = job.emirate ? emirateAddress[job.emirate] : job.locationUae || 'United Arab Emirates'
  const payload: Record<string, unknown> = {
    '@context': 'https://schema.org/', '@type': 'JobPosting',
    title: job.title,
    description: `<p>${(job.description ?? '').replace(/</g, '&lt;')}</p>${job.requirements ? `<h3>Requirements</h3><p>${job.requirements.replace(/</g, '&lt;')}</p>` : ''}`,
    datePosted: job.createdAt, validThrough: job.expiresAt,
    employmentType: job.jobType ? employmentMap[job.jobType] ?? job.jobType.toUpperCase() : undefined,
    directApply: true,
    hiringOrganization: { '@type': 'Organization', name: job.companyName, sameAs: 'https://www.uaeitjobs.com' },
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: locality, addressCountry: 'AE' } },
    identifier: { '@type': 'PropertyValue', name: 'UAEITJOBS', value: String(job.id) },
  }
  if (job.remoteUae) { payload.jobLocationType = 'TELECOMMUTE'; payload.applicantLocationRequirements = { '@type': 'Country', name: 'United Arab Emirates' } }
  if (job.salaryMin || job.salaryMax) {
    payload.baseSalary = { '@type': 'MonetaryAmount', currency: job.salaryCurrency || 'AED', value: { '@type': 'QuantitativeValue', minValue: job.salaryMin ?? undefined, maxValue: job.salaryMax ?? undefined, unitText: 'MONTH' } }
  }
  return payload
}

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const toast = useToastStore((s) => s.add)
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useDocumentMeta(
    job
      ? { title: `${job.title} at ${job.companyName}`, description: (job.description ?? '').slice(0, 160) || `${job.title} at ${job.companyName} in ${job.locationUae || 'UAE'}.`, canonical: `https://www.uaeitjobs.com/jobs/${job.id}`, jsonLd: buildJobPostingJsonLd(job) }
      : { title: 'Job detail', description: 'Loading…' }
  )

  useEffect(() => {
    if (!id) return
    jobsApi.detail(id).then(({ data }) => setJob(data)).catch((err) => setError(errorMessage(err))).finally(() => setLoading(false))
  }, [id])

  async function save() {
    if (!user) return navigate('/login', { state: { from: `/jobs/${id}` } })
    try {
      await seekerApi.saveJob(Number(id))
      toast({ type: 'success', title: 'Saved', message: 'Available from your dashboard.' })
    } catch (err) {
      toast({ type: 'error', title: 'Could not save', message: errorMessage(err) })
    }
  }

  async function share() {
    const url = window.location.href
    try {
      if (navigator.share) { await navigator.share({ title: job?.title ?? 'Job', url }) }
      else { await navigator.clipboard.writeText(url); toast({ type: 'success', title: 'Link copied' }) }
    } catch { /* cancelled */ }
  }

  const applyUrl = job?.applyUrl || job?.linkedinUrl
    || `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent((job?.title ?? '') + ' ' + (job?.companyName ?? ''))}&location=United%20Arab%20Emirates`

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="space-y-4 animate-pulse">
          <div className="h-4 w-24 rounded bg-slate-200" />
          <div className="h-10 w-3/4 rounded bg-slate-200" />
          <div className="h-4 w-1/2 rounded bg-slate-200" />
          <div className="h-32 rounded bg-slate-200" />
        </div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 text-slate-600">
        {error || 'Job not found.'}
      </div>
    )
  }

  const skills = parseSkills(job.skills)
  const salary = money(job.salaryMin, job.salaryMax, job.salaryCurrency)
  const posted = relativeTime(job.createdAt)

  return (
    <>
      {/* ── Nav bar ────────────────────────────────────────── */}
      <div className="sticky top-[57px] z-20 border-b border-slate-200/60 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-950">
            <ArrowLeft size={15} /> All roles
          </Link>
          <button onClick={share} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-950">
            <Share2 size={15} /> Share
          </button>
        </div>
      </div>

      {/* ── Page content ───────────────────────────────────── */}
      <div className="mx-auto max-w-3xl px-4 pb-36 pt-12 sm:px-6">

        {/* Company */}
        <div className="flex items-center gap-3">
          <CompanyLogo logoUrl={job.companyLogoUrl} companyName={job.companyName} size="sm" />
          <span className="text-sm font-semibold text-slate-600">{job.companyName}</span>
        </div>

        {/* Title */}
        <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">
          {job.title}
        </h1>

        {/* Meta row */}
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
          {job.locationUae ? (
            <span className="flex items-center gap-1.5">
              <MapPin size={14} className="shrink-0" /> {job.locationUae}
            </span>
          ) : null}
          {job.jobType ? (
            <span className="flex items-center gap-1.5">
              <BriefcaseBusiness size={14} className="shrink-0" /> {labelize(job.jobType)}
            </span>
          ) : null}
          {job.experienceLevel ? (
            <span className="font-medium text-slate-700">{labelize(job.experienceLevel)}</span>
          ) : null}
          {posted ? (
            <span className="flex items-center gap-1.5">
              <CalendarDays size={14} className="shrink-0" /> {posted}
            </span>
          ) : null}
        </div>

        {/* Key facts row */}
        {(job.emirate || job.locationUae || job.experienceLevel || job.jobType || salary || job.visaType || job.remoteUae || job.immediateJoiner) ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {/* Primary — location */}
            {(job.emirate || job.locationUae) ? (
              <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                <MapPin size={13} className="shrink-0" />
                {job.emirate ? labelize(job.emirate) : job.locationUae}
              </span>
            ) : null}
            {/* Primary — experience level */}
            {job.experienceLevel ? (
              <span className="rounded-full bg-pink-50 px-4 py-1.5 text-sm font-semibold text-pink-700 ring-1 ring-inset ring-pink-100">
                {labelize(job.experienceLevel)}
              </span>
            ) : null}
            {/* Job type */}
            {job.jobType ? (
              <span className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                {labelize(job.jobType)}
              </span>
            ) : null}
            {/* Salary — only if present */}
            {salary ? (
              <span className="rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200">
                {salary}
              </span>
            ) : null}
            {job.remoteUae ? (
              <span className="rounded-full bg-pink-50 px-4 py-1.5 text-sm font-semibold text-pink-700 ring-1 ring-inset ring-pink-100">
                Remote UAE
              </span>
            ) : null}
            {job.immediateJoiner ? (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-4 py-1.5 text-sm font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
                <Zap size={13} /> Immediate joiner
              </span>
            ) : null}
            {job.visaType === 'free_visa' || job.visaType === 'employment_visa' ? (
              <span className="rounded-full bg-sky-50 px-4 py-1.5 text-sm font-semibold text-sky-800 ring-1 ring-inset ring-sky-100">
                Visa provided
              </span>
            ) : null}
            {job.visaType === 'own_visa' ? (
              <span className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                Own visa required
              </span>
            ) : null}
            {job.visaType === 'visit_visa_accepted' ? (
              <span className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                Visit visa accepted
              </span>
            ) : null}
          </div>
        ) : null}

        {/* Skills */}
        {skills.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span key={skill} className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                {skill}
              </span>
            ))}
          </div>
        ) : null}

        {/* Divider */}
        <hr className="mt-10 border-slate-200" />

        {/* Description */}
        <div className="mt-10">
          {(() => {
            if (job.descriptionHtml?.trim()) {
              return (
                <div className="prose-job" dangerouslySetInnerHTML={{ __html: job.descriptionHtml }} />
              )
            }

            let sections: { heading: string; items: string[] }[] = []
            if (job.descriptionSections) {
              try {
                const parsed = JSON.parse(job.descriptionSections)
                if (Array.isArray(parsed)) sections = parsed.filter((s) => s && typeof s.heading === 'string' && Array.isArray(s.items))
              } catch { /* fall through */ }
            }

            if (sections.length > 0) {
              return (
                <div className="grid gap-8">
                  {sections.map((section) => (
                    <div key={section.heading}>
                      <h2 className="text-lg font-semibold tracking-tight text-slate-950">{section.heading}</h2>
                      {section.items.length === 1 ? (
                        <p className="prose-job mt-3">{section.items[0]}</p>
                      ) : (
                        <ul className="mt-3 grid gap-2">
                          {section.items.map((item, i) => (
                            <li key={i} className="flex items-start gap-3 text-[15px] leading-7 text-slate-700">
                              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-500" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )
            }

            return (
              <div className="grid gap-8">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950">About the role</h2>
                  <p className="prose-job mt-3">{job.description}</p>
                </div>
                {job.requirements ? (
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-slate-950">Requirements</h2>
                    <p className="prose-job mt-3">{job.requirements}</p>
                  </div>
                ) : null}
              </div>
            )
          })()}
        </div>

        {/* More from this company */}
        <div className="mt-12 border-t border-slate-200 pt-8 text-sm text-slate-500">
          <Link
            to={`/jobs?q=${encodeURIComponent(job.companyName ?? '')}`}
            className="font-semibold text-pink-700 hover:text-pink-800"
          >
            See all roles from {job.companyName} →
          </Link>
        </div>
      </div>

      {/* ── Sticky apply bar ───────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-sm shadow-[0_-4px_20px_rgba(15,23,42,0.08)]">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4 sm:px-6">
          <div className="hidden min-w-0 flex-1 sm:block">
            <p className="truncate text-sm font-semibold text-slate-950">{job.title}</p>
            <p className="truncate text-xs text-slate-500">{job.companyName}{salary ? ` · ${salary}` : ''}</p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <a
              href={applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:flex-none"
            >
              <ExternalLink size={15} /> Apply now
            </a>
            <button
              onClick={save}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              aria-label="Save job"
            >
              <Bookmark size={15} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
