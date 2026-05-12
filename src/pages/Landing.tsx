import {
  ArrowRight,
  Award,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronDown,
  Cloud,
  Code2,
  Database,
  Globe2,
  LayoutGrid,
  LineChart,
  MapPin,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  Users2,
  Zap,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState, type FormEvent } from 'react'
import { jobsApi } from '../services/api'
import { Button, Container, Section, SectionHeading, Stat } from '../components/ui'
import type { Job } from '../types'

const CATEGORIES = [
  { icon: Code2, label: 'Software Engineering', count: 'Java · Node · Python · Go', query: 'engineer' },
  { icon: Cloud, label: 'Cloud & DevOps', count: 'AWS · Azure · Kubernetes', query: 'cloud' },
  { icon: Database, label: 'Data & AI', count: 'ML · Analytics · BI', query: 'data' },
  { icon: Shield, label: 'Cybersecurity', count: 'SOC · GRC · AppSec', query: 'security' },
  { icon: LayoutGrid, label: 'Product & Design', count: 'PM · UX · UI', query: 'product' },
  { icon: BarChart3, label: 'IT & Infrastructure', count: 'SysAdmin · Networks', query: 'infrastructure' },
]

const HOW_IT_WORKS_SEEKER = [
  {
    icon: Users2,
    title: 'Build a verified profile',
    body: 'Upload your CV, auto-parse skills, and let recruiters discover you directly.',
  },
  {
    icon: Zap,
    title: 'Apply in one click',
    body: 'Tailored cover letters, saved roles, and instant alerts when matching jobs go live.',
  },
  {
    icon: LineChart,
    title: 'Track every step',
    body: 'See application status, recruiter views, and shortlist progress from one dashboard.',
  },
]

const HOW_IT_WORKS_HR = [
  {
    icon: Building2,
    title: 'Post or import jobs',
    body: 'Write once, or paste a LinkedIn URL — our parser extracts everything in seconds.',
  },
  {
    icon: TrendingUp,
    title: 'Reach UAE-ready talent',
    body: 'Filter by skill, level, and location. Stop wasting time on irrelevant inbound.',
  },
  {
    icon: Award,
    title: 'Hire faster, smarter',
    body: 'Score applicants, shortlist, and track pipeline progress with a single workspace.',
  },
]

const TRUST_LOGOS = [
  'EMIRATES NBD',
  'ETISALAT',
  'DU',
  'CAREEM',
  'NOON',
  'TALABAT',
  'BAYUT',
  'CHALHOUB',
]

const FAQ = [
  {
    q: 'Is uaeitjobs free for job seekers?',
    a: 'Yes — creating an account, applying to roles, and saving jobs are all completely free for candidates.',
  },
  {
    q: 'Are employers verified?',
    a: 'Every HR account is verified before they can post jobs. We confirm the company exists and the recruiter is authorised.',
  },
  {
    q: 'How is uaeitjobs different from LinkedIn or Bayt?',
    a: 'We focus exclusively on UAE IT and technology hiring. Cleaner roles, less noise, faster shortlists — and a LinkedIn job import for HR.',
  },
  {
    q: 'Where are roles based?',
    a: 'Dubai, Abu Dhabi, Sharjah, and remote-UAE roles. We also surface relocation packages clearly.',
  },
]

