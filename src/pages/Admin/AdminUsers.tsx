import { Plus, Search, Trash2, UserCheck, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useToastStore } from '../../components/Toast'
import { Button, Card } from '../../components/ui'
import { adminApi, errorMessage, fieldErrors } from '../../services/api'
import type { AdminUser } from '../../types'

const ROLE_COLORS: Record<string, string> = {
  admin:      'bg-red-100 text-red-700',
  hr:         'bg-sky-100 text-sky-700',
  job_seeker: 'bg-emerald-100 text-emerald-700',
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${ROLE_COLORS[role] ?? 'bg-slate-100 text-slate-600'}`}>
      {role.replace('_', ' ')}
    </span>
  )
}

interface CreateForm {
  email: string
  password: string
  userType: 'admin' | 'hr' | 'job_seeker'
}

export default function AdminUsers() {
  const [users, setUsers]       = useState<AdminUser[]>([])
  const [total, setTotal]       = useState(0)
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]         = useState<CreateForm>({ email: '', password: '', userType: 'admin' })
  const [saving, setSaving]     = useState(false)
  const [errors, setErrors]     = useState<Record<string, string>>({})
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const { add: toast } = useToastStore()

  const load = async (q = search) => {
    setLoading(true)
    try {
      const { data } = await adminApi.users(q || undefined, 0, 50)
      setUsers(data.content)
      setTotal(data.totalElements)
    } catch (e) {
      toast({ type: 'error', title: 'Failed to load users', message: errorMessage(e) })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(search) }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const { data } = await adminApi.createUser(form)
      toast({ type: 'success', title: 'User created', message: `${data.email} (${data.userType}) created successfully.` })
      setShowModal(false)
      setForm({ email: '', password: '', userType: 'admin' })
      load()
    } catch (e) {
      const fe = fieldErrors(e)
      if (Object.keys(fe).length) { setErrors(fe) }
      else { toast({ type: 'error', title: 'Failed to create user', message: errorMessage(e) }) }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return
    setDeletingId(user.id)
    try {
      await adminApi.deleteUser(user.id)
      toast({ type: 'success', title: 'User deleted', message: user.email })
      setUsers(prev => prev.filter(u => u.id !== user.id))
      setTotal(t => t - 1)
    } catch (e) {
      toast({ type: 'error', title: 'Failed to delete', message: errorMessage(e) })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users size={22} className="text-sky-500" /> User Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">{total.toLocaleString()} registered users</p>
        </div>
        <Button onClick={() => setShowModal(true)} size="sm">
          <Plus size={14} /> Create User
        </Button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by email…"
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">Search</Button>
        {search && <Button variant="secondary" size="sm" onClick={() => { setSearch(''); load('') }}>Clear</Button>}
      </form>

      {/* Users table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Verified</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="py-16 text-center text-sm text-slate-400">Loading…</td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr><td colSpan={5} className="py-16 text-center text-sm text-slate-400">No users found</td></tr>
              )}
              {users.map(u => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600 uppercase">
                        {u.email[0]}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{u.email}</p>
                        {u.displayName && <p className="text-xs text-slate-400">{u.displayName}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4"><RoleBadge role={u.userType} /></td>
                  <td className="py-3 px-4">
                    {u.verified
                      ? <span className="flex items-center gap-1 text-xs text-emerald-600"><UserCheck size={13} /> Verified</span>
                      : <span className="text-xs text-slate-400">Pending</span>}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDelete(u)}
                      disabled={deletingId === u.id}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                      title="Delete user"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Create User</h2>
            <p className="text-sm text-slate-500 mb-5">Account will be pre-verified — no email confirmation needed.</p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="user@example.com"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 8 characters"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                />
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Role</label>
                <select
                  value={form.userType}
                  onChange={e => setForm(f => ({ ...f, userType: e.target.value as CreateForm['userType'] }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                >
                  <option value="admin">Admin</option>
                  <option value="hr">HR / Employer</option>
                  <option value="job_seeker">Job Seeker</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? 'Creating…' : 'Create User'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setShowModal(false); setErrors({}) }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
