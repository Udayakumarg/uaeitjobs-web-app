import DOMPurify from 'dompurify'
import {
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
  Zap,
} from 'lucide-react'
import { memo, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CompanyLogo } from '../../components/CompanyLogo'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { errorMessage, jobsApi, seekerApi, type FilterMultiParams } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../components/Toast'
import { JOB_CATEGORIES } from '../../types'
import type { Emirate, Job, JobCategory } from '../../types'
import { labelize, money, parseSkills, relativeTime } from '../../utils/format'

// ── Static data ───────────────────────────────────────────────────────────────
const EMIRATES: { value: Emirate; label: string }[] = [
  { value: 'dubai',          label: 'Dubai'          },
  { value: 'abu_dhabi',      label: 'Abu Dhabi'      },
  { value: 'sharjah',        label: 'Sharjah'        },
  { value: 'ajman',          label: 'Ajman'          },
  { value: 'ras_al_khaimah', label: 'Ras Al Khaimah' },
  { value: 'fujairah',       label: 'Fujairah'       },
  { value: 'umm_al_quwain',  label: 'Umm Al Quwain'  },
]

const LEVELS = [
  { value: 'intern',    label: 'Intern'        },
  { value: 'junior',    label: 'Junior'        },
  { value: 'mid',       label: 'Mid-level'     },
  { value: 'senior',    label: 'Senior'        },
  { value: 'lead',      label: 'Lead / Staff'  },
  { value: 'principal', label: 'Principal'     },
  { value: 'director',  label: 'Director'      },
]

const JOB_TYPES = [
  { value: 'full_time',  label: 'Full-time'  },
  { value: 'part_time',  label: 'Part-time'  },
  { value: 'contract',   label: 'Contract'   },
  { value: 'freelance',  label: 'Freelance'  },
  { value: 'internship', label: 'Internship' },
  { value: 'temporary',  label: 'Temporary'  },
]

const POSTED_OPTIONS = [
  { value: '24h', label: 'Last 24 h'   },
  { value: '3d',  label: 'Last 3 days' },
  { value: '7d',  label: 'Last week'   },
  { value: '14d', label: 'Last 2 wks'  },
  { value: '30d', label: 'Last month'  },
]

const SALARY_OPTIONS = [
  { value: '0-5k',    label: 'Under 5K'  },
  { value: '5k-10k',  label: '5K – 10K'  },
  { value: '10k-20k', label: '10K – 20K' },
  { value: '20k-30k', label: '20K – 30K' },
  { value: '30k-50k', label: '30K – 50K' },
  { value: '50k+',    label: '50K+ AED'  },
]

const SORT_OPTIONS = [
  { value: 'newest',      label: 'Newest first'   },
  { value: 'salary_high', label: 'Salary: High ↓' },
  { value: 'salary_low',  label: 'Salary: Low ↑'  },
]

type PanelId = 'emirate' | 'stack' | 'level' | 'type' | 'posted' | 'salary' | 'sort'

// Brand colours
const PINK      = '#BE185D'
const PINK_HOV  = '#9D174D'
const PINK_BG   = '#FDF2F8'
const PINK_RING = '#FBCFE8'

function toggleSet<T>(set: Set<T>, v: T): Set<T> {
  const n = new Set(set)
  if (n.has(v)) { n.delete(v) } else { n.add(v) }
  return n
}
function salaryRange(b: string): [number, number | null] {
  const m: Record<string, [number, number | null]> = {
    '0-5k': [0, 5000], '5k-10k': [5000, 10000], '10k-20k': [10000, 20000],
    '20k-30k': [20000, 30000], '30k-50k': [30000, 50000], '50k+': [50000, null],
  }
  return m[b] ?? [0, null]
}
function postedAfterMs(k: string): number {
  const d: Record<string, number> = { '24h': 1, '3d': 3, '7d': 7, '14d': 14, '30d': 30 }
  return (d[k] ?? 0) * 86400000
}

