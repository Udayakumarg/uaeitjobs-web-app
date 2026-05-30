import { BadgeCheck, Building2, Globe, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CardSkeleton } from '../../components/Skeleton'
import { useToastStore } from '../../components/Toast'
import { Button, Card, Field, Input, Select } from '../../components/ui'
import { errorMessage, hrApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import type { HRProfile } from '../../types'
import { initials } from '../../utils/format'

const INDUSTRIES = [
  '', 'Technology', 'Finance & Banking', 'Healthcare', 'E-commerce / Retail',
  'Telecommunications', 'Government & Public Sector', 'Oil & Gas',
  'Construction & Real Estate', 'Education', 'Media & Entertainment',
  'Logistics & Transportation', 'Hospitality & Tourism', 'Consulting', 'Other',
]

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  free:       { label: 'Free',       color: 'bg-slate-100 text-slate-600' },
  starter:    { label: 'Starter',    color: 'bg-blue-50 text-blue-700' },
  growth:     { label: 'Growth',     color: 'bg-indigo-50 text-indigo-700' },
  enterprise: { label: 'Enterprise', color: 'bg-amber-50 text-amber-700' },
}

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

const emptyProfile: HRProfile = { companyName: '', companyLogoUrl: '', website: '', industry: '', subscriptionTier: 'free' }

export default function HRProfilePage() {
  const toast = useToastStore((s) => s.add)
  const { user } = useAuthStore()

  const [hrProfile, setHrProfile] = useState<HRProfile>(emptyProfile)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    hrApi.profile()
      .then(({ data }) => setHrProfile({ ...emptyProfile, ...data }))
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])

  async function saveCompanyProfile() {
    if (!hrProfile.companyName.trim()) {
      toast({ type: 'error', title: 'Company name is required' })
      return
    }
    setSaving(true)
    try {
      const { data } = await hrApi.saveProfile(hrProfile)
      setHrProfile({ ...emptyProfile, ...data })
      toast({ type: 'success', title: 'Company profile saved' })
    } catch (error) {
      toast({ type: 'error', title: 'Could not save profile', message: errorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  const companyInitials = initials(hrProfile.companyName || user?.displayName || user?.email)
  const tier     = hrProfile.subscriptionTier ?? 'free'
  const tierInfo = TIER_LABELS[tier] ?? { label: tier, color: 'bg-slate-100 text-slate-600' }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-4">
        {/* Avatar — click goes to /account to edit photo */}
        <Link to="/account" title="Edit photo & account details" className="group relative h-16 w-16 shrink-0">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-xl font-bold text-white shadow-md ring-2 ring-transparent transition group-hover:ring-indigo-300">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="Profile photo" className="h-full w-full object-cover" />
              : companyInitials}
          </div>
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35 opacity-0 transition-opacity group-hover:opacity-100 text-[10px] font-semibold text-white">
            Edit
          </div>
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            {hrProfile.companyName || 'Company profile'}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
              HR / Employer
            </span>
            {user?.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                <BadgeCheck size={11} /> Verified
              </span>
            ) : null}
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tierInfo.color}`}>
              <Star size={10} /> {tierInfo.label}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div aria-live="polite" aria-busy="true">
          <span className="sr-only">Loading profile</span>
          <CardSkeleton lines={5} />
        </div>
      ) : (
        <div className="grid gap-5">

          {/* ── Company profile ───────────────────────────────────────────── */}
          <Card>
            <SectionHeading icon={Building2} title="Company profile" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field label="Company name *">
                  <Input
                    value={hrProfile.companyName}
                    onChange={(e) => setHrProfile((c) => ({ ...c, companyName: e.target.value }))}
                    placeholder="e.g. Acme Technologies LLC"
                  />
                </Field>
              </div>
              <Field label="Website">
                <Input
                  value={hrProfile.website ?? ''}
                  onChange={(e) => setHrProfile((c) => ({ ...c, website: e.target.value }))}
                  placeholder="https://www.yourcompany.com"
                  type="url"
                />
              </Field>
              <Field label="Industry">
                <Select
                  value={hrProfile.industry ?? ''}
                  onChange={(e) => setHrProfile((c) => ({ ...c, industry: e.target.value }))}
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.filter(Boolean).map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </Select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Company logo URL">
                  <Input
                    value={hrProfile.companyLogoUrl ?? ''}
                    onChange={(e) => setHrProfile((c) => ({ ...c, companyLogoUrl: e.target.value }))}
                    placeholder="https://cdn.yourcompany.com/logo.png"
                    type="url"
                  />
                </Field>
              </div>
            </div>

            {/* Subscription tier — display only */}
            <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Subscription plan</p>
                  <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-semibold ${tierInfo.color}`}>
                    <Star size={12} /> {tierInfo.label}
                  </span>
                </div>
                <Globe size={20} className="text-slate-300" />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                To upgrade, contact{' '}
                <a href="mailto:hello@uaeitjobs.com" className="text-pink-600 hover:underline">hello@uaeitjobs.com</a>
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <Link to="/account" className="text-sm text-slate-500 hover:text-pink-700 hover:underline">
                ← Account settings (name, photo, password)
              </Link>
              <Button onClick={saveCompanyProfile} disabled={saving} className="px-8">
                {saving ? 'Saving…' : 'Save company profile'}
              </Button>
            </div>
          </Card>

        </div>
      )}
    </div>
  )
}
