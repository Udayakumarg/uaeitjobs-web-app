import { BadgeCheck, Bot, Building2, FileText, GraduationCap, Plus, Tag, Upload, User, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CardSkeleton } from '../../components/Skeleton'
import { useToastStore } from '../../components/Toast'
import { Button, Card, Field, Input, Select, Textarea } from '../../components/ui'
import { downloadAuthenticated, errorMessage, seekerAiApi, seekerApi, type AiProvider, type AiSettings } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import type { JobSeekerProfile } from '../../types'
import { initials, parseSkills } from '../../utils/format'

const AI_PROVIDERS: { value: AiProvider; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'claude', label: 'Anthropic (Claude)' },
  { value: 'gemini', label: 'Google (Gemini)' },
]

const VISA_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'Employment Visa', label: 'Employment Visa' },
  { value: 'Visit Visa', label: 'Visit Visa' },
  { value: 'Own Visa', label: 'Own / Self Sponsored' },
  { value: 'Free Visa', label: 'Free Visa (Employer Sponsored)' },
  { value: 'Residence Visa', label: 'Residence Visa' },
  { value: 'Freelance Permit', label: 'Freelance Permit' },
  { value: 'Citizen', label: 'UAE Citizen' },
]

const initial: JobSeekerProfile = {
  headline: '', summary: '', yearsExperience: 0,
  visaStatus: '', skills: '', experience: '', education: '',
}

