import DOMPurify from 'dompurify'
import {
  Bell,
  Bookmark,
  BookmarkCheck,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  ExternalLink,
  Laptop,
  MapPin,
  Pencil,
  Search,
  SlidersHorizontal,
  X,
  Zap,
} from 'lucide-react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CompanyLogo } from '../../components/CompanyLogo'
import { FullPostingNotice } from '../../components/FullPostingNotice'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { errorMessage, jobsApi, seekerApi, type FilterMultiParams, type SavedSearch } from '../../services/api'

// ── Publisher type ────────────────────────────────────────────────────────────
type Publisher = { key: string; label: string; count: number }
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../components/Toast'
import { JOB_CATEGORIES } from '../../types'
import type { Emirate, Job, JobCategory } from '../../types'
import { isThinDescription, labelize, money, parseSkills, relativeTime } from '../../utils/format'
import { isSafeUrl } from '../../utils/url'

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

// "Newest first" isn't listed as a pickable option — it's already the
// backend's default sort, so having a redundant explicit entry for it would
// just be more clutter for the same outcome.
const SORT_OPTIONS = [
  { value: 'oldest',      label: 'Oldest first'   },
  { value: 'salary_high', label: 'Salary: High ↓' },
  { value: 'salary_low',  label: 'Salary: Low ↑'  },
]

// Frontend sort option -> backend `sort` query param. 'newest' is the
// backend's own default (sent as no param at all — see below) so it isn't
// listed here.
const SORT_PARAM: Record<string, string> = {
  oldest:      'date_asc',
  salary_high: 'salary_desc',
  salary_low:  'salary_asc',
}

type PanelId = 'emirate' | 'stack' | 'type' | 'posted' | 'sort' | 'source' | 'saved'

// Static fallback shown instantly while the dynamic list loads.
// Replaced by the live /jobs/publishers response once it arrives.
const SOURCE_FALLBACK: Publisher[] = [
  { key: 'linkedin',   label: 'LinkedIn',   count: 0 },
  { key: 'indeed',     label: 'Indeed',     count: 0 },
  { key: 'gulftalent', label: 'GulfTalent', count: 0 },
  { key: 'bebee',      label: 'BeBee',      count: 0 },
]

// Brand colours
const PINK      = 'var(--accent)'
const PINK_BG   = 'var(--accent-soft)'
const PINK_RING = 'var(--accent-ring)'
const PINK_FILL = 'var(--accent-fill)'      // solid fills that carry white text
const PINK_FILL_HOV = 'var(--accent-fill-hover)'

