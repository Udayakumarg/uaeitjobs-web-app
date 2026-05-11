import { Bookmark, Building2, Eye, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Job } from '../types'
import { labelize, money, parseSkills } from '../utils/format'
import { Badge, Button, Card } from './ui'

export function JobCard({ job, onSave }: { job: Job; onSave?: (job: Job) => void }) {
  const skills = parseSkills(job.skills).slice(0, 4)
  return (
    <Card className="grid h-full gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to={`/jobs/${job.id}`} className="text-lg font-bold text-slate-950 hover:text-blue-700">{job.title}</Link>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600"><Building2 className="h-4 w-4" />{job.companyName}</p>
        </div>
        {job.featured ? <Badge tone="amber">Featured</Badge> : null}
      </div>
      <p className="line-clamp-3 text-sm text-slate-600">{job.description}</p>
      <div className="flex flex-wrap gap-2">
        <Badge tone="blue">{labelize(job.jobType)}</Badge>
        <Badge>{labelize(job.experienceLevel)}</Badge>
        <Badge>{money(job.salaryMin, job.salaryMax, job.salaryCurrency)}</Badge>
      </div>
      {skills.length ? <div className="flex flex-wrap gap-2">{skills.map((skill) => <span key={skill} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{skill}</span>)}</div> : null}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500">
        <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{job.locationUae || 'UAE'}</span>
        <span className="flex items-center gap-1.5"><Eye className="h-4 w-4" />{job.viewCount ?? 0}</span>
        <div className="flex gap-2">
          {onSave ? <Button variant="secondary" type="button" onClick={() => onSave(job)} aria-label={`Save ${job.title}`}><Bookmark className="h-4 w-4" /></Button> : null}
          <Link to={`/jobs/${job.id}`}><Button>View</Button></Link>
        </div>
      </div>
    </Card>
  )
}
