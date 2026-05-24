import DOMPurify from 'dompurify'
import {
  ArrowLeft,
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Send,
  Share2,
  Zap,
} from 'lucide-react'

/** LinkedIn "in" logo — inline SVG so no lucide-react version dependency */
function LinkedinIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}
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
    datePosted: job.postedAt ?? job.createdAt, validThrough: job.expiresAt,
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
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)

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

  async function doApply() {
    setApplying(true)
    try {
      await seekerApi.apply({ jobId: job!.id, coverLetter: coverLetter.trim() || undefined })
      setApplied(true)
      setShowApplyModal(false)
      toast({ type: 'success', title: 'Application submitted!', message: 'Track it from your dashboard.' })
    } catch (err) {
      toast({ type: 'error', title: 'Could not apply', message: errorMessage(err) })
    } finally {
      setApplying(false)
    }
  }

  async function share() {
    const url = window.location.href
    try {
      if (navigator.share) { await navigator.share({ title: job?.title ?? 'Job', url }) }
      else { await navigator.clipboard.writeText(url); toast({ type: 'success', title: 'Link copied' }) }
    } catch { /* cancelled */ }
  }

  // When the user is not authenticated the server sets both applyUrl and
  // linkedinUrl to null (Phase 4 gating).  We surface a "Sign in to apply"
  // CTA instead of falling through to a generic LinkedIn search URL.
  const isGated = !user && job?.applyUrl == null && job?.linkedinUrl == null

  // HR-posted jobs have no external applyUrl — seeker applies within the platform.
  const isDirectApply = !!user && !job?.applyUrl && !job?.linkedinUrl

  const applyUrl = job?.applyUrl || job?.linkedinUrl
    || (user && !isDirectApply
        ? `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent((job?.title ?? '') + ' ' + (job?.companyName ?? ''))}&location=United%20Arab%20Emirates`
        : null)

  // Detect the external platform from the apply URL so we can label the
  // CTA ("Apply on LinkedIn", "Apply on Bayt", …) and show a source badge.
  const applySource = ((): { name: string; host: string } | null => {
    if (!applyUrl) return null
    try {
      const host = new URL(applyUrl).hostname.replace(/^www\./, '').toLowerCase()
      if (host.includes('linkedin.com'))       return { name: 'LinkedIn',       host }
      if (host.includes('indeed.com'))         return { name: 'Indeed',         host }
      if (host.includes('bayt.com'))           return { name: 'Bayt',           host }
      if (host.includes('naukrigulf.com'))     return { name: 'Naukrigulf',     host }
      if (host.includes('gulftalent.com'))     return { name: 'GulfTalent',     host }
      if (host.includes('glassdoor.com'))      return { name: 'Glassdoor',      host }
      if (host.includes('ziprecruiter.com'))   return { name: 'ZipRecruiter',   host }
      return null
    } catch { return null }
  })()

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
  const posted = relativeTime(job.postedAt ?? job.createdAt)

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
          <CompanyLogo logoUrl={job.companyLogoUrl} companyName={job.companyName} size="lg" />
          <span className="text-base font-semibold text-slate-700">{job.companyName}</span>
          {applySource?.name === 'LinkedIn' ? (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-[#0a66c2]/10 px-2.5 py-0.5 text-xs font-medium text-[#0a66c2]"
              title="Apply on LinkedIn"
            >
              <LinkedinIcon size={12} /> LinkedIn
            </span>
          ) : applySource ? (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200"
              title={`Sourced from ${applySource.name}`}
            >
              <ExternalLink size={11} /> via {applySource.name}
            </span>
          ) : null}
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
                <div className="prose-job" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(job.descriptionHtml) }} />
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

            // Detect raw HTML in description/requirements (e.g. legacy rows where
            // the LLM-formatted HTML was stored on `description` instead of
            // `descriptionHtml`). If it looks like HTML, render via DOMPurify;
            // otherwise fall back to plain-text rendering inside <p>.
            const looksLikeHtml = (s: string | null | undefined) =>
              !!s && /<(h3|p|ul|li|strong|em|br)\b/i.test(s)

            const renderBody = (text: string | null | undefined) =>
              looksLikeHtml(text) ? (
                <div
                  className="prose-job mt-3"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(text!) }}
                />
              ) : (
                <p className="prose-job mt-3 whitespace-pre-line">{text}</p>
              )

            return (
              <div className="grid gap-8">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950">About the role</h2>
                  {renderBody(job.description)}
                </div>
                {job.requirements ? (
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-slate-950">Requirements</h2>
                    {renderBody(job.requirements)}
                  </div>
                ) : null}
              </div>
            )
          })()}
        </div>

        {/* More from this company */}
        <div className="mt-12 border-t border-slate-200 pt-8 text-sm text-slate-500">
          <Link
            to={`/jobs?company=${encodeURIComponent(job.companyName ?? '')}`}
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
            {isGated ? (
              <Link
                to="/login"
                state={{ from: `/jobs/${id}` }}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-pink-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-pink-800 sm:flex-none"
              >
                Sign in to apply
              </Link>
            ) : isDirectApply ? (
              applied ? (
                <button disabled className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white sm:flex-none">
                  <CheckCircle2 size={15} /> Applied
                </button>
              ) : (
                <button
                  onClick={() => setShowApplyModal(true)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-pink-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-pink-800 sm:flex-none"
                >
                  <Send size={15} /> Apply now
                </button>
              )
            ) : (
              <a
                href={applyUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:flex-none"
              >
                <ExternalLink size={15} /> {applySource ? `Apply on ${applySource.name}` : 'Apply now'}
              </a>
            )}
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
      {/* ── In-platform apply modal ────────────────────────── */}
      {showApplyModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center"
          onClick={e => { if (e.target === e.currentTarget) setShowApplyModal(false) }}
        >
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
            <h2 className="text-lg font-bold text-slate-950">Apply for {job.title}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{job.companyName}</p>

            <div className="mt-4">
              <label className="text-sm font-medium text-slate-700">
                Cover letter <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/20 resize-none"
                rows={6}
                value={coverLetter}
                onChange={e => setCoverLetter(e.target.value)}
                placeholder="Briefly describe why you're a great fit for this role…"
                autoFocus
              />
            </div>

            <div className="mt-4 flex gap-3">
              <button
                disabled={applying}
                onClick={doApply}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-pink-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-pink-800 disabled:opacity-60"
              >
                {applying ? 'Submitting…' : <><Send size={14} /> Submit application</>}
              </button>
              <button
                onClick={() => setShowApplyModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
