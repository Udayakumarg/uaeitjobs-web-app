import { Bookmark, Clock3, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { JOB_CATEGORIES, type Job } from '../types'
import { labelize, money, parseSkills, relativeTime } from '../utils/format'
import { CompanyLogo } from './CompanyLogo'
import { Badge, IconButton } from './ui'

interface JobCardProps {
  job: Job
  onSave?: (job: Job) => void
  variant?: 'grid' | 'list'
}

export function JobCard({ job, onSave, variant = 'grid' }: JobCardProps) {
  const skills = parseSkills(job.skills).slice(0, 4)
  const salary = job.salaryMin || job.salaryMax ? money(job.salaryMin, job.salaryMax, job.salaryCurrency) : null
  const posted = relativeTime(job.createdAt)
  const category = JOB_CATEGORIES.find((entry) => entry.value === job.jobCategory)

  /* ── List variant — compact horizontal row ──────────────────── */
  if (variant === 'list') {
    return (
      <article className="card-glow group relative flex items-center gap-4 px-5 py-4">
        {job.featured ? (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:inline-flex">
            <Badge tone="amber">Featured</Badge>
          </span>
        ) : null}

        <CompanyLogo logoUrl={job.companyLogoUrl} companyName={job.companyName} size="md" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <Link
              to={`/jobs/${job.id}`}
              className="font-semibold leading-snug tracking-tight text-slate-950 transition group-hover:text-indigo-800"
            >
              {job.title}
            </Link>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {job.companyName}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {job.locationUae || 'UAE'}
            </span>
            {posted ? (
              <span className="flex items-center gap-1">
                <Clock3 className="h-3 w-3" /> {posted}
              </span>
            ) : null}
            <div className="flex flex-wrap gap-1.5">
              {category ? (
                <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 ring-1 ring-inset ring-indigo-100">
                  {category.emoji} {category.label}
                </span>
              ) : null}
              <Badge tone="teal">{labelize(job.jobType)}</Badge>
              {salary ? <Badge tone="green">{salary}</Badge> : null}
              {job.visaType === 'free_visa' || job.visaType === 'employment_visa' ? (
                <Badge tone="blue">Visa</Badge>
              ) : null}
              {job.immediateJoiner ? <Badge tone="amber">Immediate</Badge> : null}
              {job.remoteUae ? <Badge tone="green">Remote</Badge> : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          {onSave ? (
            <IconButton type="button" onClick={() => onSave(job)} aria-label={`Save ${job.title}`}>
              <Bookmark className="h-4 w-4" />
            </IconButton>
          ) : null}
          <Link
            to={`/jobs/${job.id}`}
            className="inline-flex h-8 items-center justify-center rounded-lg bg-slate-950 px-3 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            View
          </Link>
        </div>
      </article>
    )
  }

  /* ── Grid variant — original card ───────────────────────────── */
  return (
    <article className="card-glow group relative flex h-full flex-col gap-4 p-5">
      {job.featured ? (
        <div className="absolute right-4 top-4">
          <Badge tone="amber">Featured</Badge>
        </div>
      ) : null}

      <header className="flex items-start gap-3">
        <CompanyLogo logoUrl={job.companyLogoUrl} companyName={job.companyName} size="md" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {job.companyName || 'Unknown company'}
          </p>
          <Link
            to={`/jobs/${job.id}`}
            className="mt-1 line-clamp-2 block text-base font-semibold leading-snug tracking-tight text-slate-950 transition group-hover:text-indigo-800"
          >
            {job.title}
          </Link>
        </div>
      </header>

      <p className="line-clamp-2 text-sm leading-6 text-slate-600">{job.description}</p>

      <div className="flex flex-wrap gap-2">
        {category ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-700 ring-1 ring-inset ring-indigo-100">
            <span aria-hidden="true">{category.emoji}</span>
            {category.label}
          </span>
        ) : null}
        <Badge tone="teal">{labelize(job.jobType)}</Badge>
        <Badge>{labelize(job.experienceLevel)}</Badge>
        {salary ? <Badge tone="green">{salary}</Badge> : null}
        {job.visaType === 'free_visa' || job.visaType === 'employment_visa' ? (
          <Badge tone="blue">Visa provided</Badge>
        ) : null}
        {job.immediateJoiner ? <Badge tone="amber">Immediate</Badge> : null}
        {job.remoteUae ? <Badge tone="green">Remote UAE</Badge> : null}
      </div>

      {skills.length ? (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span
              key={skill}
              className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600"
            >
              {skill}
            </span>
          ))}
        </div>
      ) : null}

      <footer className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {job.locationUae || 'UAE'}
          </span>
          {posted ? (
            <span className="flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              {posted}
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          {onSave ? (
            <IconButton type="button" onClick={() => onSave(job)} aria-label={`Save ${job.title}`}>
              <Bookmark className="h-4 w-4" />
            </IconButton>
          ) : null}
          <Link
            to={`/jobs/${job.id}`}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-950 px-4 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            View role
          </Link>
        </div>
      </footer>
    </article>
  )
}