function toggleSet<T>(set: Set<T>, v: T): Set<T> {
  const n = new Set(set)
  if (n.has(v)) { n.delete(v) } else { n.add(v) }
  return n
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
  const [searchParams, setSearchParams] = useSearchParams()

  // filter state — initialised from URL so bookmarks and shared links restore the full view
  const [query,           setQuery]          = useState(() => searchParams.get('q') ?? '')
  // The fetch effect below uses this, not `query` directly — otherwise every
  // keystroke fired its own request against a backend limited to 10 req/min,
  // and a user typing a normal search term would hit "Rate limit exceeded"
  // mid-search. `query` itself still drives the input and the URL sync
  // immediately so typing feels responsive.
  const [debouncedQuery,  setDebouncedQuery]  = useState(query)
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 250)
    return () => window.clearTimeout(id)
  }, [query])
  const [company,         setCompany]        = useState(() => searchParams.get('company') ?? '')
  const [emirates,        setEmirates]       = useState<Set<Emirate>>(() => new Set(searchParams.getAll('emirate') as Emirate[]))
  const [jobCats,         setJobCats]        = useState<Set<JobCategory>>(() => new Set(searchParams.getAll('category') as JobCategory[]))
  const [jobTypes,        setJobTypes]       = useState<Set<string>>(() => new Set(searchParams.getAll('jobType')))
  const [posted,          setPosted]         = useState(() => searchParams.get('posted') ?? '')
  const [sortBy,          setSortBy]         = useState(() => searchParams.get('sort') ?? 'newest')
  const [sources,         setSources]        = useState<Set<string>>(() => new Set(searchParams.getAll('publisher')))
  // Kept as the same 'linkedin=easy' URL param used before this was simplified
  // from a dropdown to a toggle, so old bookmarks/saved searches keep working.
  const [easyApplyOnly,   setEasyApplyOnly]   = useState(() => searchParams.get('linkedin') === 'easy')
  const [remoteOnly,      setRemoteOnly]      = useState(() => searchParams.get('remote') === '1')
  const [nudgeHidden,     setNudgeHidden]     = useState(() => {
    try { return localStorage.getItem('uaeitjobs.browseNudge') === '1' } catch { return false }
  })

  // dynamic publisher list — loaded once, falls back to static list while fetching
  const [publishers, setPublishers] = useState<Publisher[]>(SOURCE_FALLBACK)
  useEffect(() => {
    jobsApi.publishers()
      .then(({ data }) => { if (data.length > 0) setPublishers(data) })
      .catch(() => {}) // graceful — static fallback stays in place
  }, [])

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

  // saved job IDs — optimistically maintained; loaded once when user logs in
  const [savedIds, setSavedIds]   = useState<Set<number>>(new Set())
  const savedIdsRef               = useRef<Set<number>>(new Set())
  useEffect(() => { savedIdsRef.current = savedIds }, [savedIds])

  // applied job IDs — read-only; loaded once when user logs in
  const [appliedIds, setAppliedIds] = useState<Set<number>>(new Set())

  // saved searches — job seekers only, same gating as saved/applied jobs below
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [savingSearch,  setSavingSearch]  = useState(false)
  const [searchName,    setSearchName]    = useState('')
  const [renamingId,    setRenamingId]    = useState<number | null>(null)
  const [renameValue,   setRenameValue]   = useState('')

  // Sync filter state → URL (replace so individual filter toggles don't pile up in history).
  // Initialised from URL above so bookmarks/shared links restore the exact view.
  useEffect(() => {
    const p = new URLSearchParams()
    if (query.trim())       p.set('q',         query.trim())
    if (company.trim())     p.set('company',   company.trim())
    emirates.forEach(e      => p.append('emirate',  e))
    jobCats.forEach(c       => p.append('category', c))
    jobTypes.forEach(t      => p.append('jobType',  t))
    if (posted)             p.set('posted',    posted)
    if (sortBy !== 'newest') p.set('sort',     sortBy)
    sources.forEach(s       => p.append('publisher', s))
    if (easyApplyOnly)       p.set('linkedin', 'easy')
    if (remoteOnly)          p.set('remote',    '1')
    setSearchParams(p, { replace: true })
  }, [query, company, emirates, jobCats, jobTypes, posted, sortBy, sources, easyApplyOnly, remoteOnly, setSearchParams])

  // fetch — search + all filtering in a single DB round-trip via filterMulti.
  // The 'q' param drives plainto_tsquery full-text ranking server-side so
  // results are never silently cropped by the 80-row page cap.
  useEffect(() => {
    let ok = true
    setJobsLoading(true)

    const eArr = Array.from(emirates)
    const cArr = Array.from(jobCats)
    const tArr = Array.from(jobTypes)
    const sArr = Array.from(sources)

    const params: FilterMultiParams = {
      page: 0, size: 80,
      ...(debouncedQuery.trim() && { q:              debouncedQuery.trim() }),
      ...(company.trim()        && { company:        company.trim() }),
      ...(eArr.length           && { emirate:         eArr }),
      ...(cArr.length           && { category:        cArr }),
      ...(tArr.length           && { jobType:         tArr }),
      ...(posted                && { postedAfter:     new Date(Date.now() - postedAfterMs(posted)).toISOString() }),
      ...(sortBy !== 'newest'   && { sort:            SORT_PARAM[sortBy] }),
      ...(sArr.length           && { publisher:       sArr }),
      ...(easyApplyOnly         && { linkedinEasyApply: true }),
      ...(remoteOnly            && { remoteUae:       true }),
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
  }, [debouncedQuery, company, emirates, jobCats, jobTypes, posted, sortBy, sources, easyApplyOnly, remoteOnly])

  useEffect(() => {
    if (!selectedId) return
    let ok = true
    setDetailLoading(true)
    jobsApi.detail(String(selectedId))
      .then(({ data }) => {
        // Selecting job B while job A's request is still in flight must not
        // let A's late response overwrite B's — without this guard, whichever
        // request resolves last wins regardless of which job is selected now.
        if (!ok) return
        setDetail(data)
        detailRef.current?.scrollTo(0, 0)
      })
      .catch(() => {}).finally(() => { if (ok) setDetailLoading(false) })
    return () => { ok = false }
  }, [selectedId])

  // Load saved + applied job IDs — job seekers only.
  // HR and admin users do not have these lists; calling the endpoints as
  // an HR user returns 401/403 which would incorrectly trigger the refresh
  // interceptor and produce a spurious "Session expired" toast.
  useEffect(() => {
    if (!user || user.userType !== 'job_seeker') {
      setSavedIds(new Set())
      setAppliedIds(new Set())
      setSavedSearches([])
      return
    }
    seekerApi.savedJobs()
      .then(({ data }) => setSavedIds(new Set(data.map(s => s.job.id))))
      .catch(() => {})
    seekerApi.appliedJobIds()
      .then(({ data }) => setAppliedIds(new Set(data)))
      .catch(() => {})
    seekerApi.savedSearches()
      .then(({ data }) => setSavedSearches(data))
      .catch(() => {})
  }, [user])

  // Applying a saved search is a full navigation, not a state update — filter
  // state above is only ever initialised from the URL once on mount (so
  // bookmarks/shared links restore correctly), it doesn't re-sync if the URL
  // changes later. A hard navigation guarantees every filter actually updates
  // rather than silently applying only some of them.
  const applySavedSearch = useCallback((filters: string) => {
    window.location.assign(`/jobs?${filters}`)
  }, [])

  const saveCurrentSearch = useCallback(async () => {
    const name = searchName.trim()
    if (!name) return
    try {
      const { data } = await seekerApi.saveSearch(name, searchParams.toString())
      setSavedSearches(prev => [data, ...prev])
      setSearchName('')
      setSavingSearch(false)
      toast({ type: 'success', title: 'Search saved' })
    } catch (err) {
      toast({ type: 'error', title: 'Could not save search', message: errorMessage(err) })
    }
  }, [searchName, searchParams, toast])

  const deleteSavedSearch = useCallback(async (id: number) => {
    const prev = savedSearches
    setSavedSearches(s => s.filter(x => x.id !== id))
    try {
      await seekerApi.deleteSearch(id)
    } catch (err) {
      setSavedSearches(prev)
      toast({ type: 'error', title: 'Could not remove', message: errorMessage(err) })
    }
  }, [savedSearches, toast])

  const startRenaming = useCallback((id: number, currentName: string) => {
    setRenamingId(id)
    setRenameValue(currentName)
  }, [])

  const commitRename = useCallback(async () => {
    const id = renamingId
    if (id == null) return
    const name = renameValue.trim()
    const target = savedSearches.find(s => s.id === id)
    if (!name || !target || name === target.name) { setRenamingId(null); return }
    const prev = savedSearches
    setSavedSearches(s => s.map(x => x.id === id ? { ...x, name } : x))
    setRenamingId(null)
    try {
      await seekerApi.updateSearch(id, name, target.filters)
    } catch (err) {
      setSavedSearches(prev)
      toast({ type: 'error', title: 'Could not rename', message: errorMessage(err) })
    }
  }, [renamingId, renameValue, savedSearches, toast])

  function clearAll() {
    setQuery(''); setCompany(''); setEmirates(new Set()); setJobCats(new Set())
    setJobTypes(new Set())
    setPosted(''); setSortBy('newest'); setSources(new Set())
    setEasyApplyOnly(false); setRemoteOnly(false)
  }

  const saveJob = useCallback(async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) { toast({ type: 'info', title: 'Sign in to save jobs' }); return }
    // Only job seekers can save jobs — HR / admin users have no saved-jobs list.
    if (user.userType !== 'job_seeker') return
    const wasSaved = savedIdsRef.current.has(id)
    // Optimistic update
    setSavedIds(prev => { const n = new Set(prev); if (wasSaved) n.delete(id); else n.add(id); return n })
    try {
      if (wasSaved) { await seekerApi.unsaveJob(id); toast({ type: 'success', title: 'Removed from saved' }) }
      else          { await seekerApi.saveJob(id);   toast({ type: 'success', title: 'Saved' }) }
    } catch (err) {
      // Revert on failure
      setSavedIds(prev => { const n = new Set(prev); if (wasSaved) n.add(id); else n.delete(id); return n })
      toast({ type: 'error', title: 'Could not save', message: errorMessage(err) })
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleJobClick(job: Job) {
    if (window.innerWidth < 768) { navigate(`/jobs/${job.id}`) }
    else { setSelectedId(job.id) }
  }

  // active chips
  const chips: { key: string; label: string; onRemove: () => void }[] = [
    ...(company.trim() ? [{ key: 'co', label: company.trim(), onRemove: () => setCompany('') }] : []),
    ...Array.from(emirates).map(v => ({ key: `e-${v}`, label: EMIRATES.find(x => x.value === v)?.label ?? v, onRemove: () => setEmirates(toggleSet(emirates, v)) })),
    ...Array.from(jobCats).map(v  => ({ key: `c-${v}`, label: JOB_CATEGORIES.find(x => x.value === v)?.label ?? v, onRemove: () => setJobCats(toggleSet(jobCats, v)) })),
    ...Array.from(jobTypes).map(v => ({ key: `t-${v}`, label: JOB_TYPES.find(x => x.value === v)?.label ?? v,      onRemove: () => setJobTypes(toggleSet(jobTypes, v)) })),
    ...Array.from(sources).map(v  => ({ key: `s-${v}`, label: publishers.find(p => p.key === v)?.label ?? v, onRemove: () => setSources(toggleSet(sources, v)) })),
    ...(posted       ? [{ key: 'posted', label: POSTED_OPTIONS.find(x => x.value === posted)?.label  ?? posted,  onRemove: () => setPosted('')  }] : []),
    ...(easyApplyOnly ? [{ key: 'ea', label: 'Easy Apply', onRemove: () => setEasyApplyOnly(false) }] : []),
    ...(remoteOnly    ? [{ key: 'remote', label: 'Remote UAE', onRemove: () => setRemoteOnly(false) }] : []),
  ]

  const newestAgo = jobs.length ? relativeTime(jobs[0].postedAt ?? jobs[0].createdAt) : ''

  function dismissNudge() {
    setNudgeHidden(true)
    try { localStorage.setItem('uaeitjobs.browseNudge', '1') } catch { /* storage blocked — hides for this visit only */ }
  }

  const activeCount = chips.length
  const hasFilters  = activeCount > 0

  const fp = {
    query, onQueryChange: setQuery,
    emirates, onEmiratesChange: setEmirates,
    jobCats, onJobCatsChange: setJobCats,
    jobTypes, onJobTypesChange: setJobTypes,
    posted, onPostedChange: setPosted,
    sortBy, onSortChange: setSortBy,
    sources, onSourcesChange: setSources,
    easyApplyOnly, onEasyApplyOnlyChange: setEasyApplyOnly,
    remoteOnly, onRemoteOnlyChange: setRemoteOnly,
    publishers,
    chips, activeCount, total, loading: jobsLoading,
    onClearAll: clearAll, hasFilters,
    isJobSeeker: !!user && user.userType === 'job_seeker',
    savedSearches, applySavedSearch, deleteSavedSearch,
    savingSearch, setSavingSearch, searchName, setSearchName, saveCurrentSearch,
    renamingId, renameValue, setRenameValue, startRenaming, commitRename, cancelRename: () => setRenamingId(null),
  }

  return (
    /* 100vh on mobile measures the browser's collapsed-address-bar viewport,
       not what's actually visible — so this panel rendered taller than the
       real screen and the outer page could scroll, revealing the site
       footer underneath what's meant to be a fixed, internally-scrolling
       view. 100dvh tracks the real visible viewport as the address bar
       shows/hides. */
    <div className="flex flex-col bg-white h-[calc(100dvh-57px)]">
      <h1 className="sr-only">Browse UAE IT roles</h1>

      {/* ── Filter bar ─────────────────────────────────────────── */}
      <FilterBar {...fp} onMobileOpen={() => setMobileOpen(true)} />

      {/* ── Panels (centred, same max width as the header) ─────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="mx-auto flex w-full max-w-7xl overflow-hidden min-h-0 md:px-6 lg:px-8">

          {/* Job list */}
          <aside className="w-full md:w-[380px] xl:w-[420px] shrink-0 flex flex-col border-r border-[var(--border)]">
            <div className="px-4 py-2.5 border-b border-[var(--border)] shrink-0 flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold text-black" aria-live="polite">
                {jobsLoading ? '…' : `${total.toLocaleString()} ${total === 1 ? 'role' : 'roles'}`}
                {!jobsLoading && hasFilters && (
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-wider" style={{ color: PINK }}>filtered</span>
                )}
              </span>
              {!jobsLoading && newestAgo && sortBy === 'newest' && (
                <span className="font-mono text-[10px] text-gray-400">Newest {newestAgo}</span>
              )}
            </div>

            {!user && !nudgeHidden && !jobsLoading && jobs.length > 0 && (
              <div className="flex shrink-0 items-start gap-2.5 border-b border-[var(--border)] px-4 py-2.5" style={{ background: PINK_BG }}>
                <Bell size={13} className="mt-[3px] shrink-0" style={{ color: PINK }} />
                <p className="min-w-0 flex-1 text-[12px] leading-5 text-gray-600">
                  <Link to="/register" className="font-semibold hover:underline" style={{ color: PINK }}>Create a free profile</Link>
                  {' '}to save roles and track your applications.
                </p>
                <button onClick={dismissNudge} aria-label="Dismiss" className="shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-700">
                  <X size={12} />
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              <div className="h-2" />
              {jobsLoading ? (
                <div className="divide-y divide-[var(--border)]">
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
                  <p className="text-sm font-semibold text-black">No roles match these filters</p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">Try removing a filter or searching a broader skill, for example “developer” instead of a framework.</p>
                  {hasFilters && (
                    <button onClick={clearAll} className="mt-4 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors hover:bg-[var(--accent-soft)]" style={{ borderColor: PINK_RING, color: PINK }}>
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {jobs.map(job => (
                    <JobListItem
                      key={job.id}
                      job={job}
                      active={job.id === selectedId}
                      isSaved={savedIds.has(job.id)}
                      isApplied={appliedIds.has(job.id)}
                      onSave={saveJob}
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
              <div className="mx-auto max-w-3xl p-10 space-y-4">
                <div className="h-3 w-32 shimmer" /><div className="h-8 w-3/4 shimmer" />
                <div className="h-3 w-1/2 shimmer" /><div className="h-24 shimmer mt-6" />
              </div>
            ) : detail ? (
              <DetailPanel
            job={detail}
            onSave={saveJob}
            isSaved={savedIds.has(detail.id)}
            isApplied={appliedIds.has(detail.id)}
            onApply={(id) => setAppliedIds(prev => new Set([...prev, id]))}
          />
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
  jobTypes: Set<string>;     onJobTypesChange: (s: Set<string>) => void
  posted: string;            onPostedChange: (v: string) => void
  sortBy: string;            onSortChange: (v: string) => void
  sources: Set<string>;      onSourcesChange: (s: Set<string>) => void
  easyApplyOnly: boolean;    onEasyApplyOnlyChange: (v: boolean) => void
  remoteOnly: boolean;       onRemoteOnlyChange: (v: boolean) => void
  publishers: Publisher[]
  chips: { key: string; label: string; onRemove: () => void }[]
  activeCount: number; hasFilters: boolean
  total: number; loading: boolean; onClearAll: () => void
}

interface SavedSearchProps {
  isJobSeeker: boolean
  savedSearches: SavedSearch[]
  applySavedSearch: (filters: string) => void
  deleteSavedSearch: (id: number) => void
  savingSearch: boolean; setSavingSearch: (v: boolean) => void
  searchName: string; setSearchName: (v: string) => void
  saveCurrentSearch: () => void
  renamingId: number | null; renameValue: string; setRenameValue: (v: string) => void
  startRenaming: (id: number, currentName: string) => void
  commitRename: () => void
  cancelRename: () => void
}

// ── Filter bar (desktop) ──────────────────────────────────────────────────────
function FilterBar(props: SharedFilterProps & SavedSearchProps & { onMobileOpen: () => void }) {
  const {
    query, onQueryChange,
    emirates, onEmiratesChange, jobCats, onJobCatsChange,
    jobTypes, onJobTypesChange,
    posted, onPostedChange,
    sortBy, onSortChange,
    sources, onSourcesChange, publishers,
    easyApplyOnly, onEasyApplyOnlyChange,
    remoteOnly, onRemoteOnlyChange,
    chips, activeCount, hasFilters,
    onClearAll, onMobileOpen,
    isJobSeeker, savedSearches, applySavedSearch, deleteSavedSearch,
    savingSearch, setSavingSearch, searchName, setSearchName, saveCurrentSearch,
    renamingId, renameValue, setRenameValue, startRenaming, commitRename, cancelRename,
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

  // Reset the inline "name this search" input whenever the Saved dropdown
  // isn't open, so reopening it never shows a stale in-progress name.
  useEffect(() => {
    if (openPanel !== 'saved') { setSavingSearch(false); setSearchName('') }
  }, [openPanel]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="shrink-0 z-20 bg-white" style={{ boxShadow: '0 1px 0 0 var(--border)' }}>

      {/* ── Search row ───────────────────────────────────────────── */}
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2.5 px-4 pt-3.5 pb-3 sm:px-6 lg:px-8">

        {/* Search input */}
        <div className="relative flex-1 md:mx-auto md:max-w-[560px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            placeholder="Search roles, skills, companies…"
            className="h-[38px] w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-9 text-[13.5px] text-gray-900 placeholder:text-gray-400 transition-all outline-none focus:bg-white focus:border-gray-300"
            onFocus={e => {
              e.currentTarget.style.borderColor = PINK
              e.currentTarget.style.boxShadow = `0 0 0 3px color-mix(in srgb, var(--accent) 10%, transparent)`
              e.currentTarget.style.background = 'var(--surface)'
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.boxShadow = ''
              e.currentTarget.style.background = 'var(--surface-2)'
            }}
          />
          {query && (
            <button
              onClick={() => onQueryChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Mobile: filters pill */}
        <button
          onClick={onMobileOpen}
          className="md:hidden inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 font-sans text-[13px] font-medium transition-all"
          style={activeCount > 0
            ? { background: PINK_BG, borderColor: PINK_RING, color: PINK }
            : { borderColor: 'var(--border)', color: '#4b5563', background: 'var(--surface-2)' }}
        >
          <SlidersHorizontal size={13} />
          Filters
          {activeCount > 0 && (
            <span className="inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white leading-none" style={{ background: PINK_FILL }}>
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Filter row (desktop only) ─────────────────────────────────────────
           overflow must NOT be set here — it would clip the absolutely-positioned
           dropdown panels. Centering is via justify-center on the inner flex row. */}
      <div className="hidden md:block border-t border-gray-100 py-2">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-x-1.5 gap-y-2 px-6 lg:px-8">

          {/* Source leads the bar — which job board a listing came from. */}
          <FilterDropdown label="Source"   count={sources.size}         open={openPanel === 'source'}  onToggle={() => tog('source')}  onClose={close}>
            <CheckboxPanel
              options={publishers.map(p => ({ value: p.key, label: p.count > 0 ? `${p.label} (${p.count})` : p.label }))}
              selected={sources}
              onToggle={v => onSourcesChange(toggleSet(sources, v))}
            />
          </FilterDropdown>

          <FilterDropdown label="Stack"    count={jobCats.size}         open={openPanel === 'stack'}   onToggle={() => tog('stack')}   onClose={close}>
            <CheckboxPanel options={JOB_CATEGORIES.map(c => ({ value: c.value, label: c.label }))} selected={jobCats as Set<string>} onToggle={v => onJobCatsChange(toggleSet(jobCats, v as JobCategory))} />
          </FilterDropdown>

          <FilterDropdown label="Emirate"  count={emirates.size}        open={openPanel === 'emirate'} onToggle={() => tog('emirate')} onClose={close}>
            <CheckboxPanel options={EMIRATES} selected={emirates as Set<string>} onToggle={v => onEmiratesChange(toggleSet(emirates, v as Emirate))} />
          </FilterDropdown>

          <FilterDropdown label="Job Type" count={jobTypes.size}        open={openPanel === 'type'}    onToggle={() => tog('type')}    onClose={close}>
            <CheckboxPanel options={JOB_TYPES} selected={jobTypes} onToggle={v => onJobTypesChange(toggleSet(jobTypes, v))} />
          </FilterDropdown>

          <Sep />

          <FilterDropdown label="Posted"   count={posted ? 1 : 0}       open={openPanel === 'posted'}  onToggle={() => tog('posted')}  onClose={close}>
            <RadioPanel options={POSTED_OPTIONS} selected={posted} onSelect={v => { onPostedChange(v); close() }} />
          </FilterDropdown>

          <QuickToggle on={remoteOnly} onToggle={() => onRemoteOnlyChange(!remoteOnly)} title="Roles you can do remotely from the UAE">
            <Laptop size={12} strokeWidth={2.5} /> Remote
          </QuickToggle>
          <QuickToggle on={easyApplyOnly} onToggle={() => onEasyApplyOnlyChange(!easyApplyOnly)} title="Jobs where the candidate can apply without leaving the source site">
            <Zap size={11} strokeWidth={2.5} /> Easy Apply
          </QuickToggle>

          <Sep />

          {/* Sort */}
          <FilterDropdown
            label={SORT_OPTIONS.find(s => s.value === sortBy)?.label ?? 'Sort'}
            count={0} noHighlight
            open={openPanel === 'sort'} onToggle={() => tog('sort')} onClose={close}
          >
            <RadioPanel options={SORT_OPTIONS} selected={sortBy} onSelect={v => { onSortChange(v); close() }} />
          </FilterDropdown>

          {isJobSeeker && (
            <FilterDropdown
              label="Saved" count={savedSearches.length} noHighlight
              open={openPanel === 'saved'} onToggle={() => tog('saved')} onClose={close}
            >
              <div className="w-[240px]">
                <div className="border-b border-gray-100 p-2.5">
                  {savingSearch ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        value={searchName}
                        onChange={e => setSearchName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveCurrentSearch(); if (e.key === 'Escape') setSavingSearch(false) }}
                        placeholder="Name this search…"
                        maxLength={100}
                        className="min-w-0 flex-1 rounded-md border border-gray-200 px-2 py-1 font-sans text-[12.5px] outline-none focus:border-gray-400"
                      />
                      <button
                        onClick={saveCurrentSearch}
                        disabled={!searchName.trim()}
                        className="shrink-0 rounded-md px-2 py-1 font-sans text-[12px] font-medium text-white disabled:opacity-40"
                        style={{ background: PINK_FILL }}
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSavingSearch(true)}
                      disabled={!hasFilters}
                      className="flex w-full items-center gap-1.5 font-sans text-[12.5px] font-medium disabled:cursor-not-allowed disabled:text-gray-300 enabled:hover:opacity-80"
                      style={hasFilters ? { color: PINK } : undefined}
                    >
                      <BookmarkCheck size={13} />
                      Save current search
                    </button>
                  )}
                </div>
                {savedSearches.length === 0 ? (
                  <p className="px-3.5 py-3 font-sans text-[12px] text-gray-400">No saved searches yet.</p>
                ) : (
                  <div className="max-h-[240px] overflow-y-auto py-1">
                    {savedSearches.map(s => (
                      <div key={s.id} className="group flex items-center gap-1 px-2.5 py-1">
                        {renamingId === s.id ? (
                          <>
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={e => setRenameValue(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') cancelRename() }}
                              onBlur={commitRename}
                              maxLength={100}
                              className="min-w-0 flex-1 rounded-md border border-gray-200 px-1.5 py-1 font-sans text-[12.5px] outline-none focus:border-gray-400"
                            />
                            <button
                              // onMouseDown (not onClick) fires before the input's onBlur commits the rename,
                              // so this reads as a deliberate confirm rather than a lost click on a vanished button.
                              onMouseDown={e => { e.preventDefault(); commitRename() }}
                              className="shrink-0 rounded p-1 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600"
                              aria-label="Save name"
                            >
                              <Check size={11} strokeWidth={2.5} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => applySavedSearch(s.filters)}
                              className="min-w-0 flex-1 truncate rounded-md px-1.5 py-1.5 text-left font-sans text-[12.5px] text-gray-700 hover:bg-gray-50"
                            >
                              {s.name}
                            </button>
                            <button
                              onClick={() => startRenaming(s.id, s.name)}
                              className="shrink-0 rounded p-1 text-gray-300 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
                              aria-label={`Rename "${s.name}"`}
                            >
                              <Pencil size={11} strokeWidth={2.5} />
                            </button>
                            <button
                              onClick={() => deleteSavedSearch(s.id)}
                              className="shrink-0 rounded p-1 text-gray-300 opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                              aria-label={`Remove "${s.name}"`}
                            >
                              <X size={11} strokeWidth={2.5} />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FilterDropdown>
          )}

          <button
            onClick={onClearAll}
            disabled={!hasFilters}
            className="ml-0.5 shrink-0 inline-flex h-[30px] items-center gap-1 rounded-full px-3 font-sans text-[11.5px] font-medium transition-all disabled:cursor-not-allowed disabled:text-gray-300 text-gray-400 hover:enabled:text-rose-500 hover:enabled:bg-rose-50"
          >
            <X size={10} strokeWidth={2.5} />
            Clear
          </button>
        </div>
      </div>

      {/* ── Active filter chips ───────────────────────────────────────────────── */}
      {chips.length > 0 && (
        <div className="border-t border-gray-100 bg-gray-50/70">
         <div className="mx-auto flex w-full max-w-7xl items-center gap-1.5 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8 scrollbar-none">
          {chips.map(chip => (
            <button
              key={chip.key}
              onClick={chip.onRemove}
              aria-label={`Remove filter: ${chip.label}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 font-sans text-[11.5px] font-medium transition-all hover:opacity-70"
              style={{ background: PINK_BG, border: `1px solid ${PINK_RING}`, color: PINK }}
            >
              {chip.label}
              <X size={9} strokeWidth={3} />
            </button>
          ))}
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
    jobTypes, onJobTypesChange,
    posted, onPostedChange,
    sortBy, onSortChange,
    sources, onSourcesChange, publishers,
    easyApplyOnly, onEasyApplyOnlyChange,
    remoteOnly, onRemoteOnlyChange,
    total, loading, onClearAll, activeCount,
  } = props

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl">

        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
          <span className="font-sans text-sm font-semibold">Filters</span>
          <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-7">

          <SheetSection label="Work location">
            <div className="grid gap-0.5">
              <SheetToggle on={remoteOnly} onToggle={() => onRemoteOnlyChange(!remoteOnly)}>Remote UAE</SheetToggle>
            </div>
          </SheetSection>

          <SheetSection label="Source">
            <div className="flex flex-wrap gap-2">
              {publishers.map(({ key, label, count }) => {
                const on = sources.has(key)
                return (
                  <button key={key}
                    onClick={() => onSourcesChange(toggleSet(sources, key))}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-all"
                    style={on ? { background: PINK_BG, borderColor: PINK_RING, color: PINK } : { borderColor: 'var(--border)', color: 'var(--text-body)', background: 'var(--surface)' }}>
                    {label}
                    {count > 0 && <span className="text-[11px] font-normal" style={{ color: on ? PINK : '#9ca3af' }}>({count})</span>}
                  </button>
                )
              })}
            </div>
          </SheetSection>

          <SheetSection label="Specialization">
            <div className="grid grid-cols-2 gap-2">
              {JOB_CATEGORIES.map(({ value, label }) => (
                <label key={value}
                  className="flex items-center gap-2.5 p-2.5 border cursor-pointer transition-colors rounded"
                  style={jobCats.has(value) ? { borderColor: PINK, background: PINK_BG } : { borderColor: 'var(--border)' }}>
                  <input type="checkbox" checked={jobCats.has(value)} onChange={() => onJobCatsChange(toggleSet(jobCats, value as JobCategory))} />
                  <span className="text-sm font-medium" style={{ color: jobCats.has(value) ? PINK : 'var(--text-body)' }}>{label}</span>
                </label>
              ))}
            </div>
          </SheetSection>

          <SheetSection label="Emirate">
            <div className="grid grid-cols-2 gap-2">
              {EMIRATES.map(({ value, label }) => (
                <label key={value}
                  className="flex items-center gap-2.5 p-2.5 border cursor-pointer transition-colors rounded"
                  style={emirates.has(value) ? { borderColor: PINK, background: PINK_BG } : { borderColor: 'var(--border)' }}>
                  <input type="checkbox" checked={emirates.has(value)} onChange={() => onEmiratesChange(toggleSet(emirates, value))} />
                  <span className="text-sm font-medium" style={{ color: emirates.has(value) ? PINK : 'var(--text-body)' }}>{label}</span>
                </label>
              ))}
            </div>
          </SheetSection>

          <SheetSection label="Job Type">
            <div className="flex flex-wrap gap-1.5">
              {JOB_TYPES.map(({ value, label }) => (
                <button key={value} onClick={() => onJobTypesChange(toggleSet(jobTypes, value))}
                  className="inline-flex h-9 items-center whitespace-nowrap rounded-lg border px-3.5 font-sans text-[13px] font-medium transition-colors"
                  style={jobTypes.has(value) ? { background: PINK_FILL, color: '#fff', borderColor: PINK } : { borderColor: 'var(--border)', color: 'var(--text-body)', background: 'var(--surface)' }}>
                  {label}
                </button>
              ))}
            </div>
          </SheetSection>

          <SheetSection label="Date Posted">
            <div className="grid gap-0.5">
              {POSTED_OPTIONS.map(({ value, label }) => (
                <button key={value} onClick={() => onPostedChange(posted === value ? '' : value)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-[var(--surface-2)]">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                    style={posted === value ? { borderColor: PINK, background: PINK_FILL } : { borderColor: 'var(--border-strong)', background: 'var(--surface)' }}>
                    {posted === value && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <span className="font-sans text-[13px] font-medium" style={{ color: posted === value ? PINK : 'var(--text-body)' }}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </SheetSection>

          <SheetSection label="Apply">
            <button onClick={() => onEasyApplyOnlyChange(!easyApplyOnly)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-[var(--surface-2)]">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors"
                style={easyApplyOnly ? { borderColor: PINK, background: PINK_FILL } : { borderColor: 'var(--border-strong)', background: 'var(--surface)' }}>
                {easyApplyOnly && <span className="h-2 w-2 rounded-[1px] bg-white" />}
              </span>
              <span className="font-sans text-[13px] font-medium" style={{ color: easyApplyOnly ? PINK : 'var(--text-body)' }}>
                Easy Apply only
              </span>
            </button>
          </SheetSection>

          <SheetSection label="Sort By">
            <div className="grid gap-0.5">
              {SORT_OPTIONS.map(({ value, label }) => (
                <button key={value} onClick={() => onSortChange(value)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-[var(--surface-2)]">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                    style={sortBy === value ? { borderColor: PINK, background: PINK_FILL } : { borderColor: 'var(--border-strong)', background: 'var(--surface)' }}>
                    {sortBy === value && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <span className="font-sans text-[13px] font-medium" style={{ color: sortBy === value ? PINK : 'var(--text-body)' }}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </SheetSection>
        </div>

        <div className="shrink-0 px-5 py-4 border-t border-gray-100 bg-white flex items-center gap-3">
          {activeCount > 0 && (
            <button
              onClick={onClearAll}
              className="shrink-0 font-sans text-[13px] font-medium text-gray-400 transition-colors hover:text-rose-500"
            >
              Clear all
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 text-white font-sans text-[13.5px] font-semibold py-3 rounded-xl transition-colors"
            style={{ background: PINK_FILL }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = PINK_FILL_HOV }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = PINK_FILL }}
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

  // CSS-class driven states — no inline onMouseEnter/onMouseLeave
  const pillCls = isActive
    ? 'bg-[var(--accent-soft)] border-[var(--accent-ring)] text-[var(--accent)] hover:bg-[var(--accent-soft)]'
    : open
      ? 'bg-white border-gray-300 text-gray-900 shadow-sm'
      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={onToggle}
        className={`inline-flex h-[30px] items-center gap-1.5 rounded-full border px-3.5 font-sans text-[12.5px] font-medium whitespace-nowrap transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-gray-300 ${pillCls}`}
      >
        <span className="flex items-center gap-1.5">
          {label}
          {isActive && (
            <span className="inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-white text-[9px] font-bold leading-none" style={{ background: PINK_FILL }}>
              {count}
            </span>
          )}
        </span>
        <ChevronDown
          size={11}
          strokeWidth={2.5}
          className={`shrink-0 transition-transform duration-200 ${isActive ? 'text-[var(--accent)]' : 'text-gray-400'} ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-2 z-50 rounded-2xl border border-gray-100 bg-white overflow-hidden"
          style={{
            minWidth: 196,
            boxShadow: '0 4px 6px -2px rgba(15,23,42,0.06), 0 12px 24px -4px rgba(15,23,42,0.10), 0 0 0 1px rgba(15,23,42,0.04)',
          }}
        >
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
    <div className="py-1.5 max-h-[288px] overflow-y-auto">
      {options.map(({ value, label }) => {
        const on = selected.has(value)
        // Detect "Label (count)" pattern for right-aligned count display
        const m = label.match(/^(.*?)\s+\((\d+)\)$/)
        const mainLabel = m ? m[1] : label
        const countStr  = m ? m[2] : null
        return (
          <label
            key={value}
            onClick={() => onToggle(value)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer select-none transition-colors duration-100 hover:bg-gray-50 group"
          >
            {/* Custom checkbox */}
            <span
              className={`flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[3px] border transition-all duration-150 ${on ? 'border-transparent' : 'border-gray-300 group-hover:border-gray-400'}`}
              style={on ? { background: PINK_FILL } : {}}
            >
              {on && (
                <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                  <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span
              className="flex-1 font-sans text-[13px] leading-none"
              style={{ color: on ? PINK : 'var(--text-body)', fontWeight: on ? 500 : 400 }}
            >
              {mainLabel}
            </span>
            {countStr && (
              <span className="font-mono text-[11px] tabular-nums" style={{ color: on ? PINK : '#9CA3AF' }}>
                {countStr}
              </span>
            )}
          </label>
        )
      })}
    </div>
  )
}

// ── RadioPanel — single-select ────────────────────────────────────────────────
function RadioPanel({ options, selected, onSelect }: {
  options: { value: string; label: string }[]; selected: string; onSelect: (v: string) => void
}) {
  return (
    <div className="py-1.5" style={{ minWidth: 184 }}>
      {options.map(({ value, label }) => {
        const on = selected === value
        return (
          <button
            key={value}
            onClick={() => onSelect(on ? '' : value)}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 select-none transition-colors duration-100 hover:bg-gray-50"
          >
            <span
              className={`flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border-[1.75px] transition-all duration-150 ${on ? 'border-transparent' : 'border-gray-300'}`}
              style={on ? { background: PINK_FILL } : {}}
            >
              {on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </span>
            <span
              className="font-sans text-[13px] leading-none"
              style={{ color: on ? PINK : 'var(--text-body)', fontWeight: on ? 500 : 400 }}
            >
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function Sep() { return <span className="h-4 w-px bg-gray-200 shrink-0 mx-0.5" /> }

function QuickToggle({ on, onToggle, title, children }: { on: boolean; onToggle: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={on}
      title={title}
      className={`inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 font-sans text-[12.5px] font-medium whitespace-nowrap transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-gray-300 ${
        on
          ? 'bg-[var(--accent-soft)] border-[var(--accent-ring)] text-[var(--accent)] hover:bg-[var(--accent-soft)]'
          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  )
}

function SheetToggle({ on, onToggle, children }: { on: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onToggle} aria-pressed={on} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-[var(--surface-2)]">
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors"
        style={on ? { borderColor: PINK, background: PINK_FILL } : { borderColor: 'var(--border-strong)', background: 'var(--surface)' }}>
        {on && <span className="h-2 w-2 rounded-[1px] bg-white" />}
      </span>
      <span className="font-sans text-[13px] font-medium" style={{ color: on ? PINK : 'var(--text-body)' }}>{children}</span>
    </button>
  )
}

function SheetSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-sans text-[10.5px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-3">{label}</h3>
      {children}
    </div>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────────────
function DetailPanel({ job, onSave, isSaved, isApplied, onApply }: {
  job: Job
  onSave: (id: number, e: React.MouseEvent) => void
  isSaved: boolean
  isApplied?: boolean
  onApply?: (id: number) => void
}) {
  const { user }     = useAuthStore()
  const skills       = parseSkills(job.skills)
  const salary       = job.salaryMin || job.salaryMax ? money(job.salaryMin, job.salaryMax, job.salaryCurrency) : ''
  const isLinkedIn     = !!(job.linkedinUrl || job.applyUrl?.toLowerCase().includes('linkedin.com'))
  const isGated        = !user && job.applyUrl == null && job.linkedinUrl == null
  const isDirectApply  = !!user && !job.applyUrl && !job.linkedinUrl
  // job.applyUrl/linkedinUrl come from scraped or HR-supplied data — checked
  // before it's allowed into an href below (new URL() alone would accept a
  // javascript: URL as "valid").
  const rawApplyUrl    = job.applyUrl ?? job.linkedinUrl ?? null
  const applyUrl       = isSafeUrl(rawApplyUrl) ? rawApplyUrl : null
  const half = Math.ceil(skills.length / 2)
  const emirateLabel = EMIRATES.find(e => e.value === job.emirate)?.label

  // Keep the primary action reachable while the candidate reads a long description:
  // once the header buttons scroll out of view, a slim bar pins Apply to the bottom.
  const actionsRef = useRef<HTMLDivElement>(null)
  const [pinApply, setPinApply] = useState(false)
  useEffect(() => {
    const el = actionsRef.current
    const pane = el?.closest('main')
    if (!el || !pane) return
    let frame = 0
    const update = () => {
      frame = 0
      setPinApply(el.getBoundingClientRect().bottom < pane.getBoundingClientRect().top)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    pane.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      pane.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [job.id])

  const applyButton = (compact = false) => {
    const cls = `inline-flex items-center gap-2 text-white font-sans text-sm font-bold rounded-lg transition-colors ${compact ? 'px-4 py-2' : 'px-5 py-2.5'}`
    const hover = {
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.background = PINK_FILL_HOV },
      onMouseLeave: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.background = PINK_FILL },
    }
    if (isGated) {
      return (
        <Link to="/login" state={{ from: `/jobs/${job.id}` }} className={cls} style={{ background: PINK_FILL }} {...hover}>
          Sign in to apply
        </Link>
      )
    }
    if (isDirectApply) {
      return (
        <Link to={`/jobs/${job.id}`} className={cls} style={{ background: PINK_FILL }} {...hover}>
          {isApplied ? 'Apply Again' : 'Apply Now'}
        </Link>
      )
    }
    if (applyUrl) {
      return (
        <a
          href={applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cls}
          style={{ background: PINK_FILL }}
          {...hover}
          onClick={() => {
            // Track the apply click — fire-and-forget, never blocks the navigation
            if (user?.userType === 'job_seeker') {
              onApply?.(job.id)
              seekerApi.trackApply(job.id).catch(() => {})
            }
          }}
        >
          <ExternalLink size={14} /> {isApplied ? 'Apply Again' : 'Apply Now'}
        </a>
      )
    }
    return null
  }

  return (
    <div className="mx-auto max-w-3xl p-8 xl:p-10">
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
        <div ref={actionsRef} className="flex items-center gap-2 shrink-0 mt-1 flex-wrap justify-end">
          {/* Applied badge — shown above the button, never disables it */}
          {isApplied && (
            <span className="w-full text-right font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center justify-end gap-1 mb-1">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6.5L4.8 9L10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Applied
            </span>
          )}
          {applyButton()}
          <button
            onClick={(e) => onSave(job.id, e)}
            className="border rounded-lg p-2.5 transition-colors"
            aria-label={isSaved ? 'Remove from saved' : 'Save job'}
            style={isSaved ? { background: PINK_BG, borderColor: PINK_RING } : { borderColor: 'var(--border)', background: 'var(--surface)' }}
            onMouseEnter={e => { if (!isSaved) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)' }}
            onMouseLeave={e => { if (!isSaved) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)' }}
          >
            {isSaved
              ? <BookmarkCheck size={16} style={{ color: PINK }} />
              : <Bookmark size={16} className="text-slate-400" />}
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
        {/* Salary — shown as a highlight only when the employer listed one; otherwise a quiet, honest note */}
        {salary
          ? <InfoPill sal>{salary}</InfoPill>
          : <span className="inline-flex items-center px-1 py-1.5 font-mono text-xs text-gray-400">Salary not listed by employer</span>}
        {/* Badges */}
        {(job.visaType === 'free_visa' || job.visaType === 'employment_visa') && <InfoPill>Visa Provided</InfoPill>}
        {job.visaType === 'own_visa' && <InfoPill>Own Visa Required</InfoPill>}
        {job.visaType === 'visit_visa_accepted' && <InfoPill>Visit Visa OK</InfoPill>}
        {job.immediateJoiner && <InfoPill><Zap size={10} /> Immediate Joiner</InfoPill>}
        {job.remoteUae && <InfoPill>Remote UAE</InfoPill>}
        {isLinkedIn && <InfoPill li>via LinkedIn</InfoPill>}
      </div>

      {skills.length > 0 && (
        <>
          <DSection>Core Stack</DSection>
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="border border-[var(--border)] p-4 bg-[var(--surface-2)]">
              <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-gray-400 mb-2">Required</span>
              <span className="font-mono text-sm font-semibold text-black">{skills.slice(0, half).join(', ')}</span>
            </div>
            {skills.length > half && (
              <div className="border border-[var(--border)] p-4 bg-[var(--surface-2)]">
                <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-gray-400 mb-2">Additional</span>
                <span className="font-mono text-sm font-semibold text-black">{skills.slice(half).join(', ')}</span>
              </div>
            )}
          </div>
        </>
      )}

      <JobDescriptionBlock job={job} />
      {applyUrl && isThinDescription(job) && <FullPostingNotice href={applyUrl} sourceName={sourceLabel(job)} />}

      <div className="mt-10 pt-6 border-t border-[var(--border)] flex items-center justify-between text-xs text-gray-400 font-mono">
        <div className="flex items-center gap-4">
          {(job.postedAt ?? job.createdAt) && <span className="flex items-center gap-1.5"><CalendarDays size={12} />{relativeTime(job.postedAt ?? job.createdAt)}</span>}
          {job.locationUae && <span className="flex items-center gap-1.5"><MapPin size={12} />{job.locationUae}</span>}
          {job.jobType && <span className="flex items-center gap-1.5"><BriefcaseBusiness size={12} />{labelize(job.jobType)}</span>}
        </div>
        {/* Plain <a>, not <Link> — this panel renders while already on /jobs, so a
            client-side Link navigation to the same route doesn't remount the page and
            the company filter state (only ever read from the URL on first mount) never
            picks up the new query param. Same class of bug applySavedSearch works around
            above via window.location.assign — a real browser navigation forces the reset. */}
        <a href={`/jobs?company=${encodeURIComponent(job.companyName ?? '')}`} className="hover:underline" style={{ color: PINK }}>
          More from {job.companyName} →
        </a>
      </div>

      {pinApply && applyButton(true) && (
        <div className="pointer-events-none sticky bottom-0 -mx-8 xl:-mx-10 mt-6">
          <div className="pointer-events-auto flex items-center gap-3 border-t border-[var(--border)] bg-white/95 px-8 py-3 backdrop-blur xl:px-10">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-black">{job.title}</p>
              <p className="truncate font-mono text-[10px] uppercase tracking-wider text-gray-500">{job.companyName}</p>
            </div>
            <button
              onClick={(e) => onSave(job.id, e)}
              className="shrink-0 rounded-lg border p-2 transition-colors hover:bg-[var(--surface-2)]"
              aria-label={isSaved ? 'Remove from saved' : 'Save job'}
              style={{ borderColor: isSaved ? PINK_RING : 'var(--border)', background: isSaved ? PINK_BG : 'var(--surface)' }}
            >
              {isSaved ? <BookmarkCheck size={15} style={{ color: PINK }} /> : <Bookmark size={15} className="text-slate-400" />}
            </button>
            {applyButton(true)}
          </div>
        </div>
      )}
    </div>
  )
}

// ── JobListItem — memoized so filter changes don't re-render unchanged cards ──
const JobListItem = memo(function JobListItem({
  job, active, isSaved, isApplied, onSave, onClick,
}: {
  job: Job; active: boolean; isSaved: boolean; isApplied?: boolean
  onSave: (id: number, e: React.MouseEvent) => void
  onClick: (j: Job) => void
}) {
  const sal          = job.salaryMin || job.salaryMax ? money(job.salaryMin, job.salaryMax, job.salaryCurrency) : ''
  const postedIso    = job.postedAt ?? job.createdAt
  const postedAgo    = relativeTime(postedIso)
  const isNew        = /^(just now|\d+ min ago|\d+h ago|1d ago)$/.test(postedAgo)
  const skills       = parseSkills(job.skills).slice(0, 3)
  const emirateLabel = EMIRATES.find(e => e.value === job.emirate)?.label
  const metaFallback = [emirateLabel, job.experienceLevel ? labelize(job.experienceLevel) : null].filter(Boolean).join(' · ')
  const isLinkedIn   = !!(job.linkedinUrl || job.applyUrl?.toLowerCase().includes('linkedin.com'))

  return (
    // A div, not a <button>: the save toggle inside is itself a button, and nesting
    // buttons is invalid HTML (and breaks keyboard/AT behaviour).
    <div
      role="button"
      tabIndex={0}
      aria-current={active ? 'true' : undefined}
      onClick={() => onClick(job)}
      onKeyDown={e => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(job) }
      }}
      className="relative w-full cursor-pointer text-left px-4 py-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
      style={{ background: active ? PINK_BG : undefined }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface-2)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = '' }}
    >
      {active && <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: PINK_FILL }} />}
      <div className="flex items-center gap-2 mb-2">
        <CompanyLogo logoUrl={job.companyLogoUrl} companyName={job.companyName} size="sm" className="shrink-0" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest truncate" style={{ color: active ? PINK : '#9CA3AF' }}>
          {job.companyName}
        </span>
        {isNew && (
          <span className="shrink-0 rounded px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-wider text-white" style={{ background: PINK_FILL }}>New</span>
        )}
        <span className="ml-auto font-mono text-[10px] text-gray-400 shrink-0">{postedAgo}</span>
        {/* Save toggle — stopPropagation prevents the card click from firing */}
        <button
          onClick={(e) => onSave(job.id, e)}
          className="shrink-0 rounded p-0.5 transition-colors hover:bg-gray-100"
          aria-label={isSaved ? 'Remove from saved' : 'Save job'}
        >
          {isSaved
            ? <BookmarkCheck size={13} style={{ color: PINK }} />
            : <Bookmark size={13} className="text-gray-300" />}
        </button>
      </div>
      <p className="font-bold text-sm text-black leading-snug mb-2.5">{job.title}</p>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-gray-500 truncate">
          {skills.length ? skills.join(', ') : (job.locationUae ?? 'UAE')}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {isApplied && (
            <span className="font-mono text-[9px] uppercase tracking-wider font-bold text-emerald-600 flex items-center gap-0.5">
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6.5L4.8 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Applied
            </span>
          )}
          {isLinkedIn && (
            <span className="font-mono text-[9px] uppercase tracking-wider font-bold" style={{ color: '#0A66C2' }}>LinkedIn</span>
          )}
          {job.remoteUae && (
            <span className="font-mono text-[9px] uppercase tracking-wider font-bold" style={{ color: PINK }}>Remote</span>
          )}
          {job.immediateJoiner && (
            <span className="font-mono text-[9px] uppercase tracking-wider text-amber-600 font-bold">Now</span>
          )}
          {sal
            ? <span className="font-mono text-[11px] font-bold" style={{ color: active ? PINK : 'var(--text)' }}>{sal}</span>
            : metaFallback
              ? <span className="font-mono text-[10px] text-gray-400 truncate max-w-[130px]">{metaFallback}</span>
              : null
          }
        </div>
      </div>
    </div>
  )
})

const SOURCE_NAMES: Record<string, string> = {
  linkedin: 'LinkedIn', indeed: 'Indeed', naukrigulf: 'NaukriGulf', gulftalent: 'GulfTalent', bayt: 'Bayt',
  himalayas: 'Himalayas', remoteok: 'RemoteOK',
}
function sourceLabel(job: Job) {
  return job.source ? SOURCE_NAMES[job.source.toLowerCase()] ?? null : null
}

function InfoPill({ children, accent, loc, sal, li }: { children: React.ReactNode; accent?: boolean; loc?: boolean; sal?: boolean; li?: boolean }) {
  const cls = accent
    ? { background: PINK_BG, borderColor: PINK_RING, color: PINK }
    : loc
      ? { background: 'var(--surface-3)', borderColor: 'var(--border)', color: 'var(--text-body)' }
      : sal
        ? { background: 'color-mix(in srgb, #10b981 14%, var(--surface))', borderColor: 'color-mix(in srgb, #10b981 38%, var(--surface))', color: 'var(--pill-green)' }
        : li
          ? { background: 'color-mix(in srgb, #0a66c2 12%, var(--surface))', borderColor: 'color-mix(in srgb, #0a66c2 38%, var(--surface))', color: 'var(--pill-blue)' }
          : { background: 'var(--surface-3)', borderColor: 'var(--border)', color: 'var(--text)' }
  return (
    <span className="inline-flex items-center gap-1.5 border px-3 py-1.5 font-mono text-xs font-semibold rounded-md" style={cls}>
      {children}
    </span>
  )
}

function DSection({ children }: { children: React.ReactNode }) {
  return <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-black mb-3 pb-2 border-b border-[var(--border)]">{children}</h2>
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