// ── Main component ────────────────────────────────────────────────────────────
export default function JobBrowse() {
  useDocumentMeta({
    title: 'Browse UAE IT roles',
    description: 'UAE IT and technology jobs — filter by stack, emirate, salary and more.',
  })

  const navigate = useNavigate()
  const { user }  = useAuthStore()
  const toast     = useToastStore((s) => s.add)
  const [searchParams] = useSearchParams()

  // filter state
  const [query,        setQuery]       = useState(() => searchParams.get('q') ?? '')
  const [emirates,     setEmirates]    = useState<Set<Emirate>>(new Set())
  const [jobCats,      setJobCats]     = useState<Set<JobCategory>>(new Set())
  const [levels,       setLevels]      = useState<Set<string>>(new Set())
  const [jobTypes,     setJobTypes]    = useState<Set<string>>(new Set())
  const [remoteOnly,   setRemoteOnly]  = useState(false)
  const [posted,       setPosted]      = useState('')
  const [salaryBucket, setSalary]      = useState('')
  const [sortBy,       setSortBy]      = useState('newest')

  // data
  const [jobs,        setJobs]        = useState<Job[]>([])
  const [total,       setTotal]       = useState(0)
  const [jobsLoading, setJobsLoading] = useState(true)

  // detail (desktop only)
  const [selectedId,    setSelectedId]    = useState<number | null>(null)
  const [detail,        setDetail]        = useState<Job | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const detailRef = useRef<HTMLDivElement>(null)

  // mobile sheet
  const [mobileOpen, setMobileOpen] = useState(false)

  // fetch — search + all filtering in a single DB round-trip via filterMulti.
  // The 'q' param drives plainto_tsquery full-text ranking server-side so
  // results are never silently cropped by the 80-row page cap.
  useEffect(() => {
    let ok = true
    setJobsLoading(true)

    const eArr = Array.from(emirates)
    const cArr = Array.from(jobCats)
    const lArr = Array.from(levels)
    const tArr = Array.from(jobTypes)

    const [salMin, salMax] = salaryBucket ? salaryRange(salaryBucket) : [undefined, undefined]
    const params: FilterMultiParams = {
      page: 0, size: 80,
      ...(query.trim()          && { q:              query.trim() }),
      ...(eArr.length           && { emirate:         eArr }),
      ...(cArr.length           && { category:        cArr }),
      ...(lArr.length           && { experienceLevel: lArr }),
      ...(tArr.length           && { jobType:         tArr }),
      ...(remoteOnly            && { remoteUae:       true }),
      ...(posted                && { postedAfter:     new Date(Date.now() - postedAfterMs(posted)).toISOString() }),
      ...(salMin != null        && { salaryMin:       salMin }),
      ...(salMax != null        && { salaryMax:       salMax }),
      ...(sortBy !== 'newest'   && { sort:            sortBy === 'salary_high' ? 'salary_desc' : 'salary_asc' }),
    }
    const req = jobsApi.filterMulti(params)

    req.then(({ data }) => {
      if (!ok) return
      const r = data.content
      setJobs(r)
      setTotal(data.totalElements)
      // Auto-select first job on desktop — keeps panel in sync when filters change
      if (r.length > 0 && window.innerWidth >= 768) {
        setSelectedId(r[0].id)
      } else if (r.length === 0) {
        setSelectedId(null)
      }
    }).catch(() => {}).finally(() => { if (ok) setJobsLoading(false) })
    return () => { ok = false }
  }, [query, emirates, jobCats, levels, jobTypes, remoteOnly, posted, salaryBucket, sortBy])

  useEffect(() => {
    if (!selectedId) return
    setDetailLoading(true)
    jobsApi.detail(String(selectedId))
      .then(({ data }) => { setDetail(data); detailRef.current?.scrollTo(0, 0) })
      .catch(() => {}).finally(() => setDetailLoading(false))
  }, [selectedId])

  function clearAll() {
    setQuery(''); setEmirates(new Set()); setJobCats(new Set())
    setLevels(new Set()); setJobTypes(new Set()); setRemoteOnly(false)
    setPosted(''); setSalary(''); setSortBy('newest')
  }

  async function saveJob(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (!user) { toast({ type: 'info', title: 'Sign in to save jobs' }); return }
    try { await seekerApi.saveJob(id); toast({ type: 'success', title: 'Saved' }) }
    catch (err) { toast({ type: 'error', title: 'Could not save', message: errorMessage(err) }) }
  }

  function handleJobClick(job: Job) {
    if (window.innerWidth < 768) { navigate(`/jobs/${job.id}`) }
    else { setSelectedId(job.id) }
  }

  // active chips
  const chips: { key: string; label: string; onRemove: () => void }[] = [
    ...Array.from(emirates).map(v => ({ key: `e-${v}`, label: EMIRATES.find(x => x.value === v)?.label ?? v, onRemove: () => setEmirates(toggleSet(emirates, v)) })),
    ...Array.from(jobCats).map(v  => ({ key: `c-${v}`, label: JOB_CATEGORIES.find(x => x.value === v)?.label ?? v, onRemove: () => setJobCats(toggleSet(jobCats, v)) })),
    ...Array.from(levels).map(v   => ({ key: `l-${v}`, label: LEVELS.find(x => x.value === v)?.label ?? v,         onRemove: () => setLevels(toggleSet(levels, v)) })),
    ...Array.from(jobTypes).map(v => ({ key: `t-${v}`, label: JOB_TYPES.find(x => x.value === v)?.label ?? v,      onRemove: () => setJobTypes(toggleSet(jobTypes, v)) })),
    ...(remoteOnly   ? [{ key: 'remote', label: 'Remote',  onRemove: () => setRemoteOnly(false) }] : []),
    ...(posted       ? [{ key: 'posted', label: POSTED_OPTIONS.find(x => x.value === posted)?.label  ?? posted,  onRemove: () => setPosted('')  }] : []),
    ...(salaryBucket ? [{ key: 'sal',    label: SALARY_OPTIONS.find(x => x.value === salaryBucket)?.label ?? salaryBucket, onRemove: () => setSalary('') }] : []),
  ]

  const activeCount = chips.length
  const hasFilters  = activeCount > 0

  const fp = {
    query, onQueryChange: setQuery,
    emirates, onEmiratesChange: setEmirates,
    jobCats, onJobCatsChange: setJobCats,
    levels, onLevelsChange: setLevels,
    jobTypes, onJobTypesChange: setJobTypes,
    remoteOnly, onRemoteChange: setRemoteOnly,
    posted, onPostedChange: setPosted,
    salaryBucket, onSalaryChange: setSalary,
    sortBy, onSortChange: setSortBy,
    chips, activeCount, total, loading: jobsLoading,
    onClearAll: clearAll, hasFilters,
  }

  return (
    <div className="flex flex-col bg-white" style={{ height: 'calc(100vh - 57px)' }}>

      {/* ── Filter bar ─────────────────────────────────────────── */}
      <FilterBar {...fp} onMobileOpen={() => setMobileOpen(true)} />

      {/* ── Panels (centered on wide screens) ──────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0 md:pl-14 xl:pl-20 2xl:pl-28">
        <div className="flex w-full max-w-[1400px] overflow-hidden min-h-0">

          {/* Job list */}
          <aside className="w-full md:w-[380px] xl:w-[420px] shrink-0 flex flex-col border-r border-[#E5E7EB]">
            <div className="px-4 py-2.5 border-b border-[#E5E7EB] shrink-0 flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-black">
                {jobsLoading ? '…' : `${total.toLocaleString()} roles`}
              </span>
              {!jobsLoading && hasFilters && (
                <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: PINK }}>filtered</span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="h-2" />
              {jobsLoading ? (
                <div className="divide-y divide-[#E5E7EB]">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="px-4 py-5 space-y-2.5">
                      <div className="h-2 w-20 shimmer" />
                      <div className="h-4 w-3/4 shimmer" />
                      <div className="h-2 w-1/2 shimmer" />
                    </div>
                  ))}
                </div>
              ) : jobs.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-gray-300 mb-2">No results</div>
                  <button onClick={clearAll} className="text-xs hover:underline font-mono" style={{ color: PINK }}>Clear filters</button>
                </div>
              ) : (
                <div className="divide-y divide-[#E5E7EB]">
                  {jobs.map(job => (
                    <JobListItem
                      key={job.id}
                      job={job}
                      active={job.id === selectedId}
                      onClick={handleJobClick}
                    />
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Detail (desktop only) */}
          <main ref={detailRef} className="hidden md:block flex-1 overflow-y-auto bg-white">
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

      {/* ── Mobile filter sheet ─────────────────────────────────── */}
      <MobileFilterSheet open={mobileOpen} onClose={() => setMobileOpen(false)} {...fp} />
    </div>
  )
}

// ── Shared prop type ──────────────────────────────────────────────────────────
interface SharedFilterProps {
  query: string;             onQueryChange: (v: string) => void
  emirates: Set<Emirate>;    onEmiratesChange: (s: Set<Emirate>) => void
  jobCats: Set<JobCategory>; onJobCatsChange: (s: Set<JobCategory>) => void
  levels: Set<string>;       onLevelsChange: (s: Set<string>) => void
  jobTypes: Set<string>;     onJobTypesChange: (s: Set<string>) => void
  remoteOnly: boolean;       onRemoteChange: (v: boolean) => void
  posted: string;            onPostedChange: (v: string) => void
  salaryBucket: string;      onSalaryChange: (v: string) => void
  sortBy: string;            onSortChange: (v: string) => void
  chips: { key: string; label: string; onRemove: () => void }[]
  activeCount: number; hasFilters: boolean
  total: number; loading: boolean; onClearAll: () => void
}

// ── Filter bar (desktop) ──────────────────────────────────────────────────────
function FilterBar(props: SharedFilterProps & { onMobileOpen: () => void }) {
  const {
    query, onQueryChange,
    emirates, onEmiratesChange, jobCats, onJobCatsChange,
    levels, onLevelsChange, jobTypes, onJobTypesChange,
    remoteOnly, onRemoteChange,
    posted, onPostedChange, salaryBucket, onSalaryChange,
    sortBy, onSortChange,
    chips, activeCount, hasFilters, total, loading,
    onClearAll, onMobileOpen,
  } = props

  const [openPanel, setOpenPanel] = useState<PanelId | null>(null)

  useEffect(() => {
    if (!openPanel) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenPanel(null) }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [openPanel])

  function tog(id: PanelId) { setOpenPanel(openPanel === id ? null : id) }
  function close() { setOpenPanel(null) }

  return (
    <div className="shrink-0 bg-white border-b border-[#E5E7EB] z-20">

      {/* ── Row 1: search (centered, constrained width) ───────── */}
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2 md:justify-center">
        <div className="relative flex-1 md:max-w-[600px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search roles, skills, companies…"
            className="w-full rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:bg-white transition-colors"
            style={{ '--tw-ring-color': PINK } as React.CSSProperties}
            onFocus={e => (e.currentTarget.style.borderColor = PINK)}
            onBlur={e => (e.currentTarget.style.borderColor = '#E5E7EB')}
          />
          {query && (
            <button onClick={() => onQueryChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Mobile: Filters button */}
        <button
          onClick={onMobileOpen}
          className="md:hidden inline-flex items-center gap-1.5 border rounded-lg px-3 py-2.5 font-sans text-xs font-medium transition-colors shrink-0"
          style={activeCount > 0
            ? { background: PINK_BG, borderColor: PINK_RING, color: PINK }
            : { borderColor: '#E5E7EB', color: '#374151' }}
        >
          <SlidersHorizontal size={14} />
          Filters
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center h-4 w-4 rounded-full text-white text-[9px] font-bold leading-none" style={{ background: PINK }}>
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Row 2: filter buttons (desktop, centered) ─────────── */}
      <div className="hidden md:flex items-center justify-center px-4 pb-3">
        <div className="flex items-center gap-1.5 flex-wrap">

          <FilterDropdown label="Emirate"  count={emirates.size}     open={openPanel === 'emirate'} onToggle={() => tog('emirate')} onClose={close}>
            <CheckboxPanel options={EMIRATES} selected={emirates as Set<string>} onToggle={v => onEmiratesChange(toggleSet(emirates, v as Emirate))} />
          </FilterDropdown>

          <FilterDropdown label="Stack"    count={jobCats.size}      open={openPanel === 'stack'}   onToggle={() => tog('stack')}   onClose={close}>
            <CheckboxPanel options={JOB_CATEGORIES.map(c => ({ value: c.value, label: c.label }))} selected={jobCats as Set<string>} onToggle={v => onJobCatsChange(toggleSet(jobCats, v as JobCategory))} />
          </FilterDropdown>

          <FilterDropdown label="Level"    count={levels.size}       open={openPanel === 'level'}   onToggle={() => tog('level')}   onClose={close}>
            <PillPanel options={LEVELS} selected={levels} onToggle={v => onLevelsChange(toggleSet(levels, v))} />
          </FilterDropdown>

          <FilterDropdown label="Job Type" count={jobTypes.size}     open={openPanel === 'type'}    onToggle={() => tog('type')}    onClose={close}>
            <PillPanel options={JOB_TYPES} selected={jobTypes} onToggle={v => onJobTypesChange(toggleSet(jobTypes, v))} />
          </FilterDropdown>

          <FilterDropdown label="Posted"   count={posted ? 1 : 0}    open={openPanel === 'posted'}  onToggle={() => tog('posted')}  onClose={close}>
            <RadioPanel options={POSTED_OPTIONS} selected={posted} onSelect={onPostedChange} />
          </FilterDropdown>

          <FilterDropdown label="Salary"   count={salaryBucket ? 1 : 0} open={openPanel === 'salary'} onToggle={() => tog('salary')} onClose={close}>
            <RadioPanel options={SALARY_OPTIONS} selected={salaryBucket} onSelect={onSalaryChange} />
          </FilterDropdown>

          <Sep />

          <QuickToggle active={remoteOnly} onToggle={() => onRemoteChange(!remoteOnly)}>🌐 Remote</QuickToggle>

          <Sep />

          <FilterDropdown
            label={SORT_OPTIONS.find(s => s.value === sortBy)?.label ?? 'Sort'}
            count={0} noHighlight
            open={openPanel === 'sort'} onToggle={() => tog('sort')} onClose={close}
          >
            <RadioPanel options={SORT_OPTIONS} selected={sortBy} onSelect={v => { onSortChange(v); close() }} />
          </FilterDropdown>

          {hasFilters && (
            <button
              onClick={onClearAll}
              className="ml-1 shrink-0 font-sans text-xs text-gray-400 hover:text-black transition-colors underline"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* ── Row 3: active chips ────────────────────────────────── */}
      {chips.length > 0 && (
        <div className="flex items-center justify-center border-t border-[#E5E7EB] bg-[#FAFAFA] px-4 py-2 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-gray-400 shrink-0">Active</span>
            {chips.map(chip => (
              <button
                key={chip.key}
                onClick={chip.onRemove}
                className="inline-flex items-center gap-1 bg-white font-mono text-[10px] font-bold px-2.5 py-1 hover:opacity-80 transition-opacity shrink-0"
                style={{ border: `1px solid ${PINK}`, color: PINK }}
              >
                {chip.label} <X size={9} />
              </button>
            ))}
            {!loading && (
              <span className="font-mono text-[10px] text-gray-500 ml-1 shrink-0">{total.toLocaleString()} roles</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Mobile filter sheet ───────────────────────────────────────────────────────
function MobileFilterSheet(props: SharedFilterProps & { open: boolean; onClose: () => void }) {
  const {
    open, onClose,
    emirates, onEmiratesChange, jobCats, onJobCatsChange,
    levels, onLevelsChange, jobTypes, onJobTypesChange,
    remoteOnly, onRemoteChange,
    posted, onPostedChange, salaryBucket, onSalaryChange,
    sortBy, onSortChange,
    total, loading, onClearAll, activeCount,
  } = props

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl">

        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB] shrink-0">
          <span className="font-sans text-sm font-semibold">Filters</span>
          <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-7">

          <SheetSection label="Emirate">
            <div className="grid grid-cols-2 gap-2">
              {EMIRATES.map(({ value, label }) => (
                <label key={value}
                  className="flex items-center gap-2.5 p-2.5 border cursor-pointer transition-colors rounded"
                  style={emirates.has(value) ? { borderColor: PINK, background: PINK_BG } : { borderColor: '#E5E7EB' }}>
                  <input type="checkbox" checked={emirates.has(value)} onChange={() => onEmiratesChange(toggleSet(emirates, value))} />
                  <span className="text-sm font-medium" style={{ color: emirates.has(value) ? PINK : '#374151' }}>{label}</span>
                </label>
              ))}
            </div>
          </SheetSection>

          <SheetSection label="Specialization">
            <div className="grid grid-cols-2 gap-2">
              {JOB_CATEGORIES.map(({ value, label }) => (
                <label key={value}
                  className="flex items-center gap-2.5 p-2.5 border cursor-pointer transition-colors rounded"
                  style={jobCats.has(value) ? { borderColor: PINK, background: PINK_BG } : { borderColor: '#E5E7EB' }}>
                  <input type="checkbox" checked={jobCats.has(value)} onChange={() => onJobCatsChange(toggleSet(jobCats, value as JobCategory))} />
                  <span className="text-sm font-medium" style={{ color: jobCats.has(value) ? PINK : '#374151' }}>{label}</span>
                </label>
              ))}
            </div>
          </SheetSection>

          <SheetSection label="Experience Level">
            <div className="grid grid-cols-2 gap-1.5">
              {LEVELS.map(({ value, label }) => (
                <button key={value} onClick={() => onLevelsChange(toggleSet(levels, value))}
                  className="flex h-9 items-center justify-center rounded-lg border font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition-colors"
                  style={levels.has(value) ? { background: PINK, color: '#fff', borderColor: PINK } : { borderColor: '#E5E7EB', color: '#374151', background: '#fff' }}>
                  {label}
                </button>
              ))}
            </div>
          </SheetSection>

          <SheetSection label="Job Type">
            <div className="grid grid-cols-2 gap-1.5">
              {JOB_TYPES.map(({ value, label }) => (
                <button key={value} onClick={() => onJobTypesChange(toggleSet(jobTypes, value))}
                  className="flex h-9 items-center justify-center rounded-lg border font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition-colors"
                  style={jobTypes.has(value) ? { background: PINK, color: '#fff', borderColor: PINK } : { borderColor: '#E5E7EB', color: '#374151', background: '#fff' }}>
                  {label}
                </button>
              ))}
            </div>
          </SheetSection>

          <SheetSection label="Date Posted">
            <div className="grid gap-0.5">
              {POSTED_OPTIONS.map(({ value, label }) => (
                <button key={value} onClick={() => onPostedChange(posted === value ? '' : value)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-[#FAFAFA]">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                    style={posted === value ? { borderColor: PINK, background: PINK } : { borderColor: '#D1D5DB', background: '#fff' }}>
                    {posted === value && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: posted === value ? PINK : '#374151' }}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </SheetSection>

          <SheetSection label="Salary (AED / month)">
            <div className="grid gap-0.5">
              {SALARY_OPTIONS.map(({ value, label }) => (
                <button key={value} onClick={() => onSalaryChange(salaryBucket === value ? '' : value)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-[#FAFAFA]">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                    style={salaryBucket === value ? { borderColor: PINK, background: PINK } : { borderColor: '#D1D5DB', background: '#fff' }}>
                    {salaryBucket === value && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: salaryBucket === value ? PINK : '#374151' }}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </SheetSection>

          <SheetSection label="Work Mode">
            <button
              onClick={() => onRemoteChange(!remoteOnly)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border transition-colors"
              style={remoteOnly ? { background: PINK_BG, borderColor: PINK_RING, color: PINK } : { borderColor: '#E5E7EB', color: '#374151', background: '#fff' }}
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                style={remoteOnly ? { borderColor: PINK, background: PINK } : { borderColor: '#D1D5DB', background: '#fff' }}>
                {remoteOnly && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em]">Remote UAE only</span>
            </button>
          </SheetSection>

          <SheetSection label="Sort By">
            <div className="grid gap-0.5">
              {SORT_OPTIONS.map(({ value, label }) => (
                <button key={value} onClick={() => onSortChange(value)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-[#FAFAFA]">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                    style={sortBy === value ? { borderColor: PINK, background: PINK } : { borderColor: '#D1D5DB', background: '#fff' }}>
                    {sortBy === value && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: sortBy === value ? PINK : '#374151' }}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </SheetSection>
        </div>

        <div className="shrink-0 px-5 py-4 border-t border-[#E5E7EB] bg-white flex items-center gap-3">
          {activeCount > 0 && (
            <button onClick={onClearAll} className="font-sans text-sm text-gray-400 hover:text-black transition-colors underline">
              Clear all
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 bg-slate-950 text-white font-sans text-sm font-bold py-3 rounded-lg hover:bg-slate-800 transition-colors"
          >
            {loading ? '…' : `Show ${total.toLocaleString()} roles`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── FilterDropdown ────────────────────────────────────────────────────────────
function FilterDropdown({ label, count, open, onToggle, onClose, children, noHighlight }: {
  label: string; count: number; open: boolean; noHighlight?: boolean
  onToggle: () => void; onClose: () => void; children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open, onClose])

  const isActive = !noHighlight && count > 0
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={onToggle}
        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-sans text-[13px] font-medium transition-colors"
        style={isActive
          ? { background: PINK_BG, borderColor: PINK_RING, color: PINK }
          : { background: '#fff', borderColor: '#E5E7EB', color: '#374151' }}
        onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.borderColor = '#9CA3AF'; (e.currentTarget as HTMLButtonElement).style.color = '#000' } }}
        onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLButtonElement).style.color = '#374151' } }}
      >
        {label}
        {isActive && (
          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full text-white text-[9px] font-bold leading-none" style={{ background: PINK }}>
            {count}
          </span>
        )}
        <ChevronDown size={12} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-white border border-[#E5E7EB] rounded-lg shadow-[0_4px_20px_rgba(15,23,42,0.1)] min-w-[160px]">
          {children}
        </div>
      )}
    </div>
  )
}

// ── CheckboxPanel ─────────────────────────────────────────────────────────────
function CheckboxPanel({ options, selected, onToggle }: {
  options: { value: string; label: string }[]; selected: Set<string>; onToggle: (v: string) => void
}) {
  return (
    <div className="py-1.5 max-h-[280px] overflow-y-auto">
      {options.map(({ value, label }) => (
        <label key={value} className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer hover:bg-[#FAFAFA] transition-colors group">
          <input type="checkbox" checked={selected.has(value)} onChange={() => onToggle(value)} />
          <span className="text-xs transition-colors" style={{ color: selected.has(value) ? PINK : '#374151', fontWeight: selected.has(value) ? 600 : 400 }}>{label}</span>
        </label>
      ))}
    </div>
  )
}

// ── PillPanel — multi-select ──────────────────────────────────────────────────
// 2-column grid so pills align cleanly regardless of label length.
// Uses the same mono-uppercase typographic voice as the rest of the app.
function PillPanel({ options, selected, onToggle }: {
  options: { value: string; label: string }[]; selected: Set<string>; onToggle: (v: string) => void
}) {
  return (
    <div className="p-2.5 grid grid-cols-2 gap-1.5" style={{ minWidth: 248 }}>
      {options.map(({ value, label }) => {
        const on = selected.has(value)
        return (
          <button
            key={value}
            onClick={() => onToggle(value)}
            className="flex h-8 items-center justify-center rounded-lg border font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition-colors"
            style={on
              ? { background: PINK, color: '#fff', borderColor: PINK }
              : { background: '#fff', color: '#374151', borderColor: '#E5E7EB' }}
            onMouseEnter={e => { if (!on) { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = PINK_RING; b.style.color = PINK; b.style.background = PINK_BG } }}
            onMouseLeave={e => { if (!on) { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = '#E5E7EB'; b.style.color = '#374151'; b.style.background = '#fff' } }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ── RadioPanel — single-select ────────────────────────────────────────────────
// Rendered as a styled radio list (not pills) to make the single-select
// semantics obvious and to keep a clean vertical scannable layout.
function RadioPanel({ options, selected, onSelect }: {
  options: { value: string; label: string }[]; selected: string; onSelect: (v: string) => void
}) {
  return (
    <div className="py-1.5" style={{ minWidth: 180 }}>
      {options.map(({ value, label }) => {
        const on = selected === value
        return (
          <button
            key={value}
            onClick={() => onSelect(on ? '' : value)}
            className="flex w-full items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[#FAFAFA]"
          >
            {/* Radio dot */}
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
              style={on ? { borderColor: PINK, background: PINK } : { borderColor: '#D1D5DB', background: '#fff' }}
            >
              {on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </span>
            <span
              className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] transition-colors"
              style={{ color: on ? PINK : '#374151' }}
            >
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── QuickToggle ───────────────────────────────────────────────────────────────
function QuickToggle({ active, onToggle, children }: { active: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onToggle}
      className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 font-sans text-[13px] font-medium transition-colors shrink-0"
      style={active
        ? { background: PINK, color: '#fff', borderColor: PINK }
        : { background: '#fff', color: '#374151', borderColor: '#E5E7EB' }}
    >
      {children}
    </button>
  )
}

function Sep() { return <span className="h-5 w-px bg-[#E5E7EB] shrink-0" /> }

function SheetSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-gray-400 mb-3">{label}</h3>
      {children}
    </div>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────────────
function DetailPanel({ job, onSave }: { job: Job; onSave: (id: number, e: React.MouseEvent) => void }) {
  const { user }     = useAuthStore()
  const skills       = parseSkills(job.skills)
  const salary       = money(job.salaryMin, job.salaryMax, job.salaryCurrency)
  const isGated      = !user && job.applyUrl == null && job.linkedinUrl == null
  const applyUrl     = job.applyUrl ?? job.linkedinUrl
    ?? (user ? `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(`${job.title} ${job.companyName}`)}&location=United%20Arab%20Emirates` : null)
  const half = Math.ceil(skills.length / 2)
  const emirateLabel = EMIRATES.find(e => e.value === job.emirate)?.label

  return (
    <div className="p-8 xl:p-10">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <CompanyLogo logoUrl={job.companyLogoUrl} companyName={job.companyName} size="sm" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] truncate" style={{ color: PINK }}>
              {job.companyName}{job.locationUae ? ` · ${job.locationUae}` : ''}{job.remoteUae ? ' · Remote' : ''}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-black leading-tight">{job.title}</h1>
        </div>
        <div className="flex gap-2 shrink-0 mt-1">
          {isGated ? (
            <Link to="/login" state={{ from: `/jobs/${job.id}` }}
              className="inline-flex items-center gap-2 text-white font-sans text-sm font-bold px-5 py-2.5 rounded-lg transition-colors"
              style={{ background: PINK }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = PINK_HOV}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = PINK}
            >
              Sign in to apply
            </Link>
          ) : (
            <a href={applyUrl!} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white font-sans text-sm font-bold px-5 py-2.5 rounded-lg transition-colors"
              style={{ background: PINK }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = PINK_HOV}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = PINK}
            >
              <ExternalLink size={14} /> Apply Now
            </a>
          )}
          <button onClick={(e) => onSave(job.id, e)}
            className="border border-[#E5E7EB] rounded-lg p-2.5 hover:bg-gray-50 transition-colors" aria-label="Save job">
            <Bookmark size={16} />
          </button>
        </div>
      </div>

      {/* Pills — location + level first, salary only if present */}
      <div className="flex flex-wrap gap-2 mb-8">
        {/* Location */}
        {(emirateLabel || job.locationUae) && (
          <InfoPill loc>
            <MapPin size={11} />
            {emirateLabel ?? job.locationUae}
          </InfoPill>
        )}
        {/* Experience level */}
        {job.experienceLevel && <InfoPill accent>{labelize(job.experienceLevel)}</InfoPill>}
        {/* Job type */}
        {job.jobType && <InfoPill>{labelize(job.jobType)}</InfoPill>}
        {/* Salary — secondary */}
        {salary && <InfoPill sal>{salary}</InfoPill>}
        {/* Badges */}
        {(job.visaType === 'free_visa' || job.visaType === 'employment_visa') && <InfoPill>Visa Provided</InfoPill>}
        {job.visaType === 'own_visa' && <InfoPill>Own Visa Required</InfoPill>}
        {job.visaType === 'visit_visa_accepted' && <InfoPill>Visit Visa OK</InfoPill>}
        {job.immediateJoiner && <InfoPill><Zap size={10} /> Immediate Joiner</InfoPill>}
        {job.remoteUae && <InfoPill>Remote UAE</InfoPill>}
      </div>

      {skills.length > 0 && (
        <>
          <DSection>Core Stack</DSection>
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

      <JobDescriptionBlock job={job} />

      <div className="mt-10 pt-6 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-gray-400 font-mono">
        <div className="flex items-center gap-4">
          {job.createdAt && <span className="flex items-center gap-1.5"><CalendarDays size={12} />{relativeTime(job.createdAt)}</span>}
          {job.locationUae && <span className="flex items-center gap-1.5"><MapPin size={12} />{job.locationUae}</span>}
          {job.jobType && <span className="flex items-center gap-1.5"><BriefcaseBusiness size={12} />{labelize(job.jobType)}</span>}
        </div>
        <Link to={`/jobs?q=${encodeURIComponent(job.companyName ?? '')}`} className="hover:underline" style={{ color: PINK }}>
          More from {job.companyName} →
        </Link>
      </div>
    </div>
  )
}

// ── JobListItem — memoized so filter changes don't re-render unchanged cards ──
const JobListItem = memo(function JobListItem({
  job, active, onClick,
}: { job: Job; active: boolean; onClick: (j: Job) => void }) {
  const sal          = money(job.salaryMin, job.salaryMax, job.salaryCurrency)
  const skills       = parseSkills(job.skills).slice(0, 3)
  const emirateLabel = EMIRATES.find(e => e.value === job.emirate)?.label
  const metaFallback = [emirateLabel, job.experienceLevel ? labelize(job.experienceLevel) : null].filter(Boolean).join(' · ')

  return (
    <button
      onClick={() => onClick(job)}
      className="relative w-full text-left px-4 py-5 transition-colors"
      style={{ background: active ? PINK_BG : undefined }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = '#FAFAFA' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = '' }}
    >
      {active && <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: PINK }} />}
      <div className="flex items-center gap-2 mb-2">
        <CompanyLogo logoUrl={job.companyLogoUrl} companyName={job.companyName} size="sm" className="shrink-0" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest truncate" style={{ color: active ? PINK : '#9CA3AF' }}>
          {job.companyName}
        </span>
        <span className="ml-auto font-mono text-[10px] text-gray-400 shrink-0">{relativeTime(job.createdAt)}</span>
      </div>
      <p className="font-bold text-sm text-black leading-snug mb-2.5">{job.title}</p>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-gray-500 truncate">
          {skills.length ? skills.join(', ') : (job.locationUae ?? 'UAE')}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {job.remoteUae && (
            <span className="font-mono text-[9px] uppercase tracking-wider font-bold" style={{ color: PINK }}>Remote</span>
          )}
          {job.immediateJoiner && (
            <span className="font-mono text-[9px] uppercase tracking-wider text-amber-600 font-bold">Now</span>
          )}
          {sal
            ? <span className="font-mono text-[11px] font-bold" style={{ color: active ? PINK : '#000' }}>{sal}</span>
            : metaFallback
              ? <span className="font-mono text-[10px] text-gray-400 truncate max-w-[130px]">{metaFallback}</span>
              : null
          }
        </div>
      </div>
    </button>
  )
})

function InfoPill({ children, accent, loc, sal }: { children: React.ReactNode; accent?: boolean; loc?: boolean; sal?: boolean }) {
  const cls = accent
    ? { background: PINK_BG, borderColor: PINK_RING, color: PINK }
    : loc
      ? { background: '#F1F5F9', borderColor: '#E2E8F0', color: '#475569' }
      : sal
        ? { background: '#ECFDF5', borderColor: '#A7F3D0', color: '#065F46' }
        : { background: '#F3F4F6', borderColor: '#E5E7EB', color: '#000' }
  return (
    <span className="inline-flex items-center gap-1.5 border px-3 py-1.5 font-mono text-xs font-semibold rounded-md" style={cls}>
      {children}
    </span>
  )
}

function DSection({ children }: { children: React.ReactNode }) {
  return <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-black mb-3 pb-2 border-b border-[#E5E7EB]">{children}</h2>
}

function JobDescriptionBlock({ job }: { job: Job }) {
  if (job.descriptionHtml?.trim()) return (<><DSection>About the Role</DSection><div className="prose-job" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(job.descriptionHtml) }} /></>)
  let sections: { heading: string; items: string[] }[] = []
  if (job.descriptionSections) {
    try {
      const p = JSON.parse(job.descriptionSections)
      if (Array.isArray(p)) sections = p.filter(s => s && typeof s.heading === 'string' && Array.isArray(s.items))
    } catch { /* */ }
  }
  if (sections.length > 0) {
    return (
      <div className="space-y-8">
        {sections.map(s => (
          <div key={s.heading}>
            <DSection>{s.heading}</DSection>
            {s.items.length === 1 ? <p className="prose-job">{s.items[0]}</p> : (
              <ul className="space-y-3">
                {s.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
                    <span className="font-mono font-bold mt-0.5 shrink-0" style={{ color: PINK }}>→</span>{item}
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
      <div><DSection>About the Role</DSection><p className="prose-job">{job.description}</p></div>
      {job.requirements && <div><DSection>Requirements</DSection><p className="prose-job">{job.requirements}</p></div>}
    </div>
  )
}
