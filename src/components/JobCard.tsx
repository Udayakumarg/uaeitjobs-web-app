import { Bookmark, Building2, Eye, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Job } from '../types'
import { labelize, money, parseSkills } from '../utils/format'
import { Badge, Button } from './ui'

export function JobCard({ job, onSave }: { job: Job; onSave?: (job: Job) => void }) {
  const skills = parseSkills(job.skills).slice(0, 4)
  return (
    <article className="card-glow group flex h-full flex-col gap-4 p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/jobs/${job.id}`}
            className="line-clamp-2 text-lg font-bold leading-snug text-slate-950 transition group-hover:text-teal-700"
          >
            {job.title}
          </Link>
          <p className="mt-1.5 flex items-center gap-1.5 truncate text-sm text-slate-600">
            <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">{job.companyName}</span>
          </p>
        </div>
        {job.featured ? <Badge tone="amber">Featured</Badge> : null}
      </header>

      <p className="line-clamp-3 text-sm leading-6 text-slate-600">{job.description}</p>

      <div className="flex flex-wrap gap-2">
        <Badge tone="blue">{labelize(job.jobType)}</Badge>
        <Badge>{labelize(job.experienceLevel)}</Badge>
        {job.salaryMin || job.salaryMax ? (
          <Badge tone="green">{money(job.salaryMin, job.salaryMax, job.salaryCurrency)}</Badge>
        ) : null}
      </div>

      {skills.length ? (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span
              key={skill}
              className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600"
            >
              {skill}
            </span>
          ))}
        </div>
      ) : null}

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {job.locationUae || 'UAE'}
        </span>
        <span className="flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" />
          {job.viewCount ?? 0} views
        </span>
        <div className="flex gap-2">
          {onSave ? (
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => onSave(job)}
              aria-label={`Save ${job.title}`}
            >
              <Bookmark className="h-4 w-4" />
            </Button>
          ) : null}
          <Link to={`/jobs/${job.id}`}>
            <Button size="sm">View role</Button>
          </Link>
        </div>
      </footer>
    </article>
  )
}
