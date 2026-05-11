import { Search } from 'lucide-react'
import { Button, Field, Input, Select } from './ui'

export interface JobFilterValues {
  q: string
  type: string
  level: string
  location: string
  skills: string
}

export function JobFilters({ value, onChange, onSubmit }: { value: JobFilterValues; onChange: (value: JobFilterValues) => void; onSubmit: () => void }) {
  const update = (key: keyof JobFilterValues, fieldValue: string) => onChange({ ...value, [key]: fieldValue })
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto]">
        <Field label="Search">
          <Input placeholder="Java, React, DevOps" value={value.q} onChange={(event) => update('q', event.target.value)} />
        </Field>
        <Field label="Type">
          <Select value={value.type} onChange={(event) => update('type', event.target.value)}>
            <option value="">Any</option>
            <option value="full_time">Full-time</option>
            <option value="contract">Contract</option>
            <option value="part_time">Part-time</option>
          </Select>
        </Field>
        <Field label="Level">
          <Select value={value.level} onChange={(event) => update('level', event.target.value)}>
            <option value="">Any</option>
            <option value="junior">Junior</option>
            <option value="mid">Mid</option>
            <option value="senior">Senior</option>
            <option value="lead">Lead</option>
          </Select>
        </Field>
        <Field label="Location">
          <Input placeholder="Dubai" value={value.location} onChange={(event) => update('location', event.target.value)} />
        </Field>
        <Field label="Skill">
          <Input placeholder="AWS" value={value.skills} onChange={(event) => update('skills', event.target.value)} />
        </Field>
        <div className="flex items-end"><Button type="button" className="w-full" onClick={onSubmit}><Search className="h-4 w-4" />Search</Button></div>
      </div>
    </div>
  )
}
