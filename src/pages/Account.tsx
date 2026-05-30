import { BadgeCheck, Camera, KeyRound, Phone, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { PasswordInput } from '../components/PasswordInput'
import { PasswordStrength, passwordMeetsAllRules } from '../components/PasswordStrength'
import { useToastStore } from '../components/Toast'
import { Button, Card, Field, Input, Select } from '../components/ui'
import { errorMessage, userApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { compressAvatar, initials } from '../utils/format'

const COUNTRIES = [
  'United Arab Emirates', 'India', 'Pakistan', 'Philippines', 'Egypt',
  'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Oman',
  'Lebanon', 'Jordan', 'Bangladesh', 'Sri Lanka', 'Nepal',
  'United Kingdom', 'United States', 'Canada', 'Australia',
  'France', 'Germany', 'Nigeria', 'Kenya', 'South Africa', 'Other',
]

function SectionHeading({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-pink-50 text-pink-600">
        <Icon size={15} />
      </span>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">{title}</h2>
    </div>
  )
}

export default function AccountPage() {
  const toast = useToastStore((s) => s.add)
  const { user, updateUser } = useAuthStore()

  // ── Personal info ──────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [phone, setPhone]             = useState(user?.phone ?? '')
  const [country, setCountry]         = useState(user?.country ?? '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl ?? null)
  const [avatarPending, setAvatarPending] = useState<string | null>(null)
  const [savingInfo, setSavingInfo] = useState(false)

  // ── Change password ────────────────────────────────────────────────────────
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd]         = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdError, setPwdError]     = useState('')
  const [savingPwd, setSavingPwd]   = useState(false)
  const [pwdDone, setPwdDone]       = useState(false)

  // ── Avatar ─────────────────────────────────────────────────────────────────
  async function pickAvatar(file?: File) {
    if (!file) return
    try {
      const compressed = await compressAvatar(file)
      setAvatarPending(compressed)
      setAvatarPreview(compressed)
    } catch {
      toast({ type: 'error', title: 'Could not process image', message: 'Please try a different photo.' })
    }
  }

  // ── Save personal info ─────────────────────────────────────────────────────
  async function saveInfo() {
    setSavingInfo(true)
    try {
      const payload: Parameters<typeof userApi.updateProfile>[0] = { displayName, phone, country }
      if (avatarPending !== null) payload.avatarUrl = avatarPending
      const { data } = await userApi.updateProfile(payload)
      updateUser({ ...user!, ...data })
      setAvatarPending(null)
      toast({ type: 'success', title: 'Account updated' })
    } catch (error) {
      toast({ type: 'error', title: 'Could not update account', message: errorMessage(error) })
    } finally {
      setSavingInfo(false)
    }
  }

  // ── Change password ────────────────────────────────────────────────────────
  async function changePwd() {
    setPwdError('')
    if (!currentPwd) { setPwdError('Enter your current password.'); return }
    if (!passwordMeetsAllRules(newPwd)) { setPwdError('New password does not meet all requirements.'); return }
    if (newPwd !== confirmPwd) { setPwdError('Passwords do not match.'); return }

    setSavingPwd(true)
    try {
      await userApi.changePassword(currentPwd, newPwd)
      setPwdDone(true)
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
      toast({ type: 'success', title: 'Password changed', message: 'Other active sessions have been signed out.' })
    } catch (error) {
      setPwdError(errorMessage(error) ?? 'Could not change password.')
    } finally {
      setSavingPwd(false)
    }
  }

  const avatarLabel = initials(user?.displayName || user?.email)
  const roleLabel = user?.userType === 'hr' ? 'HR / Employer' : user?.userType === 'admin' ? 'Admin' : 'Job Seeker'
  const roleColor = user?.userType === 'hr'
    ? 'bg-indigo-50 text-indigo-700 ring-indigo-200'
    : user?.userType === 'admin'
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : 'bg-pink-50 text-pink-700 ring-pink-200'

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-center gap-5">
        <label className="group relative h-20 w-20 shrink-0 cursor-pointer" title="Change profile photo">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-pink-500 to-pink-700 text-2xl font-bold text-white shadow-lg">
            {avatarPreview
              ? <img src={avatarPreview} alt="Profile photo" className="h-full w-full object-cover" />
              : avatarLabel}
          </div>
          {/* Camera overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 rounded-full bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera size={18} className="text-white" />
            <span className="text-[10px] font-semibold text-white">Change</span>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => pickAvatar(e.target.files?.[0])} />
          {avatarPending && (
            <span
              className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 ring-2 ring-white text-[9px] font-bold text-white"
              title="Unsaved photo — click Save to apply"
            >!</span>
          )}
        </label>

        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-slate-950">
            {user?.displayName || user?.email}
          </h1>
          <p className="mt-0.5 truncate text-sm text-slate-500">{user?.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${roleColor}`}>
              {roleLabel}
            </span>
            {user?.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                <BadgeCheck size={11} /> Verified
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                Email not verified
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5">

        {/* ── Personal information ─────────────────────────────────────────── */}
        <Card>
          <SectionHeading icon={Phone} title="Personal information" />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Email address">
              <Input value={user?.email ?? ''} disabled className="cursor-not-allowed bg-slate-50 text-slate-500" />
            </Field>
            <Field label="Display name">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name as shown in the app"
              />
            </Field>
            <Field label="Phone number">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+971 50 000 0000"
                type="tel"
              />
            </Field>
            <Field label="Country">
              <Select value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value="">Select country</option>
                {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            {avatarPending && (
              <p className="text-xs text-amber-600">⚠ New photo will be saved when you click Save.</p>
            )}
            <div className="ml-auto">
              <Button onClick={saveInfo} disabled={savingInfo} className="px-8">
                {savingInfo ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </Card>

        {/* ── Change password ───────────────────────────────────────────────── */}
        <Card>
          <SectionHeading icon={KeyRound} title="Change password" />

          {pwdDone ? (
            <div className="flex items-start gap-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold">Password updated successfully.</p>
                <p className="mt-0.5 text-emerald-700">
                  Other active sessions have been signed out for security.{' '}
                  <button
                    className="underline hover:no-underline"
                    onClick={() => setPwdDone(false)}
                  >
                    Change again
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <Field label="Current password">
                <PasswordInput
                  value={currentPwd}
                  onChange={(e) => { setCurrentPwd(e.target.value); setPwdError('') }}
                  autoComplete="current-password"
                  placeholder="Your current password"
                />
              </Field>
              <Field label="New password">
                <PasswordInput
                  value={newPwd}
                  onChange={(e) => { setNewPwd(e.target.value); setPwdError('') }}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                />
              </Field>
              {newPwd && (
                <div className="-mt-2">
                  <PasswordStrength value={newPwd} />
                </div>
              )}
              <Field label="Confirm new password">
                <PasswordInput
                  value={confirmPwd}
                  onChange={(e) => { setConfirmPwd(e.target.value); setPwdError('') }}
                  autoComplete="new-password"
                  placeholder="Repeat new password"
                  aria-invalid={!!confirmPwd && confirmPwd !== newPwd}
                />
                {confirmPwd && confirmPwd !== newPwd && (
                  <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>
                )}
              </Field>
              {pwdError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{pwdError}</p>
              )}
              <div className="flex justify-end">
                <Button
                  onClick={changePwd}
                  disabled={savingPwd || !currentPwd || !newPwd || !confirmPwd}
                  className="px-8"
                >
                  {savingPwd ? 'Changing…' : 'Change password'}
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* ── Security note ─────────────────────────────────────────────────── */}
        <p className="text-center text-xs text-slate-400">
          Changing your password signs out all other active devices and sessions.
        </p>

      </div>
    </div>
  )
}
