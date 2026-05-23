import { Link2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToastStore } from '../../components/Toast'
import { Button, Card, Field, Input } from '../../components/ui'
import { errorMessage, hrApi } from '../../services/api'
import type { Job } from '../../types'

export default function LinkedInImport() {
  const toast = useToastStore((state) => state.add)
  const [linkedInUrl, setLinkedInUrl] = useState('')
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit() {
    setLoading(true)
    setJob(null)
    try {
      const { data } = await hrApi.importLinkedIn(linkedInUrl)
      setJob(data)
      toast({ type: 'success', title: 'LinkedIn job imported', message: data.title })
    } catch (error) {
      toast({ type: 'error', title: 'Import failed', message: errorMessage(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-950">LinkedIn import</h1>
      <Card className="mt-6">
        <Field label="LinkedIn job URL"><Input value={linkedInUrl} onChange={(e) => setLinkedInUrl(e.target.value)} placeholder="https://www.linkedin.com/jobs/view/..." /></Field>
        <Button className="mt-4" disabled={loading || !linkedInUrl} onClick={submit}><Link2 size={16} /> {loading ? 'Importing...' : 'Import job'}</Button>
      </Card>
      {job ? (
        <Card className="mt-6">
          <p className="text-sm font-semibold uppercase text-pink-700">Imported</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">{job.title}</h2>
          <p className="mt-1 text-slate-600">{job.companyName}</p>
          <p className="mt-4 line-clamp-3 text-slate-700">{job.description}</p>
          <Link className="mt-5 inline-flex" to={`/jobs/${job.id}`}><Button variant="secondary">View job</Button></Link>
        </Card>
      ) : null}
    </main>
  )
}