export default function Landing() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ totalJobs: 0, companies: 0, countriesRepresented: 0 })
  const [featured, setFeatured] = useState<Job[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    jobsApi.stats().then(({ data }) => setStats(data)).catch(() => undefined)
    jobsApi
      .list({ page: 0, size: 6 })
      .then(({ data }) => setFeatured(data.content))
      .catch(() => undefined)
  }, [])

  const handleHeroSearch = (event: FormEvent) => {
    event.preventDefault()
    navigate(search.trim() ? `/jobs?q=${encodeURIComponent(search.trim())}` : '/jobs')
  }

  return (
    <div>
      {/* ───── Hero ────────────────────────────────────────────────── */}
      <section className="hero-stage relative px-4 pb-32 pt-20 text-white sm:px-6 lg:px-8 lg:pt-28">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div className="animate-fade-in-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-teal-200 backdrop-blur">
                <Sparkles size={14} /> UAE tech hiring · launching 2026
              </span>
              <h1 className="mt-7 text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
                Where UAE's <span className="gradient-text">tech talent</span> meets opportunity.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                Software, cloud, data, cybersecurity, product, and IT roles across Dubai, Abu Dhabi,
                Sharjah — curated, verified, and hireable in days, not months.
              </p>

              {/* Hero search */}
              <form
                onSubmit={handleHeroSearch}
                className="mt-9 flex max-w-2xl flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-md sm:flex-row sm:items-center"
              >
                <div className="flex flex-1 items-center gap-3 px-3">
                  <Search size={18} className="shrink-0 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by role, skill, or company"
                    className="w-full bg-transparent py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="!min-h-11 bg-teal-500 !text-slate-950 hover:bg-teal-400"
                >
                  Search
                </Button>
              </form>

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400">
                <span>Popular:</span>
                {['Java Developer', 'AWS DevOps', 'Data Engineer', 'Product Manager'].map((q) => (
                  <Link
                    key={q}
                    to={`/jobs?q=${encodeURIComponent(q)}`}
                    className="rounded-full border border-white/10 px-3 py-1 transition hover:border-teal-300/40 hover:bg-white/5 hover:text-white"
                  >
                    {q}
                  </Link>
                ))}
              </div>

              <div className="mt-10 flex items-center gap-3">
                <Link to="/register">
                  <Button size="lg" className="bg-white !text-slate-950 hover:bg-slate-100">
                    Create free account <ArrowRight size={18} />
                  </Button>
                </Link>
                <Link to="/register?type=hr">
                  <Button
                    size="lg"
                    variant="ghost"
                    className="border border-white/15 !text-white hover:bg-white/5"
                  >
                    I'm hiring
                  </Button>
                </Link>
              </div>
            </div>

            {/* Hero floating preview card */}
            <div className="relative hidden lg:block">
              <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-teal-500/20 via-transparent to-indigo-500/10 blur-2xl" aria-hidden="true" />
              <div className="relative rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl backdrop-blur">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300">
                    <Building2 size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">Senior Java Engineer</p>
                    <p className="truncate text-xs text-slate-400">Etisalat · Dubai · Full-time</p>
                  </div>
                  <span className="chip chip-dark">Featured</span>
                </div>
                <div className="grid grid-cols-2 gap-3 py-5 text-xs text-slate-300">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Salary</p>
                    <p className="mt-1 font-semibold text-white">AED 28–38k</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Experience</p>
                    <p className="mt-1 font-semibold text-white">5+ years</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Skills</p>
                    <p className="mt-1 font-semibold text-white">Java, Spring, AWS</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Status</p>
                    <p className="mt-1 flex items-center gap-1.5 font-semibold text-teal-300">
                      <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-teal-300" />
                      Hiring now
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 rounded-lg bg-teal-500 py-2 text-xs font-semibold text-slate-950 transition hover:bg-teal-400">
                    Apply in one click
                  </button>
                  <button className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10">
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ───── Stats strip ─────────────────────────────────────────── */}
      <Container className="-mt-20 pb-16">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat
            icon={<BriefcaseBusiness size={22} />}
            label="Active roles"
            value={stats.totalJobs ? `${stats.totalJobs.toLocaleString()}+` : '20+'}
          />
          <Stat
            icon={<Building2 size={22} />}
            label="Hiring companies"
            value={stats.companies ? `${stats.companies.toLocaleString()}+` : '10+'}
          />
          <Stat
            icon={<Globe2 size={22} />}
            label="Candidate reach"
            value={stats.countriesRepresented ? `${stats.countriesRepresented}+` : '40+'}
          />
        </div>
      </Container>

      {/* ───── Trust marquee ───────────────────────────────────────── */}
      <Section className="!py-12">
        <Container>
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Trusted by UAE technology teams hiring across the region
          </p>
          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#f7f8fa] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#f7f8fa] to-transparent" />
            <div className="flex w-max animate-marquee gap-12">
              {[...TRUST_LOGOS, ...TRUST_LOGOS].map((logo, i) => (
                <span
                  key={`${logo}-${i}`}
                  className="logo-mute whitespace-nowrap text-lg font-black tracking-[0.18em] text-slate-700"
                >
                  {logo}
                </span>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      {/* ───── Categories ──────────────────────────────────────────── */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Explore"
            title="Roles built for the UAE tech ecosystem"
            description="From product engineers in DIFC to security analysts in Yas Island — find your specialty."
            action={
              <Link
                to="/jobs"
                className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800"
              >
                Browse all roles <ArrowRight size={14} />
              </Link>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map(({ icon: Icon, label, count, query }) => (
              <Link
                key={label}
                to={`/jobs?q=${encodeURIComponent(query)}`}
                className="card-glow group flex items-start gap-4 p-6"
              >
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-100 transition group-hover:bg-teal-100">
                  <Icon size={22} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold tracking-tight text-slate-950 transition group-hover:text-teal-800">
                    {label}
                  </p>
                  <p className="mt-1 truncate text-sm text-slate-500">{count}</p>
                </div>
                <ArrowRight
                  size={18}
                  className="mt-1 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-teal-700"
                />
              </Link>
            ))}
          </div>
        </Container>
      </Section>

      {/* ───── How it works ────────────────────────────────────────── */}
      <Section className="bg-white">
        <Container>
          <SectionHeading
            eyebrow="How it works"
            title="Two workspaces. One platform."
            description="Built ground-up for candidates and recruiters in the UAE — not adapted from a generic job board."
            align="center"
          />

          <div className="grid gap-10 lg:grid-cols-2">
            {/* Job seeker */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-8 shadow-sm">
              <p className="eyebrow">For job seekers</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Land your next UAE role
              </h3>
              <ol className="mt-6 grid gap-5">
                {HOW_IT_WORKS_SEEKER.map(({ icon: Icon, title, body }, index) => (
                  <li key={title} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm ring-1 ring-slate-200">
                      <Icon size={18} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        <span className="mr-2 text-xs font-bold text-teal-700">0{index + 1}</span>
                        {title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Link to="/register" className="mt-7 inline-block">
                <Button variant="accent">
                  Create job seeker account <ArrowRight size={16} />
                </Button>
              </Link>
            </div>

            {/* HR */}
            <div className="rounded-3xl border border-slate-900/10 bg-slate-950 p-8 text-white shadow-lg">
              <p className="eyebrow eyebrow-dark">For HR &amp; recruiters</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                Hire UAE talent, 10× faster
              </h3>
              <ol className="mt-6 grid gap-5">
                {HOW_IT_WORKS_HR.map(({ icon: Icon, title, body }, index) => (
                  <li key={title} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-teal-300 ring-1 ring-inset ring-white/10">
                      <Icon size={18} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">
                        <span className="mr-2 text-xs font-bold text-teal-300">0{index + 1}</span>
                        {title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Link to="/register?type=hr" className="mt-7 inline-block">
                <Button className="bg-white !text-slate-950 hover:bg-slate-100">
                  Start hiring <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </Section>

      {/* ───── Featured jobs ───────────────────────────────────────── */}
      {featured.length > 0 ? (
        <Section>
          <Container>
            <SectionHeading
              eyebrow="Latest"
              title="Open roles right now"
              description="Refreshed continuously across UAE's leading technology employers."
              action={
                <Link
                  to="/jobs"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800"
                >
                  See all jobs <ArrowRight size={14} />
                </Link>
              }
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {featured.map((job) => (
                <Link
                  key={job.id}
                  to={`/jobs/${job.id}`}
                  className="card-glow group flex flex-col gap-3 p-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200">
                      <Building2 size={18} />
                    </div>
                    <p className="line-clamp-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {job.companyName}
                    </p>
                  </div>
                  <h3 className="line-clamp-2 text-lg font-semibold leading-snug tracking-tight text-slate-950 group-hover:text-teal-800">
                    {job.title}
                  </h3>
                  <p className="line-clamp-2 text-sm leading-6 text-slate-600">{job.description}</p>
                  <div className="mt-auto flex items-center justify-between gap-3 pt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin size={14} /> {job.locationUae || 'UAE'}
                    </span>
                    {job.jobType ? (
                      <span className="chip">{job.jobType.replace('_', ' ')}</span>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      {/* ───── Why uaeitjobs ───────────────────────────────────────── */}
      <Section className="bg-white">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <p className="eyebrow">Why uaeitjobs</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Built for serious tech hiring in the UAE.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Generic job boards bury IT roles under retail and admin. We don't. uaeitjobs is
                exclusively technology — and exclusively the UAE.
              </p>
              <div className="mt-8 grid gap-4">
                {[
                  'Verified UAE-based employers only — no spam reposts',
                  'LinkedIn job import — paste a URL, post in seconds',
                  'Real-time skill autocomplete and salary intelligence',
                  'Separate dashboards built for candidates and HR teams',
                  'Plain-English, mobile-first — works on the worst Wi-Fi',
                ].map((point) => (
                  <div key={point} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
                    <p className="text-sm font-medium text-slate-700">{point}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-teal-400/15 via-transparent to-slate-900/5 blur-2xl" />
              <div className="surface-panel relative grid gap-5 p-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Time to first interview
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                      4.8 days
                    </p>
                    <p className="mt-1 text-xs text-teal-700">▲ 2.3× faster than peers</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Verified employer rate
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">100%</p>
                    <p className="mt-1 text-xs text-teal-700">Manual review</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <span>Application funnel</span>
                    <span className="text-teal-700">Last 30 days</span>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {[
                      { label: 'Profile viewed', pct: 92 },
                      { label: 'Shortlisted', pct: 68 },
                      { label: 'Interviewed', pct: 41 },
                      { label: 'Offered', pct: 18 },
                    ].map(({ label, pct }) => (
                      <div key={label} className="grid gap-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-700">{label}</span>
                          <span className="font-semibold text-slate-500">{pct}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* ───── FAQ ─────────────────────────────────────────────────── */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="FAQ"
            title="Questions, answered."
            align="center"
          />
          <div className="mx-auto grid max-w-3xl gap-3">
            {FAQ.map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition open:shadow-md"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-slate-950">
                  {q}
                  <ChevronDown
                    size={18}
                    className="shrink-0 text-slate-400 transition group-open:rotate-180 group-open:text-teal-700"
                  />
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-600">{a}</p>
              </details>
            ))}
          </div>
        </Container>
      </Section>

      {/* ───── Final CTA ───────────────────────────────────────────── */}
      <Section>
        <Container>
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 px-8 py-16 text-white shadow-2xl sm:px-14">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              aria-hidden="true"
              style={{
                background:
                  'radial-gradient(600px 300px at 85% 30%, rgba(20,184,166,0.4), transparent 60%), radial-gradient(500px 250px at 15% 80%, rgba(99,102,241,0.25), transparent 60%)',
              }}
            />
            <div className="relative grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <p className="eyebrow eyebrow-dark">Get started</p>
                <h2 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
                  Your next role — or your next hire — is one click away.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                  Join uaeitjobs free. Create a profile in 60 seconds, save jobs you love, and apply
                  the moment something fits.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Link to="/register">
                  <Button size="lg" className="bg-white !text-slate-950 hover:bg-slate-100">
                    Create free account <ArrowRight size={18} />
                  </Button>
                </Link>
                <Link to="/jobs">
                  <Button
                    size="lg"
                    variant="ghost"
                    className="border border-white/20 !text-white hover:bg-white/10"
                  >
                    Browse jobs
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  )
}