function fromSkillsJson(raw: string | undefined): string[] {
  return parseSkills(raw)
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

export default function JobSeekerProfilePage() {
  const toast = useToastStore((s) => s.add)
  const { user } = useAuthStore()

  const [profile, setProfile] = useState<JobSeekerProfile>(initial)
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [aiSettings, setAiSettings]     = useState<AiSettings>({ provider: null, configured: false, maskedKey: null })
  const [aiProvider, setAiProvider]     = useState<AiProvider>('openai')
  const [aiKeyInput, setAiKeyInput]     = useState('')
  const [aiSaving, setAiSaving]         = useState(false)

  const skillInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    seekerApi.profile()
      .then(({ data }) => {
        setProfile({ ...initial, ...data })
        setSkills(fromSkillsJson(data.skills))
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
    seekerAiApi.settings()
      .then(({ data }) => { setAiSettings(data); if (data.provider) setAiProvider(data.provider) })
      .catch(() => undefined)
  }, [])

  function update<K extends keyof JobSeekerProfile>(key: K, value: JobSeekerProfile[K]) {
    setProfile((c) => ({ ...c, [key]: value }))
  }

  function addSkill() {
    const trimmed = skillInput.trim()
    if (!trimmed || skills.includes(trimmed)) { setSkillInput(''); return }
    setSkills((prev) => [...prev, trimmed])
    setSkillInput('')
    skillInputRef.current?.focus()
  }

  function removeSkill(skill: string) {
    setSkills((prev) => prev.filter((s) => s !== skill))
  }

  async function saveProfile() {
    setSaving(true)
    try {
      const payload = { ...profile, skills: JSON.stringify(skills) }
      const { data } = await seekerApi.saveProfile(payload)
      setProfile({ ...initial, ...data })
      setSkills(fromSkillsJson(data.skills))
      toast({ type: 'success', title: 'Profile saved' })
    } catch (error) {
      toast({ type: 'error', title: 'Could not save profile', message: errorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  async function uploadCv(file?: File) {
    if (!file) return
    try {
      const { data } = await seekerApi.uploadCv(file)
      setProfile((c) => ({ ...c, cvUrl: data.cvUrl }))
      toast({ type: 'success', title: 'CV uploaded' })
    } catch (error) {
      toast({ type: 'error', title: 'Upload failed', message: errorMessage(error) })
    }
  }

  async function saveAiKey() {
    if (!aiKeyInput.trim()) { toast({ type: 'info', title: 'Enter an API key first' }); return }
    setAiSaving(true)
    try {
      const { data } = await seekerAiApi.saveSettings(aiProvider, aiKeyInput.trim())
      setAiSettings(data)
      setAiKeyInput('')
      toast({ type: 'success', title: 'AI key saved' })
    } catch (error) {
      toast({ type: 'error', title: 'Could not save key', message: errorMessage(error) })
    } finally {
      setAiSaving(false)
    }
  }

  async function removeAiKey() {
    setAiSaving(true)
    try {
      await seekerAiApi.removeSettings()
      setAiSettings({ provider: null, configured: false, maskedKey: null })
      toast({ type: 'success', title: 'AI key removed' })
    } catch (error) {
      toast({ type: 'error', title: 'Could not remove key', message: errorMessage(error) })
    } finally {
      setAiSaving(false)
    }
  }

  const avatarInitials = initials(user?.displayName || user?.email)
  const displayLabel   = user?.displayName || user?.email || 'Job Seeker'

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-4">
        {/* Avatar — click goes to /account to edit */}
        <Link to="/account" title="Edit photo & account details" className="group relative h-16 w-16 shrink-0">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-pink-500 to-pink-700 text-xl font-bold text-white shadow-md ring-2 ring-transparent transition group-hover:ring-pink-300">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="Profile photo" className="h-full w-full object-cover" />
              : avatarInitials}
          </div>
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35 opacity-0 transition-opacity group-hover:opacity-100">
            <User size={16} className="text-white" />
          </div>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-950">{displayLabel}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2.5 py-0.5 text-xs font-semibold text-pink-700 ring-1 ring-inset ring-pink-200">
              Job Seeker
            </span>
            {user?.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                <BadgeCheck size={11} /> Verified
              </span>
            ) : null}
            {profile.yearsExperience ? (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                {profile.yearsExperience} yr{profile.yearsExperience !== 1 ? 's' : ''} exp
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {loading ? (
        <div aria-live="polite" aria-busy="true">
          <span className="sr-only">Loading profile</span>
          <CardSkeleton lines={6} />
        </div>
      ) : (
        <div className="grid gap-5">

          {/* ── Professional profile ─────────────────────────────────────── */}
          <Card>
            <SectionHeading icon={User} title="Professional profile" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field label="Headline">
                  <Input
                    value={profile.headline ?? ''}
                    onChange={(e) => update('headline', e.target.value)}
                    placeholder="e.g. Senior React Developer · 5 yrs UAE experience"
                  />
                </Field>
              </div>
              <Field label="Years of experience">
                <Input
                  type="number" min={0} max={50}
                  value={profile.yearsExperience ?? 0}
                  onChange={(e) => update('yearsExperience', Number(e.target.value))}
                />
              </Field>
              <Field label="Visa / work status">
                <Select
                  value={profile.visaStatus ?? ''}
                  onChange={(e) => update('visaStatus', e.target.value)}
                >
                  {VISA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Summary">
                <Textarea
                  rows={4}
                  value={profile.summary ?? ''}
                  onChange={(e) => update('summary', e.target.value)}
                  placeholder="A brief overview of your background, strengths, and career goals…"
                />
              </Field>
            </div>
          </Card>

          {/* ── Skills ─────────────────────────────────────────────────────── */}
          <Card>
            <SectionHeading icon={Tag} title="Skills" />
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-3 py-1 text-sm font-medium text-pink-800 ring-1 ring-inset ring-pink-200"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-pink-200 focus-visible:outline-none"
                    aria-label={`Remove ${skill}`}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              {skills.length === 0 && <p className="text-sm text-slate-400">No skills added yet.</p>}
            </div>
            <div className="mt-4 flex gap-2">
              <Input
                ref={skillInputRef}
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
                placeholder="e.g. React, Java, AWS…"
                className="max-w-xs"
              />
              <Button type="button" variant="secondary" size="sm" onClick={addSkill}>
                <Plus size={14} /> Add
              </Button>
            </div>
          </Card>

          {/* ── Work experience ─────────────────────────────────────────────── */}
          <Card>
            <SectionHeading icon={Building2} title="Work experience" />
            <Field label="">
              <Textarea
                rows={6}
                value={profile.experience ?? ''}
                onChange={(e) => update('experience', e.target.value)}
                placeholder="List your work history — company name, role, dates, and key achievements…"
              />
            </Field>
          </Card>

          {/* ── Education ──────────────────────────────────────────────────── */}
          <Card>
            <SectionHeading icon={GraduationCap} title="Education" />
            <Field label="">
              <Textarea
                rows={4}
                value={profile.education ?? ''}
                onChange={(e) => update('education', e.target.value)}
                placeholder="e.g. B.Sc. Computer Science — University of Dubai, 2018"
              />
            </Field>
          </Card>

          {/* ── AI cover letter drafting ──────────────────────────────────── */}
          <Card>
            <SectionHeading icon={Bot} title="AI cover letter drafting" />
            <p className="mb-4 text-sm leading-6 text-slate-600">
              Add your own API key from OpenAI, Anthropic, or Google to draft a tailored cover letter
              for any job in one click — using this profile and the job description. You review and edit
              before applying; nothing is ever submitted automatically. Usage is billed to your own account
              with the provider, not to UAEITJOBS.
            </p>
            <div className="grid gap-4 sm:grid-cols-[160px_1fr_auto]">
              <Field label="Provider">
                <Select value={aiProvider} onChange={(e) => setAiProvider(e.target.value as AiProvider)}>
                  {AI_PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </Select>
              </Field>
              <Field label="API key">
                <Input
                  type="password"
                  value={aiKeyInput}
                  onChange={(e) => setAiKeyInput(e.target.value)}
                  placeholder={aiSettings.configured ? `Configured — ${aiSettings.maskedKey}` : 'sk-…'}
                />
              </Field>
              <div className="flex items-end">
                <Button type="button" size="sm" onClick={saveAiKey} disabled={aiSaving} className="whitespace-nowrap">
                  {aiSaving ? 'Saving…' : 'Save key'}
                </Button>
              </div>
            </div>
            {aiSettings.configured && (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span>
                  {AI_PROVIDERS.find((p) => p.value === aiSettings.provider)?.label} key configured
                  ({aiSettings.maskedKey}) — you'll see "Draft with AI" on job pages.
                </span>
                <button
                  type="button"
                  onClick={removeAiKey}
                  disabled={aiSaving}
                  className="font-semibold text-rose-600 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            )}
          </Card>

          {/* ── CV ─────────────────────────────────────────────────────────── */}
          <Card>
            <SectionHeading icon={FileText} title="CV / Résumé" />
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50">
                <Upload size={15} /> Upload CV
                <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => uploadCv(e.target.files?.[0])} />
              </label>
              {profile.cvUrl ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-pink-700 hover:underline"
                  onClick={() =>
                    downloadAuthenticated(profile.cvUrl!, 'my-cv').catch((error) =>
                      toast({ type: 'error', title: 'Could not download CV', message: errorMessage(error) }),
                    )
                  }
                >
                  <FileText size={14} /> View current CV
                </button>
              ) : (
                <p className="text-sm text-slate-400">No CV uploaded yet.</p>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-400">Accepted formats: PDF, DOC, DOCX · Max 5 MB</p>
          </Card>

          <div className="flex items-center justify-between gap-4">
            <Link to="/account" className="text-sm text-slate-500 hover:text-pink-700 hover:underline">
              ← Account settings (name, photo, password)
            </Link>
            <Button onClick={saveProfile} disabled={saving} className="px-8">
              {saving ? 'Saving…' : 'Save profile'}
            </Button>
          </div>

        </div>
      )}
    </div>
  )
}
