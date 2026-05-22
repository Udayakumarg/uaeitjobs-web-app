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
import { CompanyLogo } from '../components/CompanyLogo'
import { Button, Container } from '../components/ui'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import type { Job } from '../types'
import { money, parseSkills } from '../utils/format'

// ── Design tokens (matches Jobs page exactly) ─────────────────────────────────
const PINK      = '#BE185D'
const PINK_HOV  = '#9D174D'
const PINK_BG   = '#FDF2F8'
const PINK_RING = '#FBCFE8'

// ── Static data ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  { icon: Code2,       label: 'Software Engineering', sub: 'Java · Node · Python · Go',  query: 'engineer'       },
  { icon: Cloud,       label: 'Cloud & DevOps',       sub: 'AWS · Azure · Kubernetes',   query: 'cloud'          },
  { icon: Database,    label: 'Data & AI',             sub: 'ML · Analytics · BI',        query: 'data'           },
  { icon: Shield,      label: 'Cybersecurity',         sub: 'SOC · GRC · AppSec',         query: 'security'       },
  { icon: LayoutGrid,  label: 'Product & Design',      sub: 'PM · UX · UI',               query: 'product'        },
  { icon: BarChart3,   label: 'IT & Infrastructure',   sub: 'SysAdmin · Networks',        query: 'infrastructure' },
]

const HOW_IT_WORKS_SEEKER = [
  { icon: Users2,    title: 'Build a verified profile', body: 'Upload your CV, auto-parse skills, and let recruiters discover you directly.' },
  { icon: Zap,       title: 'Apply in one click',       body: 'Tailored cover letters, saved roles, and instant alerts when matching jobs go live.' },
  { icon: LineChart, title: 'Track every step',         body: 'See application status, recruiter views, and shortlist progress from one dashboard.' },
]

const HOW_IT_WORKS_HR = [
  { icon: Building2,   title: 'Post or import jobs',    body: 'Write once, or paste a LinkedIn URL — our parser extracts everything in seconds.' },
  { icon: TrendingUp,  title: 'Reach UAE-ready talent', body: 'Filter by skill, level, and location. Stop wasting time on irrelevant inbound.' },
  { icon: Award,       title: 'Hire faster, smarter',   body: 'Score applicants, shortlist, and track pipeline progress with a single workspace.' },
]

const FAQ = [
  { q: 'Is uaeitjobs free for job seekers?',           a: 'Yes — creating an account, applying to roles, and saving jobs are all completely free for candidates.' },
  { q: 'Are employers verified?',                       a: 'Every HR account is verified before they can post jobs. We confirm the company exists and the recruiter is authorised.' },
  { q: 'How is uaeitjobs different from LinkedIn or Bayt?', a: 'We focus exclusively on UAE IT and technology hiring. Cleaner roles, less noise, faster shortlists — and a LinkedIn job import for HR.' },
  { q: 'Where are roles based?',                        a: 'Dubai, Abu Dhabi, Sharjah, and remote-UAE roles. We also surface relocation packages clearly.' },
]

const POPULAR = ['Java Developer', 'AWS DevOps', 'Data Engineer', 'Product Manager']

