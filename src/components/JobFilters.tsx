import { RotateCcw, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
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
  // Local draft state — only pushed up when the user clicks Search.
  // This prevents a re-fetch on every keystroke.
  const [draft, setDraft] = useState<JobFilterValues>(value)

  // Keep draft in sync if URL params change externally (e.g. back/forward nav).
  useEffect(() => {
    setDraft(value)
  }, [value])

  const update = (key: keyof JobFilterValues, fieldValue: string) =>
    setDraft((current) => ({ ...current, [key]: fieldValue }))

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onApply(draft)
  }

  const handleReset = () => {
    setDraft(EMPTY)
    onApply(EMPTY)
  }

  const hasFilters =
    Boolean(draft.q || draft.type || draft.level || draft.location || draft.skills)

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.08)]"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto]">
        <Field label="Search">
          <Input
            placeholder="Java, React, DevOps…"
            value={draft.q}
            onChange={(event) => update('q', event.target.value)}
          />
        </Field>
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
            <option value="lead">Lead</option>
          </Select>
        </Field>
        <Field label="Location">
          <Input
            placeholder="Dubai"
            value={draft.location}
            onChange={(event) => update('location', event.target.value)}
          />
        </Field>
        <Field label="Skill">
          <Input
            placeholder="AWS"
            value={draft.skills}
            onChange={(event) => update('skills', event.target.value)}
          />
        </Field>
        <div className="flex items-end gap-2">
          <Button type="submit" className="w-full">
            <Search className="h-4 w-4" /> Search
          </Button>
        </div>
      </div>

      {hasFilters ? (
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span>Filters applied — press Search to update results.</span>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
      ) : null}
    </form>
  )
}
