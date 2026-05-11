import { ArrowRight, BriefcaseBusiness, Building2, Search, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { jobsApi } from '../services/api'
import { Button, Card } from '../components/ui'

export default function Landing() {
  const [stats, setStats] = useState({ totalJobs: 0, companies: 0, countriesRepresented: 0 })

  useEffect(() => {
    jobsApi.stats().then(({ data }) => setStats(data)).catch(() => undefined)
  }, [])

  const highlights: Array<[string, string | number, LucideIcon]> = [
    ['Active jobs', stats.totalJobs || '20+', BriefcaseBusiness],
    ['Hiring companies', stats.companies || '10+', Building2],
    ['Candidate reach', stats.countriesRepresented || 'UAE+', ShieldCheck],
  ]

  return (
    <div>
      <section className="hero-image min-h-[76vh] px-4 py-14 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex h-full max-w-7xl flex-col justify-center py-14">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
              UAE technology hiring, focused and fast
            </p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">UAEITJOBS</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-blue-50">
              Find software, cloud, data, cybersecurity, product, and IT roles across Dubai, Abu Dhabi, Sharjah, and the wider UAE.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/jobs"><Button><Search size={18} /> Browse jobs</Button></Link>
              <Link to="/register"><Button variant="secondary">Create account <ArrowRight size={18} /></Button></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-12 grid max-w-7xl gap-4 px-4 pb-12 sm:grid-cols-3 sm:px-6 lg:px-8">
        {highlights.map(([label, value, Icon]) => (
          <Card key={String(label)} className="bg-white/95">
            <Icon className="mb-3 text-blue-700" size={24} />
            <p className="text-2xl font-bold text-slate-950">{value}</p>
            <p className="text-sm text-slate-600">{label}</p>
          </Card>
        ))}
      </section>
    </div>
  )
}
