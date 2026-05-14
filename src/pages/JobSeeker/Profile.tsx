import { Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CardSkeleton } from '../../components/Skeleton'
import { useToastStore } from '../../components/Toast'
import { Button, Card, Field, Input, Textarea } from '../../components/ui'
import { errorMessage, seekerApi } from '../../services/api'
import type { JobSeekerProfile } from '../../types'

const initial: JobSeekerProfile = { headline: '', summary: '', yearsExperience: 0, visaStatus: '', skills: '', experience: '', education: '' }

export default function JobSeekerProfilePage() {
  const toast = useToastStore((state) => state.add)
  const [profile, setProfile] = useState<JobSeekerProfile>(initial)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    seekerApi.profile().then(({ data }) => setProfile({ ...initial, ...data })).catch(() => undefined).finally(() => setLoading(false))
  }, [])

  function update<K extends keyof JobSeekerProfile>(key: K, value: JobSeekerProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }))
  }

  async function save() {
    setSaving(true)
    try {
      const { data } = await seekerApi.saveProfile(profile)
      setProfile({ ...initial, ...data })
      toast({ type: 'success', title: 'Profile saved' })
    } catch (error) {
      toast({ type: 'error', title: 'Could not save profile', message: errorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  async function upload(file?: File) {
    if (!file) return
    try {
      const { data } = await seekerApi.uploadCv(file)
      setProfile({ ...initial, ...data })
      toast({ type: 'success', title: 'CV uploaded' })
    } catch (error) {
      toast({ type: 'error', title: 'Upload failed', message: errorMessage(error) })
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-950">Profile</h1>
      {loading ? <div className="mt-6" aria-live="polite" aria-busy="true"><span className="sr-only">Loading profile</span><CardSkeleton lines={6} /></div> : (
        <Card className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Headline"><Input value={profile.headline ?? ''} onChange={(e) => update('headline', e.target.value)} /></Field>
            <Field label="Years experience"><Input type="number" min={0} value={profile.yearsExperience ?? 0} onChange={(e) => update('yearsExperience', Number(e.target.value))} /></Field>
            <Field label="Visa status"><Input value={profile.visaStatus ?? ''} onChange={(e) => update('visaStatus', e.target.value)} /></Field>
            <Field label="Skills"><Input value={profile.skills ?? ''} onChange={(e) => update('skills', e.target.value)} placeholder="Java, React, AWS" /></Field>
          </div>
          <div className="mt-4 grid gap-4">
            <Field label="Summary"><Textarea value={profile.summary ?? ''} onChange={(e) => update('summary', e.target.value)} /></Field>
            <Field label="Experience"><Textarea value={profile.experience ?? ''} onChange={(e) => update('experience', e.target.value)} /></Field>
            <Field label="Education"><Textarea value={profile.education ?? ''} onChange={(e) => update('education', e.target.value)} /></Field>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</Button>
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50">
              <Upload size={16} /> Upload CV
              <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(event) => upload(event.target.files?.[0])} />
            </label>
            {profile.cvUrl ? <a className="text-sm font-semibold text-indigo-700" href={profile.cvUrl} target="_blank" rel="noreferrer">View current CV</a> : null}
          </div>
        </Card>
      )}
    </main>
  )
}
