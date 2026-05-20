import {
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  ExternalLink,
  MapPin,
  Search,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CompanyLogo } from '../../components/CompanyLogo'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { errorMessage, jobsApi, seekerApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../components/Toast'
import type { Job } from '../../types'
import { labelize, money, parseSkills, relativeTime } from '../../utils/format'

const EMIRATES = [
  { value: 'dubai', label: 'Dubai' },
  { value: 'abu_dhabi', label: 'Abu Dhabi' },
  { value: 'sharjah', label: 'Sharjah' },
  { value: 'ajman', label: 'Ajman' },
  { value: 'ras_al_khaimah', label: 'Ras Al Khaimah' },
  { value: 'remote', label: 'Remote (UAE)' },
]

const SPECIALIZATIONS = [
  { value: 'backend', label: 'Backend Eng.' },
  { value: 'frontend', label: 'Frontend Eng.' },
  { value: 'fullstack', label: 'Full-stack' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'devops', label: 'Cloud & DevOps' },
  { value: 'data_ml', label: 'Data & AI' },
  { value: 'security', label: 'Cybersecurity' },
  { value: 'qa', label: 'QA & Testing' },
]

export default function JobBrowse() {
  useDocumentMeta({ title: 'Browse UAE IT roles', description: 'UAE IT and technology jobs — filter by stack, emirate, visa and more.' })

  const { user } = useAuthStore()
  const toast = useToastStore((s) => s.add)

  // ── Applied filters ───────────────────────────────────────────
  const [query, setQuery]           = useState('')
  const [emirates, setEmirates]     = useState<Set<string>>(new Set())
  const [categories, setCategories] = useState<Set<string>>(new Set())
  const [visaOnly, setVisaOnly]     = useState(false)
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [immediate, setImmediate]   = useState(false)

  // ── Staged (panel) filters ────────────────────────────────────
  const [dEmirates, setDEmirates]     = useState<Set<string>>(new Set())
  const [dCategories, setDCategories] = useState<Set<string>>(new Set())
  const [dVisa, setDVisa]             = useState(false)
  const [dRemote, setDRemote]         = useState(false)
  const [dImmediate, setDImmediate]   = useState(false)

  // ── Jobs ──────────────────────────────────────────────────────
  const [jobs, setJobs]       = useState<Job[]>([])
  const [total, setTotal]     = useState(0)
  const [jobsLoading, setJobsLoading] = useState(true)

  // ── Detail ────────────────────────────────────────────────────
  const [selectedId, setSelectedId]   = useState<number | null>(null)
  const [detail, setDetail]           = useState<Job | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const detailRef = useRef<HTMLDivElement>(null)

  // ── Fetch jobs ────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true
    setJobsLoading(true)
    const emirateVal = Array.from(emirates)[0] ?? undefined
    const categoryVal = Array.from(categories)[0] ?? undefined
    const req = query
      ? jobsApi.search(query, 0, 40)
      : jobsApi.filter({
          emirate: emirateVal,
          category: categoryVal,
          visaType: visaOnly ? 'employment_visa' : undefined,
          remoteUae: remoteOnly ? true : undefined,
          immediateJoiner: immediate ? true : undefined,
          page: 0,
          size: 40,
        })
    req
      .then(({ data }) => { if (mounted) { setJobs(data.content); setTotal(data.totalElements) } })
      .catch(() => {})
      .finally(() => { if (mounted) setJobsLoading(false) })
    return () => { mounted = false }
  }, [query, emirates, categories, visaOnly, remoteOnly, immediate])

  // ── Fetch detail on select ────────────────────────────────────
  useEffect(() => {
    if (!selectedId) return
    setDetailLoading(true)
    jobsApi.detail(String(selectedId))
      .then(({ data }) => { setDetail(data); detailRef.current?.scrollTo(0, 0) })
      .catch(() => {})
      .finally(() => setDetailLoading(false))
  }, [selectedId])

  function applyFilters() {
    setEmirates(new Set(dEmirates))
    setCategories(new Set(dCategories))
    setVisaOnly(dVisa)
    setRemoteOnly(dRemote)
    setImmediate(dImmediate)
  }

  function clearFilters() {
    const empty = new Set<string>()
    setDEmirates(empty); setDCategories(empty); setDVisa(false); setDRemote(false); setDImmediate(false)
    setEmirates(empty); setCategories(empty); setVisaOnly(false); setRemoteOnly(false); setImmediate(false)
    setQuery('')
  }

  function toggle(set: Set<string>, value: string): Set<string> {
    const next = new Set(set)
    next.has(value) ? next.delete(value) : next.add(value)
    return next
  }

  async function saveJob(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (!user) { toast({ type: 'info', title: 'Sign in to save jobs' }); return }
    try { await seekerApi.saveJob(id); toast({ type: 'success', title: 'Saved' }) }
    catch (err) { toast({ type: 'error', title: 'Could not save', message: errorMessage(err) }) }
  }

  const activeCount = dEmirates.size + dCategories.size + (dVisa ? 1 : 0) + (dRemote ? 1 : 0) + (dImmediate ? 1 : 0)

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="flex overflow-hidden bg-white" style={{ height: 'calc(100vh - 65px)' }}>

      {/* ── Panel 1: Filters ──────────────────────────────────── */}
      <aside className="hidden lg:flex w-[220px] xl:w-[240px] h-full flex-col border-r border-[#E5E7EB] bg-[#FAFAFA] shrink-0">
        <div className="px-4 py-3 border-b border-[#E5E7EB] bg-white">
          <h2 className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase text-black">Parameters</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Role, skill, company…"
              className="w-full border border-[#E5E7EB] bg-white pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-[#2563EB]"
            />
            {query ? (
              <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black">
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </div>

          {/* Emirate */}
          <div>
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] mb-3 text-black">Emirate</h3>
            <div className="space-y-2.5">
              {EMIRATES.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2.5 cursor-pointer text-xs text-gray-600 hover:text-black font-mono">
                  <input
                    type="checkbox"
                    checked={dEmirates.has(value)}
                    onChange={() => setDEmirates(toggle(dEmirates, value))}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Specialization */}
          <div>
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] mb-3 text-black">Specialization</h3>
            <div className="space-y-2.5">
              {SPECIALIZATIONS.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2.5 cursor-pointer text-xs text-gray-600 hover:text-black font-mono">
                  <input
                    type="checkbox"
                    checked={dCategories.has(value)}
                    onChange={() => setDCategories(toggle(dCategories, value))}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Requirements */}
          <div>
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] mb-3 text-black">Requirements</h3>
            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-gray-600 hover:text-black font-mono">
                <input type="checkbox" checked={dVisa} onChange={(e) => setDVisa(e.target.checked)} />
                Visa Provided
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-gray-600 hover:text-black font-mono">
                <input type="checkbox" checked={dRemote} onChange={(e) => setDRemote(e.target.checked)} />
                Remote (UAE)
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-gray-600 hover:text-black font-mono">
                <input type="checkbox" checked={dImmediate} onChange={(e) => setDImmediate(e.target.checked)} />
                Immediate Joiner
              </label>
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-[#E5E7EB] bg-white grid grid-cols-2 gap-2">
          <button onClick={clearFilters} className="border border-[#E5E7EB] py-2 font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors">
            Clear
          </button>
          <button onClick={applyFilters} className="bg-black text-white font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-gray-900 transition-colors py-2">
            Apply{activeCount > 0 ? ` (${activeCount})` : ''}
          </button>
        </div>
      </aside>

      {/* ── Panel 2: Job List ─────────────────────────────────── */}
      <aside className="w-full lg:w-[300px] xl:w-[340px] h-full flex flex-col border-r border-[#E5E7EB] shrink-0 bg-white">
        <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-black">
            {jobsLoading ? '…' : `${total.toLocaleString()} Results`}
          </span>
          <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">UAE IT</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {jobsLoading ? (
            <div className="p-4 space-y-px">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="p-4 space-y-2">
                  <div className="h-2.5 w-24 shimmer" />
                  <div className="h-3.5 w-3/4 shimmer" />
                  <div className="h-2.5 w-1/2 shimmer" />
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center font-mono text-xs text-gray-400">
              No results.<br />
              <button onClick={clearFilters} className="mt-2 text-[#2563EB] hover:underline">Clear filters</button>
            </div>
          ) : (
            jobs.map((job) => {
              const active = job.id === selectedId
              const sal = money(job.salaryMin, job.salaryMax, job.salaryCurrency)
              const skills = parseSkills(job.skills).slice(0, 3)
              return (
                <button
                  key={job.id}
                  onClick={() => setSelectedId(job.id)}
                  className={`w-full text-left p-4 border-b border-[#E5E7EB] transition-colors ${
                    active
                      ? 'bg-blue-50/60 border-l-[3px] border-l-[#2563EB]'
                      : 'hover:bg-[#FAFAFA] border-l-[3px] border-l-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <CompanyLogo logoUrl={job.companyLogoUrl} companyName={job.companyName} size="sm" className="shrink-0" />
                      <span className={`font-mono text-[10px] uppercase tracking-widest font-bold truncate ${active ? 'text-[#2563EB]' : 'text-gray-400'}`}>
                        {job.companyName}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-gray-400 shrink-0 ml-2">{relativeTime(job.createdAt)}</span>
                  </div>
                  <div className={`font-bold text-sm mb-2 leading-snug ${active ? 'text-black' : 'text-black'}`}>
                    {job.title}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-gray-500 truncate">
                      {skills.length ? skills.join(', ') : (job.locationUae || 'UAE')}
                    </span>
                    {sal ? (
                      <span className={`font-mono text-[11px] font-bold shrink-0 ml-2 ${active ? 'text-[#2563EB]' : 'text-black'}`}>
                        {sal}
                      </span>
                    ) : null}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </aside>

      {/* ── Panel 3: Detail ───────────────────────────────────── */}
      <main ref={detailRef} className="hidden lg:block flex-1 h-full overflow-y-auto bg-white">
        {!selectedId ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-10">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-300 mb-3">No role selected</div>
            <p className="text-sm text-gray-400">Select a role from the list to view details.</p>
          </div>
        ) : detailLoading ? (
          <div className="p-10 space-y-4">
            <div className="h-3 w-32 shimmer" />
            <div className="h-8 w-3/4 shimmer" />
            <div className="h-3 w-1/2 shimmer" />
            <div className="h-24 shimmer mt-6" />
          </div>
        ) : detail ? (
          <DetailPanel job={detail} onSave={saveJob} />
        ) : null}
      </main>
    </div>
  )
}

/* ── Inline detail panel ──────────────────────────────────────── */
function DetailPanel({ job, onSave }: { job: Job; onSave: (id: number, e: React.MouseEvent) => void }) {
  const skills = parseSkills(job.skills)
  const salary = money(job.salaryMin, job.salaryMax, job.salaryCurrency)
  const applyUrl = job.applyUrl || job.linkedinUrl
    || `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(job.title + ' ' + job.companyName)}&location=United%20Arab%20Emirates`

  // Split skills roughly in half for the 2-col stack grid
  const half = Math.ceil(skills.length / 2)
  const col1 = skills.slice(0, half)
  const col2 = skills.slice(half)

  return (
    <div className="p-8 xl:p-10 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CompanyLogo logoUrl={job.companyLogoUrl} companyName={job.companyName} size="sm" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#2563EB]">
              {job.companyName}
              {job.locationUae ? ` · ${job.locationUae}` : ''}
              {job.remoteUae ? ' · Remote' : ''}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-black leading-tight">
            {job.title}
            {job.experienceLevel ? (
              <span className="block text-xl font-normal text-gray-400 mt-1">{labelize(job.experienceLevel)}</span>
            ) : null}
          </h1>
        </div>
        <div className="flex gap-2 shrink-0 mt-1">
          <a
            href={applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#2563EB] text-white font-sans text-sm font-bold px-5 py-2.5 hover:bg-[#1d4ed8] transition-colors shadow-sm"
          >
            <ExternalLink size={14} /> Apply Now
          </a>
          <button
            onClick={(e) => onSave(job.id, e)}
            className="border border-[#E5E7EB] p-2.5 hover:bg-gray-50 transition-colors"
            aria-label="Save job"
          >
            <Bookmark size={16} />
          </button>
        </div>
      </div>

      {/* Pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {salary ? <Pill>{salary}</Pill> : null}
        {job.jobType ? <Pill>{labelize(job.jobType)}</Pill> : null}
        {job.visaType === 'free_visa' || job.visaType === 'employment_visa' ? <Pill accent>Visa Provided</Pill> : null}
        {job.visaType === 'own_visa' ? <Pill>Own Visa Required</Pill> : null}
        {job.visaType === 'visit_visa_accepted' ? <Pill>Visit Visa OK</Pill> : null}
        {job.immediateJoiner ? <Pill accent><Zap size={10} /> Immediate Joiner</Pill> : null}
        {job.remoteUae ? <Pill>Remote UAE</Pill> : null}
      </div>

      {/* Stack grid */}
      {skills.length > 0 ? (
        <>
          <SectionLabel>Core Stack</SectionLabel>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {col1.length > 0 ? (
              <div className="border border-[#E5E7EB] p-4 bg-[#FAFAFA]">
                <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-gray-400 mb-2">Required</span>
                <span className="font-mono text-sm font-semibold text-black">{col1.join(', ')}</span>
              </div>
            ) : null}
            {col2.length > 0 ? (
              <div className="border border-[#E5E7EB] p-4 bg-[#FAFAFA]">
                <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-gray-400 mb-2">Additional</span>
                <span className="font-mono text-sm font-semibold text-black">{col2.join(', ')}</span>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {/* Description */}
      <JobDescription job={job} />

      {/* Footer */}
      <div className="mt-10 pt-6 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-gray-400 font-mono">
        <div className="flex items-center gap-4">
          {job.createdAt ? (
            <span className="flex items-center gap-1.5">
              <CalendarDays size={12} /> {relativeTime(job.createdAt)}
            </span>
          ) : null}
          {job.locationUae ? (
            <span className="flex items-center gap-1.5">
              <MapPin size={12} /> {job.locationUae}
            </span>
          ) : null}
          {job.jobType ? (
            <span className="flex items-center gap-1.5">
              <BriefcaseBusiness size={12} /> {labelize(job.jobType)}
            </span>
          ) : null}
        </div>
        <Link
          to={`/jobs?q=${encodeURIComponent(job.companyName ?? '')}`}
          className="text-[#2563EB] hover:underline"
        >
          More from {job.companyName} →
        </Link>
      </div>
    </div>
  )
}

function Pill({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 border px-3 py-1.5 font-mono text-xs font-semibold ${accent ? 'bg-blue-50 border-blue-200 text-[#2563EB]' : 'bg-[#F3F4F6] border-[#E5E7EB] text-black'}`}>
      {children}
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-black mb-3 pb-2 border-b border-[#E5E7EB]">
      {children}
    </h2>
  )
}

function JobDescription({ job }: { job: Job }) {
  if (job.descriptionHtml?.trim()) {
    return (
      <>
        <SectionLabel>About the Role</SectionLabel>
        <div className="prose-job" dangerouslySetInnerHTML={{ __html: job.descriptionHtml }} />
      </>
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
      <div className="space-y-8">
        {sections.map((s) => (
          <div key={s.heading}>
            <SectionLabel>{s.heading}</SectionLabel>
            {s.items.length === 1 ? (
              <p className="prose-job">{s.items[0]}</p>
            ) : (
              <ul className="space-y-3">
                {s.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
                    <span className="font-mono text-[#2563EB] font-bold mt-0.5 shrink-0">→</span>
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
    <div className="space-y-8">
      <div>
        <SectionLabel>About the Role</SectionLabel>
        <p className="prose-job">{job.description}</p>
      </div>
      {job.requirements ? (
        <div>
          <SectionLabel>Requirements</SectionLabel>
          <p className="prose-job">{job.requirements}</p>
        </div>
      ) : null}
    </div>
  )
}
