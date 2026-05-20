import {
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
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
import { JOB_CATEGORIES } from '../../types'
import type { Emirate, Job, JobCategory, VisaType } from '../../types'
import { labelize, money, parseSkills, relativeTime } from '../../utils/format'

// ── Filter option lists ───────────────────────────────────────────────────────
const EMIRATES: { value: Emirate; label: string }[] = [
  { value: 'dubai',          label: 'Dubai' },
  { value: 'abu_dhabi',      label: 'Abu Dhabi' },
  { value: 'sharjah',        label: 'Sharjah' },
  { value: 'ajman',          label: 'Ajman' },
  { value: 'ras_al_khaimah', label: 'Ras Al Khaimah' },
  { value: 'fujairah',       label: 'Fujairah' },
  { value: 'umm_al_quwain',  label: 'Umm Al Quwain' },
]

const LEVELS: { value: string; label: string }[] = [
  { value: 'intern',  label: 'Intern'       },
  { value: 'junior',  label: 'Junior'       },
  { value: 'mid',     label: 'Mid-level'    },
  { value: 'senior',  label: 'Senior'       },
  { value: 'lead',    label: 'Lead / Staff' },
]

const JOB_TYPES: { value: string; label: string }[] = [
  { value: 'full_time',  label: 'Full-time'  },
  { value: 'part_time',  label: 'Part-time'  },
  { value: 'contract',   label: 'Contract'   },
  { value: 'internship', label: 'Internship' },
  { value: 'temporary',  label: 'Temporary'  },
]

const VISA_OPTIONS: { value: VisaType; label: string }[] = [
  { value: 'free_visa',           label: 'Free Visa'         },
  { value: 'employment_visa',     label: 'Employment Visa'   },
  { value: 'visit_visa_accepted', label: 'Visit Visa OK'     },
  { value: 'own_visa',            label: 'Own Visa Required' },
]

type PanelId = 'emirate' | 'stack' | 'level' | 'type' | 'visa'

function toggleSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set)
  next.has(value) ? next.delete(value) : next.add(value)
  return next
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function JobBrowse() {
  useDocumentMeta({
    title: 'Browse UAE IT roles',
    description: 'UAE IT and technology jobs — filter by stack, emirate, visa and more.',
  })

  const { user } = useAuthStore()
  const toast = useToastStore((s) => s.add)

  // ── Filter state (all instant — no staged/Apply pattern) ──────────────────
  const [query,       setQuery]       = useState('')
  const [emirates,    setEmirates]    = useState<Set<Emirate>>(new Set())
  const [jobCats,     setJobCats]     = useState<Set<JobCategory>>(new Set())
  const [levels,      setLevels]      = useState<Set<string>>(new Set())
  const [jobTypes,    setJobTypes]    = useState<Set<string>>(new Set())
  const [visaFilters, setVisaFilters] = useState<Set<VisaType>>(new Set())
  const [remoteOnly,  setRemoteOnly]  = useState(false)
  const [immediate,   setImmediate]   = useState(false)

  // ── Data ──────────────────────────────────────────────────────────────────
  const [jobs,         setJobs]         = useState<Job[]>([])
  const [total,        setTotal]        = useState(0)
  const [jobsLoading,  setJobsLoading]  = useState(true)

  // ── Detail ────────────────────────────────────────────────────────────────
  const [selectedId,    setSelectedId]    = useState<number | null>(null)
  const [detail,        setDetail]        = useState<Job | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const detailRef = useRef<HTMLDivElement>(null)

  // ── Fetch jobs ────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true
    setJobsLoading(true)

    const emirateArr    = Array.from(emirates)
    const jobCatArr     = Array.from(jobCats)
    const levelArr      = Array.from(levels)
    const jobTypeArr    = Array.from(jobTypes)
    const visaArr       = Array.from(visaFilters) as VisaType[]

    // Pass single-value filters as API params; multi-value falls back to client-side
    const params: Record<string, string | number | boolean | undefined> = {
      page: 0, size: 80,
      ...(emirateArr.length  === 1 && { emirate:         emirateArr[0]  }),
      ...(jobCatArr.length   === 1 && { category:        jobCatArr[0]   }),
      ...(levelArr.length    === 1 && { experienceLevel: levelArr[0]    }),
      ...(jobTypeArr.length  === 1 && { jobType:         jobTypeArr[0]  }),
      ...(visaArr.length     === 1 && { visaType:        visaArr[0]     }),
      ...(remoteOnly               && { remoteUae:       true           }),
      ...(immediate                && { immediateJoiner: true           }),
    }

    const req = query
      ? jobsApi.search(query, 0, 80)
      : jobsApi.filter(params)

    req
      .then(({ data }) => {
        if (!mounted) return
        let results = data.content
        if (emirateArr.length  > 1) results = results.filter(j => j.emirate      && emirateArr.includes(j.emirate))
        if (jobCatArr.length   > 1) results = results.filter(j => j.jobCategory  && jobCatArr.includes(j.jobCategory))
        if (levelArr.length    > 1) results = results.filter(j => j.experienceLevel && levelArr.includes(j.experienceLevel))
        if (jobTypeArr.length  > 1) results = results.filter(j => j.jobType      && jobTypeArr.includes(j.jobType))
        if (visaArr.length     > 1) results = results.filter(j => j.visaType     && visaArr.includes(j.visaType))
        const multiActive = emirateArr.length > 1 || jobCatArr.length > 1 || levelArr.length > 1 || jobTypeArr.length > 1 || visaArr.length > 1
        setJobs(results)
        setTotal(multiActive ? results.length : data.totalElements)
      })
      .catch(() => {})
      .finally(() => { if (mounted) setJobsLoading(false) })

    return () => { mounted = false }
  }, [query, emirates, jobCats, levels, jobTypes, visaFilters, remoteOnly, immediate])

  // ── Fetch detail ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedId) return
    setDetailLoading(true)
    jobsApi.detail(String(selectedId))
      .then(({ data }) => { setDetail(data); detailRef.current?.scrollTo(0, 0) })
      .catch(() => {})
      .finally(() => setDetailLoading(false))
  }, [selectedId])

  function clearAll() {
    setQuery(''); setEmirates(new Set()); setJobCats(new Set())
    setLevels(new Set()); setJobTypes(new Set()); setVisaFilters(new Set())
    setRemoteOnly(false); setImmediate(false)
  }

  async function saveJob(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (!user) { toast({ type: 'info', title: 'Sign in to save jobs' }); return }
    try { await seekerApi.saveJob(id); toast({ type: 'success', title: 'Saved' }) }
    catch (err) { toast({ type: 'error', title: 'Could not save', message: errorMessage(err) }) }
  }

  // ── Active chips ──────────────────────────────────────────────────────────
  const chips: { key: string; label: string; onRemove: () => void }[] = [
    ...Array.from(emirates).map(v => ({
      key: `e-${v}`,
      label: EMIRATES.find(e => e.value === v)?.label ?? v,
      onRemove: () => setEmirates(toggleSet(emirates, v)),
    })),
    ...Array.from(jobCats).map(v => ({
      key: `c-${v}`,
      label: JOB_CATEGORIES.find(c => c.value === v)?.label ?? v,
      onRemove: () => setJobCats(toggleSet(jobCats, v)),
    })),
    ...Array.from(levels).map(v => ({
      key: `l-${v}`,
      label: LEVELS.find(l => l.value === v)?.label ?? v,
      onRemove: () => setLevels(toggleSet(levels, v)),
    })),
    ...Array.from(jobTypes).map(v => ({
      key: `t-${v}`,
      label: JOB_TYPES.find(t => t.value === v)?.label ?? v,
      onRemove: () => setJobTypes(toggleSet(jobTypes, v)),
    })),
    ...Array.from(visaFilters).map(v => ({
      key: `v-${v}`,
      label: VISA_OPTIONS.find(o => o.value === v)?.label ?? v,
      onRemove: () => setVisaFilters(toggleSet(visaFilters, v)),
    })),
    ...(remoteOnly ? [{ key: 'remote',    label: 'Remote',     onRemove: () => setRemoteOnly(false) }] : []),
    ...(immediate  ? [{ key: 'immediate', label: '⚡ Now',     onRemove: () => setImmediate(false) }]  : []),
  ]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-white" style={{ height: 'calc(100vh - 57px)' }}>

      {/* ── Filter bar ──────────────────────────────────────────── */}
      <FilterBar
        query={query}               onQueryChange={setQuery}
        emirates={emirates}         onEmiratesChange={setEmirates}
        jobCats={jobCats}           onJobCatsChange={setJobCats}
        levels={levels}             onLevelsChange={setLevels}
        jobTypes={jobTypes}         onJobTypesChange={setJobTypes}
        visaFilters={visaFilters}   onVisaFiltersChange={setVisaFilters}
        remoteOnly={remoteOnly}     onRemoteChange={setRemoteOnly}
        immediate={immediate}       onImmediateChange={setImmediate}
        chips={chips}
        total={total}
        loading={jobsLoading}
        onClearAll={clearAll}
      />

      {/* ── Panels ──────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* List */}
        <aside className="w-full sm:w-[360px] xl:w-[400px] shrink-0 flex flex-col border-r border-[#E5E7EB]">
          <div className="px-4 py-2.5 border-b border-[#E5E7EB] shrink-0 flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-black">
              {jobsLoading ? '…' : `${total.toLocaleString()} roles`}
            </span>
            {!jobsLoading && chips.length > 0 && (
              <span className="font-mono text-[10px] text-[#2563EB]">filtered</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#E5E7EB]">
            {jobsLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="p-4 space-y-2.5">
                  <div className="h-2 w-20 shimmer" />
                  <div className="h-4 w-3/4 shimmer" />
                  <div className="h-2 w-1/2 shimmer" />
                </div>
              ))
            ) : jobs.length === 0 ? (
              <div className="p-10 text-center">
                <div className="font-mono text-[10px] uppercase tracking-widest text-gray-300 mb-2">No results</div>
                <button onClick={clearAll} className="text-xs text-[#2563EB] hover:underline font-mono">
                  Clear filters
                </button>
              </div>
            ) : (
              jobs.map((job) => {
                const active = job.id === selectedId
                const sal    = money(job.salaryMin, job.salaryMax, job.salaryCurrency)
                const skills = parseSkills(job.skills).slice(0, 3)
                return (
                  <button
                    key={job.id}
                    onClick={() => setSelectedId(job.id)}
                    className={`relative w-full text-left px-4 py-4 transition-colors ${
                      active ? 'bg-[#EFF6FF]' : 'hover:bg-[#FAFAFA]'
                    }`}
                  >
                    {active && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#2563EB]" />}
                    <div className="flex items-center gap-2 mb-1.5">
                      <CompanyLogo logoUrl={job.companyLogoUrl} companyName={job.companyName} size="sm" className="shrink-0" />
                      <span className={`font-mono text-[10px] font-bold uppercase tracking-widest truncate ${active ? 'text-[#2563EB]' : 'text-gray-400'}`}>
                        {job.companyName}
                      </span>
                      <span className="ml-auto font-mono text-[10px] text-gray-400 shrink-0">{relativeTime(job.createdAt)}</span>
                    </div>
                    <p className="font-bold text-sm text-black leading-snug mb-2">{job.title}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-gray-500 truncate">
                        {skills.length ? skills.join(', ') : (job.locationUae ?? 'UAE')}
                      </span>
                      {sal && (
                        <span className={`font-mono text-[11px] font-bold shrink-0 ml-2 ${active ? 'text-[#2563EB]' : 'text-black'}`}>
                          {sal}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        {/* Detail */}
        <main ref={detailRef} className="hidden sm:block flex-1 overflow-y-auto bg-white">
          {!selectedId ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-10">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-300 mb-2">No role selected</div>
              <p className="text-sm text-gray-400">Select a role from the list to view details.</p>
            </div>
          ) : detailLoading ? (
            <div className="p-10 space-y-4">
              <div className="h-3 w-32 shimmer" /><div className="h-8 w-3/4 shimmer" />
              <div className="h-3 w-1/2 shimmer" /><div className="h-24 shimmer mt-6" />
            </div>
          ) : detail ? (
            <DetailPanel job={detail} onSave={saveJob} />
          ) : null}
        </main>
      </div>
    </div>
  )
}

// ── Filter Bar ────────────────────────────────────────────────────────────────
interface FilterBarProps {
  query: string;               onQueryChange: (v: string) => void
  emirates: Set<Emirate>;      onEmiratesChange: (s: Set<Emirate>) => void
  jobCats: Set<JobCategory>;   onJobCatsChange: (s: Set<JobCategory>) => void
  levels: Set<string>;         onLevelsChange: (s: Set<string>) => void
  jobTypes: Set<string>;       onJobTypesChange: (s: Set<string>) => void
  visaFilters: Set<VisaType>;  onVisaFiltersChange: (s: Set<VisaType>) => void
  remoteOnly: boolean;         onRemoteChange: (v: boolean) => void
  immediate: boolean;          onImmediateChange: (v: boolean) => void
  chips: { key: string; label: string; onRemove: () => void }[]
  total: number; loading: boolean; onClearAll: () => void
}

function FilterBar({
  query, onQueryChange,
  emirates, onEmiratesChange,
  jobCats, onJobCatsChange,
  levels, onLevelsChange,
  jobTypes, onJobTypesChange,
  visaFilters, onVisaFiltersChange,
  remoteOnly, onRemoteChange,
  immediate, onImmediateChange,
  chips, total, loading, onClearAll,
}: FilterBarProps) {
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null)

  useEffect(() => {
    if (!openPanel) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenPanel(null) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [openPanel])

  function panel(id: PanelId) {
    return openPanel === id ? null : id
  }

  return (
    <div className="shrink-0 bg-white border-b border-[#E5E7EB] z-20">

      {/* ── Row 1: search + filter buttons ──────────────────────── */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 overflow-x-auto">

        {/* Search */}
        <div className="relative shrink-0 w-[200px] xl:w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search roles, skills…"
            className="w-full border border-[#E5E7EB] bg-[#FAFAFA] pl-8 pr-7 py-1.5 text-xs focus:outline-none focus:border-[#2563EB] focus:bg-white transition-colors"
          />
          {query && (
            <button onClick={() => onQueryChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="h-5 w-px bg-[#E5E7EB] shrink-0 mx-0.5" />

        {/* Emirate dropdown */}
        <FilterDropdown
          label="Emirate" count={emirates.size}
          open={openPanel === 'emirate'}
          onToggle={() => setOpenPanel(panel('emirate'))}
          onClose={() => setOpenPanel(null)}
        >
          <CheckboxPanel
            options={EMIRATES}
            selected={emirates as Set<string>}
            onToggle={(v) => onEmiratesChange(toggleSet(emirates, v as Emirate))}
          />
        </FilterDropdown>

        {/* Stack dropdown */}
        <FilterDropdown
          label="Stack" count={jobCats.size}
          open={openPanel === 'stack'}
          onToggle={() => setOpenPanel(panel('stack'))}
          onClose={() => setOpenPanel(null)}
        >
          <CheckboxPanel
            options={JOB_CATEGORIES.map(c => ({ value: c.value, label: c.label }))}
            selected={jobCats as Set<string>}
            onToggle={(v) => onJobCatsChange(toggleSet(jobCats, v as JobCategory))}
          />
        </FilterDropdown>

        {/* Level dropdown */}
        <FilterDropdown
          label="Level" count={levels.size}
          open={openPanel === 'level'}
          onToggle={() => setOpenPanel(panel('level'))}
          onClose={() => setOpenPanel(null)}
        >
          <PillPanel
            options={LEVELS} selected={levels}
            onToggle={(v) => onLevelsChange(toggleSet(levels, v))}
          />
        </FilterDropdown>

        {/* Type dropdown */}
        <FilterDropdown
          label="Job Type" count={jobTypes.size}
          open={openPanel === 'type'}
          onToggle={() => setOpenPanel(panel('type'))}
          onClose={() => setOpenPanel(null)}
        >
          <PillPanel
            options={JOB_TYPES} selected={jobTypes}
            onToggle={(v) => onJobTypesChange(toggleSet(jobTypes, v))}
          />
        </FilterDropdown>

        {/* Visa dropdown */}
        <FilterDropdown
          label="Visa" count={visaFilters.size}
          open={openPanel === 'visa'}
          onToggle={() => setOpenPanel(panel('visa'))}
          onClose={() => setOpenPanel(null)}
        >
          <CheckboxPanel
            options={VISA_OPTIONS}
            selected={visaFilters as Set<string>}
            onToggle={(v) => onVisaFiltersChange(toggleSet(visaFilters, v as VisaType))}
          />
        </FilterDropdown>

        <div className="h-5 w-px bg-[#E5E7EB] shrink-0 mx-0.5" />

        {/* Quick toggles */}
        <QuickToggle active={remoteOnly} onToggle={() => onRemoteChange(!remoteOnly)}>
          🌐 Remote
        </QuickToggle>
        <QuickToggle active={immediate} onToggle={() => onImmediateChange(!immediate)}>
          <Zap size={10} className="inline" /> Now
        </QuickToggle>

        {/* Result count — right-aligned on wider screens */}
        {!loading && chips.length === 0 && (
          <span className="ml-auto font-mono text-[10px] text-gray-400 shrink-0 hidden xl:block">
            {total.toLocaleString()} roles
          </span>
        )}
      </div>

      {/* ── Row 2: active chips (only when filters are applied) ─── */}
      {chips.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-[#E5E7EB] bg-[#FAFAFA] overflow-x-auto">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-gray-400 shrink-0">
            Active
          </span>
          {chips.map((chip) => (
            <button
              key={chip.key}
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1 bg-white border border-[#2563EB] text-[#2563EB] font-mono text-[10px] font-bold px-2.5 py-1 hover:bg-[#EFF6FF] transition-colors shrink-0"
            >
              {chip.label} <X size={9} />
            </button>
          ))}
          {!loading && (
            <span className="font-mono text-[10px] text-gray-500 shrink-0">
              {total.toLocaleString()} roles
            </span>
          )}
          <button
            onClick={onClearAll}
            className="ml-auto font-mono text-[10px] text-gray-400 hover:text-black underline shrink-0"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}

// ── FilterDropdown ────────────────────────────────────────────────────────────
function FilterDropdown({
  label, count, open, onToggle, onClose, children,
}: {
  label: string; count: number; open: boolean
  onToggle: () => void; onClose: () => void
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={onToggle}
        className={`inline-flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[11px] font-bold transition-colors ${
          count > 0
            ? 'bg-[#EFF6FF] border-[#93C5FD] text-[#2563EB]'
            : 'bg-white border-[#E5E7EB] text-gray-700 hover:border-gray-400 hover:text-black'
        }`}
      >
        {label}
        {count > 0 && (
          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-[#2563EB] text-white font-mono text-[9px] font-bold leading-none">
            {count}
          </span>
        )}
        <ChevronDown size={11} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-white border border-[#E5E7EB] shadow-[0_4px_16px_rgba(15,23,42,0.1)] min-w-[180px]">
          {children}
        </div>
      )}
    </div>
  )
}

// ── CheckboxPanel — list-style multi-select ───────────────────────────────────
function CheckboxPanel({
  options, selected, onToggle,
}: {
  options: { value: string; label: string }[]
  selected: Set<string>
  onToggle: (v: string) => void
}) {
  return (
    <div className="py-1.5 max-h-[280px] overflow-y-auto">
      {options.map(({ value, label }) => (
        <label
          key={value}
          className="flex items-center gap-2.5 px-4 py-2 cursor-pointer hover:bg-[#FAFAFA] transition-colors group"
        >
          <input
            type="checkbox"
            checked={selected.has(value)}
            onChange={() => onToggle(value)}
          />
          <span className={`font-mono text-xs transition-colors ${selected.has(value) ? 'text-[#2563EB] font-bold' : 'text-gray-700 group-hover:text-black'}`}>
            {label}
          </span>
        </label>
      ))}
    </div>
  )
}

// ── PillPanel — compact pill-style multi-select ───────────────────────────────
function PillPanel({
  options, selected, onToggle,
}: {
  options: { value: string; label: string }[]
  selected: Set<string>
  onToggle: (v: string) => void
}) {
  return (
    <div className="p-3 flex flex-wrap gap-1.5 max-w-[260px]">
      {options.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onToggle(value)}
          className={`px-3 py-1.5 font-mono text-[11px] font-bold border transition-colors ${
            selected.has(value)
              ? 'bg-[#2563EB] text-white border-[#2563EB]'
              : 'bg-white text-gray-700 border-[#E5E7EB] hover:border-[#2563EB] hover:text-[#2563EB]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ── QuickToggle — single-click binary filter ──────────────────────────────────
function QuickToggle({
  active, onToggle, children,
}: {
  active: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-1 border px-3 py-1.5 font-mono text-[11px] font-bold transition-colors shrink-0 ${
        active
          ? 'bg-[#2563EB] text-white border-[#2563EB]'
          : 'bg-white text-gray-700 border-[#E5E7EB] hover:border-gray-400 hover:text-black'
      }`}
    >
      {children}
    </button>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────────────
function DetailPanel({ job, onSave }: { job: Job; onSave: (id: number, e: React.MouseEvent) => void }) {
  const skills  = parseSkills(job.skills)
  const salary  = money(job.salaryMin, job.salaryMax, job.salaryCurrency)
  const applyUrl = job.applyUrl ?? job.linkedinUrl
    ?? `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(`${job.title} ${job.companyName}`)}&location=United%20Arab%20Emirates`

  const half = Math.ceil(skills.length / 2)

  return (
    <div className="p-8 xl:p-10 max-w-3xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <CompanyLogo logoUrl={job.companyLogoUrl} companyName={job.companyName} size="sm" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#2563EB] truncate">
              {job.companyName}
              {job.locationUae ? ` · ${job.locationUae}` : ''}
              {job.remoteUae   ? ' · Remote' : ''}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-black leading-tight">
            {job.title}
          </h1>
          {job.experienceLevel && (
            <p className="mt-1 text-base font-normal text-gray-400">{labelize(job.experienceLevel)}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0 mt-1">
          <a
            href={applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#2563EB] text-white font-sans text-sm font-bold px-5 py-2.5 hover:bg-[#1d4ed8] transition-colors"
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
        {salary && <InfoPill>{salary}</InfoPill>}
        {job.jobType && <InfoPill>{labelize(job.jobType)}</InfoPill>}
        {(job.visaType === 'free_visa' || job.visaType === 'employment_visa') && <InfoPill accent>Visa Provided</InfoPill>}
        {job.visaType === 'own_visa'            && <InfoPill>Own Visa Required</InfoPill>}
        {job.visaType === 'visit_visa_accepted' && <InfoPill>Visit Visa OK</InfoPill>}
        {job.immediateJoiner && <InfoPill accent><Zap size={10} /> Immediate Joiner</InfoPill>}
        {job.remoteUae       && <InfoPill>Remote UAE</InfoPill>}
      </div>

      {/* Stack grid */}
      {skills.length > 0 && (
        <>
          <DetailSection>Core Stack</DetailSection>
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="border border-[#E5E7EB] p-4 bg-[#FAFAFA]">
              <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-gray-400 mb-2">Required</span>
              <span className="font-mono text-sm font-semibold text-black">{skills.slice(0, half).join(', ')}</span>
            </div>
            {skills.length > half && (
              <div className="border border-[#E5E7EB] p-4 bg-[#FAFAFA]">
                <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-gray-400 mb-2">Additional</span>
                <span className="font-mono text-sm font-semibold text-black">{skills.slice(half).join(', ')}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Description */}
      <JobDescriptionBlock job={job} />

      {/* Footer */}
      <div className="mt-10 pt-6 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-gray-400 font-mono">
        <div className="flex items-center gap-4">
          {job.createdAt && (
            <span className="flex items-center gap-1.5"><CalendarDays size={12} />{relativeTime(job.createdAt)}</span>
          )}
          {job.locationUae && (
            <span className="flex items-center gap-1.5"><MapPin size={12} />{job.locationUae}</span>
          )}
          {job.jobType && (
            <span className="flex items-center gap-1.5"><BriefcaseBusiness size={12} />{labelize(job.jobType)}</span>
          )}
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

function InfoPill({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 border px-3 py-1.5 font-mono text-xs font-semibold ${
      accent ? 'bg-blue-50 border-blue-200 text-[#2563EB]' : 'bg-[#F3F4F6] border-[#E5E7EB] text-black'
    }`}>
      {children}
    </span>
  )
}

function DetailSection({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-black mb-3 pb-2 border-b border-[#E5E7EB]">
      {children}
    </h2>
  )
}

function JobDescriptionBlock({ job }: { job: Job }) {
  if (job.descriptionHtml?.trim()) {
    return (
      <>
        <DetailSection>About the Role</DetailSection>
        <div className="prose-job" dangerouslySetInnerHTML={{ __html: job.descriptionHtml }} />
      </>
    )
  }

  let sections: { heading: string; items: string[] }[] = []
  if (job.descriptionSections) {
    try {
      const parsed = JSON.parse(job.descriptionSections)
      if (Array.isArray(parsed)) sections = parsed.filter(
        (s) => s && typeof s.heading === 'string' && Array.isArray(s.items)
      )
    } catch { /* fall through */ }
  }

  if (sections.length > 0) {
    return (
      <div className="space-y-8">
        {sections.map((s) => (
          <div key={s.heading}>
            <DetailSection>{s.heading}</DetailSection>
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
        <DetailSection>About the Role</DetailSection>
        <p className="prose-job">{job.description}</p>
      </div>
      {job.requirements && (
        <div>
          <DetailSection>Requirements</DetailSection>
          <p className="prose-job">{job.requirements}</p>
        </div>
      )}
    </div>
  )
}
