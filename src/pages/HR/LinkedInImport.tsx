import { AlertTriangle, CheckCircle2, Link2, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToastStore } from '../../components/Toast'
import { Button, Card, Field, Input, Textarea } from '../../components/ui'
import { errorMessage, hrApi } from '../../services/api'
import type { Job } from '../../types'

interface Preview {
  title: string | null
  companyName: string | null
  description: string | null
  locationUae: string | null
  applyUrl: string
  complete: boolean
  message: string | null
}

interface FormState {
  title: string
  companyName: string
  description: string
  locationUae: string
  applyUrl: string
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function UrlImport() {
  const toast = useToastStore((s) => s.add)

  const [url,        setUrl]       = useState('')
  const [preview,    setPreview]   = useState<Preview | null>(null)
  const [form,       setForm]      = useState<FormState>({ title: '', companyName: '', description: '', locationUae: '', applyUrl: '' })
  const [previewing, setPreviewing] = useState(false)
  const [importing,  setImporting]  = useState(false)
  const [imported,   setImported]   = useState<Job | null>(null)

  // ── Step 1: fetch preview ─────────────────────────────────────────────────
  async function fetchPreview() {
    const trimmed = url.trim()
    if (!trimmed) return
    setPreviewing(true)
    setPreview(null)
    setImported(null)
    try {
      const { data } = await hrApi.importPreview(trimmed)
      setPreview(data)
      setForm({
        title:       data.title        ?? '',
        companyName: data.companyName  ?? '',
        description: data.description  ?? '',
        locationUae: data.locationUae  ?? '',
        applyUrl:    data.applyUrl     ?? trimmed,
      })
    } catch (err) {
      toast({ type: 'error', title: 'Could not preview URL', message: errorMessage(err) })
    } finally {
      setPreviewing(false)
    }
  }

  // ── Step 2: save the (possibly edited) data ────────────────────────────────
  async function doImport() {
    if (!form.title.trim() || !form.companyName.trim() || !form.description.trim()) {
      toast({ type: 'error', title: 'Fill in required fields', message: 'Title, company and description are all required.' })
      return
    }
    setImporting(true)
    try {
      const { data } = await hrApi.createJob({
        title:           form.title.trim(),
        companyName:     form.companyName.trim(),
        description:     form.description.trim(),
        locationUae:     form.locationUae.trim() || undefined,
        applyUrl:        form.applyUrl.trim()    || undefined,
        jobType:         'full_time',
        experienceLevel: 'mid',
      })
      setImported(data)
      setPreview(null)
      toast({ type: 'success', title: 'Job imported', message: data.title })
    } catch (err) {
      toast({ type: 'error', title: 'Import failed', message: errorMessage(err) })
    } finally {
      setImporting(false)
    }
  }

  function reset() {
    setUrl(''); setPreview(null); setImported(null)
    setForm({ title: '', companyName: '', description: '', locationUae: '', applyUrl: '' })
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-950">Import job from URL</h1>
      <p className="mt-1 text-sm text-slate-500">
        Paste any job listing URL — LinkedIn, Bayt, company careers pages, etc.
        We extract what we can; you fill in any missing fields before saving.
      </p>

      {/* ── Step 1 — URL input ──────────────────────────────────────── */}
      <Card className="mt-5">
        <Field label="Job URL">
          <Input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://www.emiratesgroupcareers.com/search-and-apply/24581"
            onKeyDown={e => { if (e.key === 'Enter') fetchPreview() }}
            disabled={previewing}
          />
        </Field>
        <Button className="mt-3" disabled={previewing || !url.trim()} onClick={fetchPreview}>
          <Sparkles size={14} />
          {previewing ? 'Fetching…' : 'Preview'}
        </Button>
      </Card>

      {/* ── Step 2 — editable form ──────────────────────────────────── */}
      {preview && !imported && (
        <Card className="mt-5 space-y-4">

          {/* Status banner */}
          {preview.message ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
              <span>{preview.message}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
              <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
              All fields extracted successfully — review and import.
            </div>
          )}

          <Field label="Title *">
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. IT Delivery Lead – Infrastructure & Cloud"
            />
          </Field>

          <Field label="Company *">
            <Input
              value={form.companyName}
              onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
              placeholder="e.g. Emirates Group"
            />
          </Field>

          <Field label="Description *">
            <Textarea
              rows={10}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder={
                preview.complete
                  ? ''
                  : 'Paste the job description from the careers page here…'
              }
            />
          </Field>

          <Field label="Location (UAE)">
            <Input
              value={form.locationUae}
              onChange={e => setForm(f => ({ ...f, locationUae: e.target.value }))}
              placeholder="e.g. Dubai"
            />
          </Field>

          <Field label="Apply URL">
            <Input
              value={form.applyUrl}
              onChange={e => setForm(f => ({ ...f, applyUrl: e.target.value }))}
            />
          </Field>

          <div className="flex items-center gap-3 pt-1">
            <Button
              disabled={importing || !form.title.trim() || !form.companyName.trim() || !form.description.trim()}
              onClick={doImport}
            >
              <Link2 size={14} />
              {importing ? 'Importing…' : 'Import job'}
            </Button>
            <button
              onClick={reset}
              className="text-sm text-slate-400 hover:text-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </Card>
      )}

      {/* ── Result ──────────────────────────────────────────────────── */}
      {imported && (
        <Card className="mt-5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-pink-700">
            <CheckCircle2 size={15} /> Imported
          </div>
          <h2 className="mt-2 text-xl font-bold text-slate-950">{imported.title}</h2>
          <p className="mt-0.5 text-slate-500">{imported.companyName}</p>
          <div className="mt-4 flex gap-3">
            <Link to={`/jobs/${imported.id}`}>
              <Button variant="secondary">View job</Button>
            </Link>
            <Button onClick={reset}>Import another</Button>
          </div>
        </Card>
      )}
    </main>
  )
}
