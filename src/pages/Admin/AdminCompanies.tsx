import { Building2, Check, ExternalLink, Pencil, Save, ShieldCheck, Star, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Card, EmptyState, Input, Select, Textarea } from '../../components/ui'
import { useToastStore } from '../../components/Toast'
import { adminCompaniesApi, errorMessage } from '../../services/api'
import type { HiringCompanyAdmin, HiringCompanyPatchBody, HiringCompanyStatus } from '../../types'

type Tab = HiringCompanyStatus | 'ALL'

const TABS: { key: Tab; label: string }[] = [
  { key: 'PENDING',  label: 'Pending review' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'ALL',      label: 'All' },
]

/**
 * Admin moderation queue for the hiring-companies directory — /admin/companies.
 *
 * Three primary actions per row:
 *   - Approve  (with optional inline edits for category/city/description)
 *   - Reject   (with a reason)
 *   - Edit     (any field, including the careers URL)
 *
 * Plus quick toggles for featured and url_verified (visible on the card).
 */
export default function AdminCompanies() {
  const [tab, setTab]         = useState<Tab>('PENDING')
  const [items, setItems]     = useState<HiringCompanyAdmin[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(0)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const toast = useToastStore()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const status = tab === 'ALL' ? undefined : tab
      const { data } = await adminCompaniesApi.list(status, page, 20)
      setItems(data.content)
      setTotal(data.totalElements)
    } catch (e) {
      toast.add({ type: 'error', title: 'Failed to load companies', message: errorMessage(e) })
    } finally {
      setLoading(false)
    }
  }, [tab, page, toast])

  useEffect(() => { load() }, [load])

  /** Common refresh-after-action helper. */
  const after = (title: string, c: HiringCompanyAdmin) => {
    toast.add({ type: 'success', title, message: c.name })
    setEditingId(null)
    load()
  }

  const approve = async (c: HiringCompanyAdmin, overrides?: HiringCompanyPatchBody) => {
    try {
      await adminCompaniesApi.approve(c.id, overrides)
      after('Approved', c)
    } catch (e) {
      toast.add({ type: 'error', title: 'Approve failed', message: errorMessage(e) })
    }
  }
  const reject = async (c: HiringCompanyAdmin) => {
    const reason = window.prompt(`Reject "${c.name}" — reason (optional):`) ?? undefined
    try {
      await adminCompaniesApi.reject(c.id, reason)
      after('Rejected', c)
    } catch (e) {
      toast.add({ type: 'error', title: 'Reject failed', message: errorMessage(e) })
    }
  }
  const remove = async (c: HiringCompanyAdmin) => {
    if (!window.confirm(`Delete "${c.name}" from the directory?`)) return
    try {
      await adminCompaniesApi.remove(c.id)
      after('Deleted', c)
    } catch (e) {
      toast.add({ type: 'error', title: 'Delete failed', message: errorMessage(e) })
    }
  }
  const togglePatch = async (c: HiringCompanyAdmin, body: HiringCompanyPatchBody) => {
    try {
      await adminCompaniesApi.patch(c.id, body)
      load()
    } catch (e) {
      toast.add({ type: 'error', title: 'Update failed', message: errorMessage(e) })
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-pink-700" />
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hiring Companies</h1>
        <span className="ml-auto text-sm text-slate-500">{total} entry(s)</span>
      </div>

      <Card className="flex flex-wrap items-center gap-2 p-3">
        <div className="flex rounded-lg border border-slate-200 text-sm">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setPage(0) }}
              className={`px-3 py-1.5 font-medium transition first:rounded-l-lg last:rounded-r-lg ${
                tab === key
                  ? 'bg-pink-700 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {loading && items.length === 0 ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title="Nothing to show"
          description={tab === 'PENDING'
            ? 'No pending submissions — you’re all caught up.'
            : 'No entries match this filter.'}
        />
      ) : (
        <div className="grid gap-3">
          {items.map((c) => (
            <CompanyRow
              key={c.id}
              c={c}
              editing={editingId === c.id}
              onEditToggle={() => setEditingId(editingId === c.id ? null : c.id)}
              onApprove={(o) => approve(c, o)}
              onReject={() => reject(c)}
              onDelete={() => remove(c)}
              onTogglePatch={(b) => togglePatch(c, b)}
            />
          ))}
        </div>
      )}

      {total > 20 ? (
        <nav className="flex items-center justify-between">
          <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Previous
          </Button>
          <span className="text-sm text-slate-600">Page {page + 1} of {Math.ceil(total / 20)}</span>
          <Button variant="secondary" size="sm" disabled={(page + 1) * 20 >= total} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </nav>
      ) : null}
    </div>
  )
}

/* ───────────────────────────── Row ───────────────────────────── */
function CompanyRow({
  c, editing, onEditToggle, onApprove, onReject, onDelete, onTogglePatch,
}: {
  c: HiringCompanyAdmin
  editing: boolean
  onEditToggle: () => void
  onApprove: (overrides?: HiringCompanyPatchBody) => void
  onReject: () => void
  onDelete: () => void
  onTogglePatch: (body: HiringCompanyPatchBody) => void
}) {
  const [draft, setDraft] = useState<HiringCompanyPatchBody>({
    name:        c.name,
    category:    c.category,
    city:        c.city,
    careersUrl:  c.careersUrl,
    websiteUrl:  c.websiteUrl,
    description: c.description,
  })

  const save = async () => {
    try {
      await adminCompaniesApi.patch(c.id, draft)
      onEditToggle()
      // Parent will reload from its own toast handler when needed; here we just close edit.
      window.dispatchEvent(new Event('focus')) // cheap nudge to re-render parents that listen
    } catch (e) {
      alert(errorMessage(e))
    }
  }

  return (
    <Card className="p-4">
      {!editing ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-950">{c.name}</h2>
              {c.featured ? <Star className="h-4 w-4 fill-amber-400 stroke-amber-500" /> : null}
              {c.urlVerified ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-emerald-700">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </span>
              ) : null}
              <StatusBadge status={c.status} />
            </div>
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500">
              {c.city ? <span>{c.city}</span> : null}
              {c.category ? <span>· {c.category}</span> : null}
              {c.submittedByEmail ? <span>· submitted by {c.submittedByEmail}</span> : null}
            </div>
            {c.description ? (
              <p className="mt-2 line-clamp-2 text-sm text-slate-700">{c.description}</p>
            ) : null}
            {c.rejectionReason ? (
              <p className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                Rejected: {c.rejectionReason}
              </p>
            ) : null}
            <div className="mt-2">
              <a
                href={c.careersUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 break-all text-xs text-slate-600 hover:text-pink-700 hover:underline"
              >
                {c.careersUrl} <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {c.status !== 'APPROVED' ? (
              <Button variant="primary" size="sm" onClick={() => onApprove()}>
                <Check className="h-3.5 w-3.5" /> Approve
              </Button>
            ) : null}
            {c.status !== 'REJECTED' ? (
              <Button variant="secondary" size="sm" onClick={onReject}>
                <X className="h-3.5 w-3.5" /> Reject
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={onEditToggle}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTogglePatch({ featured: !c.featured })}
              title={c.featured ? 'Unfeature' : 'Feature'}
            >
              <Star className={`h-3.5 w-3.5 ${c.featured ? 'fill-amber-400 stroke-amber-500' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTogglePatch({ urlVerified: !c.urlVerified })}
              title={c.urlVerified ? 'Mark unverified' : 'Mark verified'}
            >
              <ShieldCheck className={`h-3.5 w-3.5 ${c.urlVerified ? 'text-emerald-600' : ''}`} />
            </Button>
            <Button variant="danger" size="sm" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={draft.name ?? ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" />
            <Input value={draft.careersUrl ?? ''} onChange={(e) => setDraft({ ...draft, careersUrl: e.target.value })} placeholder="Careers URL" />
            <Input value={draft.websiteUrl ?? ''} onChange={(e) => setDraft({ ...draft, websiteUrl: e.target.value })} placeholder="Website URL" />
            <Select value={draft.city ?? ''} onChange={(e) => setDraft({ ...draft, city: e.target.value || null })}>
              <option value="">— City —</option>
              {['Dubai','Abu Dhabi','Sharjah','Ajman','Ras Al Khaimah','Fujairah','Umm Al Quwain','Al Ain','UAE-wide'].map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </Select>
            <Select value={draft.category ?? ''} onChange={(e) => setDraft({ ...draft, category: e.target.value || null })} className="sm:col-span-2">
              <option value="">— Category —</option>
              {['Software & Product','Cloud & DevOps','Data & AI','Cybersecurity','Enterprise IT','Banking & FinTech','E-commerce & Marketplace','Telecom','Aviation & Travel','Logistics','Government & Smart Cities','Energy & Utilities','Healthcare','Real Estate','Consulting & Services','Recruitment & Staffing','AI & Technology'].map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </Select>
          </div>
          <Textarea
            value={draft.description ?? ''}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="Description (1–2 sentences shown on the public page)"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onEditToggle}>Cancel</Button>
            {c.status === 'PENDING' ? (
              <Button variant="primary" size="sm" onClick={() => onApprove(draft)}>
                <Check className="h-3.5 w-3.5" /> Save & Approve
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={save}>
                <Save className="h-3.5 w-3.5" /> Save
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

function StatusBadge({ status }: { status: HiringCompanyStatus }) {
  const tone = status === 'APPROVED' ? 'green' : status === 'REJECTED' ? 'red' : 'amber'
  return <Badge tone={tone}>{status}</Badge>
}
