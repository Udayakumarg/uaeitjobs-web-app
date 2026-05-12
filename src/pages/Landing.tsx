import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Cloud,
  Code2,
  Database,
  MapPin,
  Search,
  Shield,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { jobsApi } from '../services/api'
import { Button } from '../components/ui'
import type { Job } from '../types'

const CATEGORIES = [
  { icon: Code2, label: 'Software Engineering', count: 'Java, Node, Python' },
  { icon: Cloud, label: 'Cloud & DevOps', count: 'AWS, Azure, K8s' },
  { icon: Database, label: 'Data & AI', count: 'ML, Analytics' },
  { icon: Shield, label: 'Cybersecurity', count: 'SOC, GRC' },
]

export default function Landing() {
  const [stats, setStats] = useState({ totalJobs: 0, companies: 0, countriesRepresented: 0 })
  const [featured, setFeatured] = useState<Job[]>([])

  useEffect(() => {
    jobsApi.stats().then(({ data }) => setStats(data)).catch(() => undefined)
    jobsApi
      .list({ page: 0, size: 6 })
      .then(({ data }) => setFeatured(data.content))
      .catch(() => undefined)
  }, [])

  return (
    <div>
      <section className="hero-image relative overflow-hidden px-4 pb-32 pt-20 text-white sm:px-6 lg:px-8 lg:pt-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl animate-fade-in-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-teal-50 backdrop-blur">
              <Sparkles size={14} /> UAE tech hiring, focused
            </span>
            <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              The fastest way to <span className="gradient-text">hire & be hired</span> in UAE IT.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-teal-50/90">
              Software, cloud, data, cybersecurity, product, and IT roles across Dubai, Abu Dhabi,
              Sharjah, and the wider UAE - curated and verified.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link to="/jobs">
                <Button size="lg" className="bg-white !text-slate-950 hover:bg-teal-50 hover:!text-teal-800">
                  <Search size={18} /> Browse jobs
                </Button>
              </Link>
              <Link to="/register">
                <Button
                  size="lg"
                  variant="ghost"
                  className="border border-white/30 !text-white backdrop-blur hover:bg-white/10"
                >
                  Create account <ArrowRight size={18} />
                </Button>
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-teal-100/90">
              <span className="flex items-center gap-2">
                <MapPin size={16} /> Dubai | Abu Dhabi | Sharjah
              </span>
              <span className="flex items-center gap-2">
                <BriefcaseBusiness size={16} /> Verified employers
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-20 grid max-w-7xl gap-4 px-4 pb-16 sm:grid-cols-3 sm:px-6 lg:px-8">
        {[
          { label: 'Active jobs', value: stats.totalJobs || '20+', icon: BriefcaseBusiness },
          { label: 'Hiring companies', value: stats.companies || '10+', icon: Building2 },
          { label: 'Candidate reach', value: stats.countriesRepresented || 'UAE+', icon: MapPin },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={String(label)}
            className="card-glow flex items-center gap-4 px-6 py-5"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-100">
              <Icon size={22} />
            </span>
            <div>
              <p className="text-2xl font-bold tracking-tight text-slate-950">{value}</p>
              <p className="text-sm text-slate-600">{label}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">Explore</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Roles by speciality
            </h2>
          </div>
          <Link to="/jobs" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map(({ icon: Icon, label, count }) => (
            <Link
              key={label}
              to={`/jobs?q=${encodeURIComponent(label.split(' ')[0])}`}
              className="card-glow group flex flex-col gap-3 p-6"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-100 transition group-hover:bg-teal-100">
                <Icon size={20} />
              </span>
              <div>
                <p className="text-base font-semibold text-slate-950">{label}</p>
                <p className="mt-1 text-sm text-slate-500">{count}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {featured.length > 0 ? (
        <section className="bg-white/60 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">Latest</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                  Open roles right now
                </h2>
              </div>
              <Link to="/jobs" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800">
                See all jobs <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {featured.map((job) => (
                <Link
                  key={job.id}
                  to={`/jobs/${job.id}`}
                  className="card-glow group flex flex-col gap-3 p-6"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                    {job.companyName}
                  </p>
                  <h3 className="text-lg font-bold leading-snug text-slate-950 group-hover:text-teal-700">
                    {job.title}
                  </h3>
                  <p className="line-clamp-2 text-sm text-slate-600">{job.description}</p>
                  <div className="mt-auto flex items-center gap-3 pt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin size={14} /> {job.locationUae || 'UAE'}
                    </span>
                    {job.jobType ? <span className="chip">{job.jobType.replace('_', ' ')}</span> : null}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 px-8 py-14 text-white shadow-lg sm:px-14">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Ready to make your next move?
              </h2>
              <p className="mt-3 max-w-2xl text-base text-teal-100">
                Create a free account to apply in one click, save roles, and let recruiters reach
                you directly.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/register">
                <Button size="lg" className="bg-white !text-slate-950 hover:bg-teal-50">
                  Join uaeitjobs <ArrowRight size={18} />
                </Button>
              </Link>
              <Link to="/jobs">
                <Button
                  size="lg"
                  variant="ghost"
                  className="border border-white/30 !text-white hover:bg-white/10"
                >
                  Browse jobs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
