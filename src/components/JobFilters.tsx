import { Flag, RotateCcw, Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Button, Field, Input, Select } from './ui'

export interface JobFilterValues {
  q: string
  type: string
  level: string
  location: string
  skills: string
  /** UAE-specific filters */
  visaType: string
  emirate: string
  immediateJoiner: boolean
  remoteUae: boolean
}

const EMPTY: JobFilterValues = {
  q: '',
  type: '',
  level: '',
  location: '',
  skills: '',
  visaType: '',
  emirate: '',
  immediateJoiner: false,
  remoteUae: false,
}

export function JobFilters({
  value,
  onApply,
}: {
  value: JobFilterValues
  onApply: (value: JobFilterValues) => void
}) {
  const [draft, setDraft] = useState<JobFilterValues>(value)
  const [advanced, setAdvanced] = useState(
    Boolean(
      value.type ||
        value.level ||
        value.location ||
        value.skills ||
        value.visaType ||
        value.emirate ||
        value.immediateJoiner ||
        value.remoteUae,
    ),
  )

  useEffect(() => {
    setDraft(value)
  }, [value])

  const update = <K extends keyof JobFilterValues>(key: K, fieldValue: JobFilterValues[K]) =>
    setDraft((current) => ({ ...current, [key]: fieldValue }))

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onApply(draft)
  }

  const handleReset = () => {
    setDraft(EMPTY)
    onApply(EMPTY)
  }

  const activeCount =
    (draft.type ? 1 : 0) +
    (draft.level ? 1 : 0) +
    (draft.location ? 1 : 0) +
    (draft.skills ? 1 : 0) +
    (draft.visaType ? 1 : 0) +
    (draft.emirate ? 1 : 0) +
    (draft.immediateJoiner ? 1 : 0) +
    (draft.remoteUae ? 1 : 0)

  const hasFilters =
    Boolean(
      draft.q ||
        draft.type ||
        draft.level ||
        draft.location ||
        draft.skills ||
        draft.visaType ||
        draft.emirate ||
        draft.immediateJoiner ||
        draft.remoteUae,
    )

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.08)]"
    >
      {/* Primary row — search + advanced toggle + submit */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by role, skill, or company"
            value={draft.q}
            onChange={(event) => update('q', event.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setAdvanced((v) => !v)}
            className="whitespace-nowrap"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeCount > 0 ? (
              <span className="ml-1 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-800">
                {activeCount}
              </span>
            ) : null}
          </Button>
          <Button type="submit" className="whitespace-nowrap">
            <Search className="h-4 w-4" /> Search
          </Button>
        </div>
      </div>

      {/* Advanced filters — collapsible */}
      {advanced ? (
        <>
          <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Job type">
              <Select value={draft.type} onChange={(event) => update('type', event.target.value)}>
                <option value="">Any type</option>
                <option value="full_time">Full-time</option>
                <option value="contract">Contract</option>
                <option value="part_time">Part-time</option>
              </Select>
            </Field>
            <Field label="Experience">
              <Select value={draft.level} onChange={(event) => update('level', event.target.value)}>
                <option value="">Any level</option>
                <option value="junior">Junior</option>
                <option value="mid">Mid-level</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead / Principal</option>
              </Select>
            </Field>
            <Field label="Location">
              <Input
                placeholder="Dubai, Abu Dhabi…"
                value={draft.location}
                onChange={(event) => update('location', event.target.value)}
              />
            </Field>
            <Field label="Skill">
              <Input
                placeholder="AWS, Java, React…"
                value={draft.skills}
                onChange={(event) => update('skills', event.target.value)}
              />
            </Field>
          </div>

          {/* UAE essentials — only here, not on other portals */}
          <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">
              <Flag className="h-3.5 w-3.5" />
              UAE essentials
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Field label="Visa requirement">
                <Select
                  value={draft.visaType}
                  onChange={(event) => update('visaType', event.target.value)}
                >
                  <option value="">Any</option>
                  <option value="free_visa">Free visa (employer-provided)</option>
                  <option value="employment_visa">Will sponsor visa</option>
                  <option value="own_visa">Own visa required</option>
                  <option value="visit_visa_accepted">Visit visa accepted</option>
                </Select>
              </Field>
              <Field label="Emirate">
                <Select
                  value={draft.emirate}
                  onChange={(event) => update('emirate', event.target.value)}
                >
                  <option value="">Any emirate</option>
                  <option value="dubai">Dubai</option>
                  <option value="abu_dhabi">Abu Dhabi</option>
                  <option value="sharjah">Sharjah</option>
                  <option value="ajman">Ajman</option>
                  <option value="ras_al_khaimah">Ras Al Khaimah</option>
                  <option value="fujairah">Fujairah</option>
                  <option value="umm_al_quwain">Umm Al Quwain</option>
                </Select>
              </Field>
              <label className="flex cursor-pointer items-center gap-2 self-end rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-indigo-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={draft.immediateJoiner}
                  onChange={(event) => update('immediateJoiner', event.target.checked)}
                />
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                Immediate joiner
              </label>
              <label className="flex cursor-pointer items-center gap-2 self-end rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-indigo-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={draft.remoteUae}
                  onChange={(event) => update('remoteUae', event.target.checked)}
                />
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                Remote within UAE
              </label>
            </div>
          </div>
        </>
      ) : null}

      {hasFilters ? (
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span>Press Search to apply your filters.</span>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-950"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset all
          </button>
        </div>
      ) : null}
    </form>
  )
}