// ── Component ─────────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ totalJobs: 0, companies: 0, countriesRepresented: 0 })
  const [featured, setFeatured] = useState<Job[]>([])
  const [search, setSearch] = useState('')

  useDocumentMeta({
    title: 'UAEITJOBS — Tech & IT jobs in Dubai, Abu Dhabi, Sharjah',
    raw: true,
    description:
      'UAE-focused IT and technology hiring. Verified employers, curated software, DevOps, data, security, QA and product roles. Filter by visa, emirate, immediate joiner and remote-UAE.',
    canonical: 'https://www.uaeitjobs.com/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'UAEITJOBS',
      url: 'https://www.uaeitjobs.com',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://www.uaeitjobs.com/jobs?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
  })

  useEffect(() => {
    jobsApi.stats().then(({ data }) => setStats(data)).catch(() => undefined)
    jobsApi.list({ page: 0, size: 6 }).then(({ data }) => setFeatured(data.content)).catch(() => undefined)
  }, [])

  const handleHeroSearch = (event: FormEvent) => {
    event.preventDefault()
    navigate(search.trim() ? `/jobs?q=${encodeURIComponent(search.trim())}` : '/jobs')
  }

  return (
    <div className="bg-white">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="hero-stage relative px-4 pb-28 pt-20 text-white sm:px-6 lg:px-8 lg:pt-28">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div className="animate-fade-in-up">

              {/* Eyebrow — mono style matches Jobs page labels */}
              <span className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300 backdrop-blur">
                <Sparkles size={12} /> UAE tech hiring · 2026
              </span>

              <h1 className="mt-6 text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
                Where UAE's <span className="gradient-text">tech talent</span>{' '}
                meets opportunity.
              </h1>

              <p className="mt-5 max-w-2xl text-[15px] leading-7 text-slate-300 sm:text-base sm:leading-8">
                Software, cloud, data, cybersecurity, product, and IT roles across Dubai,
                Abu Dhabi, Sharjah — curated, verified, and hireable in days.
              </p>

              {/* Search */}
              <form
                onSubmit={handleHeroSearch}
                className="mt-8 flex max-w-xl flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-md sm:flex-row sm:items-center"
              >
                <div className="flex flex-1 items-center gap-3 px-3">
                  <Search size={16} className="shrink-0 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by role, skill, or company"
                    className="w-full bg-transparent py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="shrink-0 rounded-lg px-5 py-2.5 font-sans text-sm font-bold text-white transition"
                  style={{ background: PINK }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = PINK_HOV)}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = PINK)}
                >
                  Search
                </button>
              </form>

              {/* Popular searches */}
              <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 font-mono text-[10px] text-slate-400">
                <span className="uppercase tracking-[0.14em]">Popular:</span>
                {POPULAR.map((q) => (
                  <Link
                    key={q}
                    to={`/jobs?q=${encodeURIComponent(q)}`}
                    className="rounded border border-white/10 px-2.5 py-1 transition hover:border-white/30 hover:text-white"
                  >
                    {q}
                  </Link>
                ))}
              </div>

              {/* CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/register">
                  <Button size="lg" className="bg-white !text-slate-950 hover:bg-slate-100">
                    Create free account <ArrowRight size={16} />
                  </Button>
                </Link>
                <Link to="/register?type=hr">
                  <Button size="lg" variant="ghost" className="border border-white/15 !text-white hover:bg-white/5">
                    I'm hiring
                  </Button>
                </Link>
              </div>
            </div>

            {/* Hero preview card */}
            <div className="relative hidden lg:block">
              <div
                className="pointer-events-none absolute -inset-6 rounded-3xl blur-2xl"
                style={{ background: `radial-gradient(ellipse at 50% 50%, ${PINK}22 0%, transparent 70%)` }}
                aria-hidden="true"
              />
              <div className="relative rounded-xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl backdrop-blur">

                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white">
                    <Building2 size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">Senior Java Engineer</p>
                    <p className="font-mono text-[10px] text-slate-400">Etisalat · Dubai · Full-time</p>
                  </div>
                  <span
                    className="font-mono text-[9px] font-bold uppercase tracking-wider rounded px-2 py-1"
                    style={{ background: PINK_BG, color: PINK, border: `1px solid ${PINK_RING}` }}
                  >
                    Featured
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 py-4 text-xs">
                  {[
                    ['Salary', 'AED 28–38k'],
                    ['Experience', '5+ years'],
                    ['Skills', 'Java, Spring, AWS'],
                    ['Status', 'Hiring now'],
                  ].map(([label, val]) => (
                    <div key={label} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400">{label}</p>
                      <p
                        className="mt-1 font-mono text-[11px] font-bold"
                        style={{ color: val === 'Hiring now' ? PINK : '#fff' }}
                      >
                        {val === 'Hiring now' ? (
                          <span className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full" style={{ background: PINK }} />
                            {val}
                          </span>
                        ) : val}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    className="flex-1 rounded-lg py-2 font-sans text-xs font-bold text-white transition"
                    style={{ background: PINK }}
                    onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = PINK_HOV)}
                    onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = PINK)}
                  >
                    Apply in one click
                  </button>
                  <button className="rounded-lg border border-white/15 px-3 py-2 font-sans text-xs font-bold text-white transition hover:bg-white/10">
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Stats strip ───────────────────────────────────────────────────── */}
      <Container className="-mt-16 pb-16">
        <div className="grid gap-px rounded-xl border border-[#E5E7EB] bg-[#E5E7EB] shadow-sm overflow-hidden sm:grid-cols-3">
          {[
            { icon: BriefcaseBusiness, label: 'Active roles',      value: stats.totalJobs          ? `${stats.totalJobs.toLocaleString()}+`          : '20+' },
            { icon: Building2,         label: 'Hiring companies',   value: stats.companies          ? `${stats.companies.toLocaleString()}+`          : '10+' },
            { icon: Globe2,            label: 'Candidate reach',    value: stats.countriesRepresented ? `${stats.countriesRepresented}+`              : '40+' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 bg-white px-6 py-5">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ background: PINK_BG, color: PINK }}
              >
                <Icon size={18} />
              </span>
              <div>
                <p className="font-mono text-xl font-bold text-black">{value}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>

      {/* ── Categories ────────────────────────────────────────────────────── */}
      <section className="border-t border-[#E5E7EB] bg-[#FAFAFA] px-4 py-16 sm:px-6">
        <Container>
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: PINK }}>Explore</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-black sm:text-3xl">
                Roles built for the UAE tech ecosystem
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                From product engineers in DIFC to security analysts in Yas Island.
              </p>
            </div>
            <Link
              to="/jobs"
              className="hidden shrink-0 items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider transition sm:flex"
              style={{ color: PINK }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = PINK_HOV)}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = PINK)}
            >
              Browse all <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map(({ icon: Icon, label, sub, query }) => (
              <Link
                key={label}
                to={`/jobs?q=${encodeURIComponent(query)}`}
                className="group flex items-center gap-4 rounded-lg border border-[#E5E7EB] bg-white p-5 transition-colors hover:border-[#FBCFE8]"
                style={{}}
                onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.borderColor = PINK_RING)}
                onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.borderColor = '#E5E7EB')}
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors"
                  style={{ background: PINK_BG, borderColor: PINK_RING, color: PINK }}
                >
                  <Icon size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-black">{label}</p>
                  <p className="font-mono text-[10px] text-gray-400">{sub}</p>
                </div>
                <ArrowRight
                  size={15}
                  className="shrink-0 text-gray-300 transition group-hover:translate-x-0.5"
                  style={{}}
                />
              </Link>
            ))}
          </div>

          <div className="mt-6 text-center sm:hidden">
            <Link
              to="/jobs"
              className="font-mono text-xs font-bold uppercase tracking-wider"
              style={{ color: PINK }}
            >
              Browse all roles →
            </Link>
          </div>
        </Container>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="border-t border-[#E5E7EB] px-4 py-16 sm:px-6">
        <Container>
          <div className="mb-10 text-center">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: PINK }}>How it works</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-black sm:text-3xl">Two workspaces. One platform.</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-gray-500">
              Built ground-up for candidates and recruiters in the UAE — not adapted from a generic job board.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">

            {/* Job seeker */}
            <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-7">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: PINK }}>For job seekers</p>
              <h3 className="mt-2 text-xl font-bold tracking-tight text-black">Land your next UAE role</h3>
              <ol className="mt-6 grid gap-5">
                {HOW_IT_WORKS_SEEKER.map(({ icon: Icon, title, body }, idx) => (
                  <li key={title} className="flex gap-4">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-white"
                      style={{ borderColor: PINK_RING, color: PINK }}
                    >
                      <Icon size={16} />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-black">
                        <span className="font-mono mr-2 text-[10px]" style={{ color: PINK }}>0{idx + 1}</span>
                        {title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-gray-500">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Link to="/register" className="mt-7 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-sans text-sm font-bold text-white transition"
                style={{ background: PINK }}
                onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = PINK_HOV)}
                onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = PINK)}
              >
                Create job seeker account <ArrowRight size={15} />
              </Link>
            </div>

            {/* HR */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-7 text-white">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">For HR &amp; recruiters</p>
              <h3 className="mt-2 text-xl font-bold tracking-tight">Hire UAE talent, 10× faster</h3>
              <ol className="mt-6 grid gap-5">
                {HOW_IT_WORKS_HR.map(({ icon: Icon, title, body }, idx) => (
                  <li key={title} className="flex gap-4">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
                      style={{ borderColor: PINK, background: PINK_BG + '10', color: PINK }}
                    >
                      <Icon size={16} />
                    </span>
                    <div>
                      <p className="text-sm font-bold">
                        <span className="font-mono mr-2 text-[10px]" style={{ color: PINK }}>0{idx + 1}</span>
                        {title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Link to="/register?type=hr" className="mt-7 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 font-sans text-sm font-bold text-black transition hover:bg-slate-100">
                Start hiring <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Featured jobs ─────────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="border-t border-[#E5E7EB] bg-[#FAFAFA] px-4 py-16 sm:px-6">
          <Container>
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: PINK }}>Latest</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-black sm:text-3xl">Open roles right now</h2>
                <p className="mt-1 text-sm text-gray-500">Refreshed continuously across UAE's leading technology employers.</p>
              </div>
              <Link
                to="/jobs"
                className="hidden shrink-0 items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider transition sm:flex"
                style={{ color: PINK }}
                onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = PINK_HOV)}
                onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = PINK)}
              >
                See all <ArrowRight size={13} />
              </Link>
            </div>

            {/* Jobs list — same item style as Jobs page list */}
            <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
              <div className="divide-y divide-[#E5E7EB]">
                {featured.map((job) => {
                  const sal = money(job.salaryMin, job.salaryMax, job.salaryCurrency)
                  const skills = parseSkills(job.skills).slice(0, 3)
                  return (
                    <Link
                      key={job.id}
                      to={`/jobs/${job.id}`}
                      className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#FAFAFA]"
                    >
                      <CompanyLogo logoUrl={job.companyLogoUrl} companyName={job.companyName} size="sm" className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-gray-400">{job.companyName}</span>
                        </div>
                        <p className="mt-0.5 text-sm font-bold text-black">{job.title}</p>
                        <p className="font-mono text-[10px] text-gray-400">
                          {skills.length ? skills.join(', ') : (job.locationUae ?? 'UAE')}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        {sal && <span className="font-mono text-[11px] font-bold text-black">{sal}</span>}
                        {job.locationUae && (
                          <span className="flex items-center gap-1 font-mono text-[10px] text-gray-400">
                            <MapPin size={9} /> {job.locationUae}
                          </span>
                        )}
                        {job.remoteUae && (
                          <span className="font-mono text-[9px] font-bold uppercase tracking-wider" style={{ color: PINK }}>Remote</span>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
              <div className="border-t border-[#E5E7EB] px-5 py-3.5">
                <Link
                  to="/jobs"
                  className="font-mono text-xs font-bold uppercase tracking-wider transition"
                  style={{ color: PINK }}
                  onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = PINK_HOV)}
                  onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = PINK)}
                >
                  View all open roles →
                </Link>
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* ── Why uaeitjobs ─────────────────────────────────────────────────── */}
      <section className="border-t border-[#E5E7EB] px-4 py-16 sm:px-6">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:items-center">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: PINK }}>Why uaeitjobs</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-black sm:text-3xl">
                Built for serious tech hiring in the UAE.
              </h2>
              <p className="mt-3 text-sm leading-7 text-gray-500">
                Generic job boards bury IT roles under retail and admin. We don't.
                uaeitjobs is exclusively technology — and exclusively the UAE.
              </p>
              <ul className="mt-7 grid gap-3">
                {[
                  'Verified UAE-based employers only — no spam reposts',
                  'LinkedIn job import — paste a URL, post in seconds',
                  'Real-time skill autocomplete and salary intelligence',
                  'Separate dashboards built for candidates and HR teams',
                  'Plain-English, mobile-first — works on the worst Wi-Fi',
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: PINK }} />
                    <span className="text-sm font-medium text-gray-700">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Stats panel */}
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Time to first interview', value: '4.8 days', sub: '2.3× faster than peers' },
                  { label: 'Verified employer rate',   value: '100%',     sub: 'Manual review'           },
                ].map(({ label, value, sub }) => (
                  <div key={label} className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-5">
                    <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-gray-400">{label}</p>
                    <p className="mt-2 font-mono text-2xl font-bold text-black">{value}</p>
                    <p className="mt-1 font-mono text-[10px] font-bold" style={{ color: PINK }}>▲ {sub}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-gray-400">Application funnel</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color: PINK }}>Last 30 days</span>
                </div>
                <div className="grid gap-3">
                  {[
                    { label: 'Profile viewed', pct: 92 },
                    { label: 'Shortlisted',    pct: 68 },
                    { label: 'Interviewed',    pct: 41 },
                    { label: 'Offered',        pct: 18 },
                  ].map(({ label, pct }) => (
                    <div key={label}>
                      <div className="mb-1 flex justify-between font-mono text-[10px]">
                        <span className="font-medium text-gray-600">{label}</span>
                        <span className="font-bold text-gray-500">{pct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#F3F4F6]">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: PINK }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="border-t border-[#E5E7EB] bg-[#FAFAFA] px-4 py-16 sm:px-6">
        <Container>
          <div className="mb-8 text-center">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: PINK }}>FAQ</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-black sm:text-3xl">Questions, answered.</h2>
          </div>
          <div className="mx-auto grid max-w-3xl gap-2">
            {FAQ.map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-lg border border-[#E5E7EB] bg-white p-5 transition open:border-[#FBCFE8]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-black">
                  {q}
                  <ChevronDown
                    size={16}
                    className="shrink-0 text-gray-400 transition group-open:rotate-180"
                    style={{ color: 'inherit' }}
                  />
                </summary>
                <p className="mt-3 text-sm leading-6 text-gray-500">{a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="border-t border-[#E5E7EB] px-4 py-16 sm:px-6">
        <Container>
          <div className="relative overflow-hidden rounded-xl bg-slate-950 px-8 py-14 text-white sm:px-12">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              aria-hidden="true"
              style={{
                background: `radial-gradient(600px 300px at 90% 30%, ${PINK}55, transparent 60%), radial-gradient(500px 250px at 10% 80%, rgba(99,102,241,0.2), transparent 60%)`,
              }}
            />
            <div className="relative grid items-center gap-10 lg:grid-cols-[1.5fr_1fr]">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Get started</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                  Your next role — or your next hire — is one click away.
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">
                  Join uaeitjobs free. Create a profile in 60 seconds, save jobs you love,
                  and apply the moment something fits.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 font-sans text-sm font-bold text-black transition hover:bg-slate-100"
                >
                  Create free account <ArrowRight size={16} />
                </Link>
                <Link
                  to="/jobs"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-3 font-sans text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Browse jobs
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

    </div>
  )
}
