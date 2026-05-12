import { Bookmark, Clock3, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Job } from '../types'
import { initials, labelize, money, parseSkills, relativeTime } from '../utils/format'
import { Badge, IconButton } from './ui'

export function JobCard({ job, onSave }: { job: Job; onSave?: (job: Job) => void }) {
  const skills = parseSkills(job.skills).slice(0, 4)
  const salary = job.salaryMin || job.salaryMax ? money(job.salaryMin, job.salaryMax, job.salaryCurrency) : null
  const posted = relativeTime(job.createdAt)

  return (
    <article className="card-glow group relative flex h-full flex-col gap-4 p-5">
      {job.featured ? (
        <div className="absolute right-4 top-4">
          <Badge tone="amber">Featured</Badge>
        </div>
      ) : null}

      <header className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 text-sm font-bold tracking-tight text-slate-700 ring-1 ring-inset ring-slate-200">
          {initials(job.companyName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {job.companyName || 'Unknown company'}
          </p>
          <Link
            to={`/jobs/${job.id}`}
            className="mt-1 line-clamp-2 block text-base font-semibold leading-snug tracking-tight text-slate-950 transition group-hover:text-teal-800"
          >
            {job.title}
          </Link>
        </div>
      </header>

      <p className="line-clamp-2 text-sm leading-6 text-slate-600">{job.description}</p>

      <div className="flex flex-wrap gap-2">
        <Badge tone="teal">{labelize(job.jobType)}</Badge>
        <Badge>{labelize(job.experienceLevel)}</Badge>
        {salary ? <Badge tone="green">{salary}</Badge> : null}
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
            <IconButton
              type="button"
              onClick={() => onSave(job)}
              aria-label={`Save ${job.title}`}
            >
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
