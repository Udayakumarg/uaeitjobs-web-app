import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Button, Field, Input, Select } from './ui'

export interface JobFilterValues {
  q: string
  type: string
  level: string
  location: string
  skills: string
}

const EMPTY: JobFilterValues = { q: '', type: '', level: '', location: '', skills: '' }

export function JobFilters({
  value,
  onApply,
}: {
  value: JobFilterValues
  onApply: (value: JobFilterValues) => void
}) {
  const [draft, setDraft] = useState<JobFilterValues>(value)
  const [advanced, setAdvanced] = useState(
    Boolean(value.type || value.level || value.location || value.skills),
  )

  useEffect(() => {
    setDraft(value)
  }, [value])

  const update = (key: keyof JobFilterValues, fieldValue: string) =>
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
    (draft.skills ? 1 : 0)

  const hasFilters =
    Boolean(draft.q || draft.type || draft.level || draft.location || draft.skills)

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
              <span className="ml-1 rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold text-teal-800">
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
