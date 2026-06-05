import { ArrowLeft, Building2, ExternalLink, ShieldCheck, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge, Button, Card, Container } from '../../components/ui'
import Loading from '../../components/Loading'
import { useToastStore } from '../../components/Toast'
import { companiesApi, errorMessage, statusCode } from '../../services/api'
import type { HiringActivity, HiringCompany } from '../../types'

const ACTIVITY_LABEL: Record<HiringActivity, string> = {
  ACTIVE_HIRING:   'Active hiring',
  FREQUENT_HIRING: 'Frequent hiring',
  OCCASIONAL:      'Occasional',
}
const ACTIVITY_TONE: Record<HiringActivity, 'green' | 'teal' | 'slate'> = {
  ACTIVE_HIRING:   'green',
  FREQUENT_HIRING: 'teal',
  OCCASIONAL:      'slate',
}

/**
 * Public single-company detail page — /companies/:slug.
 * Just the company header + a prominent "View open roles" CTA. We intentionally
 * keep this lightweight so it loads fast and looks credible from a LinkedIn
 * click-through.
 *
 * Emits Schema.org Organization JSON-LD so Google can build a knowledge panel.
 */
export default function CompanyDetail() {
  const { slug = '' } = useParams<{ slug: string }>()
  const toast = useToastStore()

  const [company, setCompany] = useState<HiringCompany | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    companiesApi.detail(slug)
      .then((r) => { if (!cancelled) setCompany(r.data) })
      .catch((e) => {
        if (cancelled) return
        if (statusCode(e) === 404) setNotFound(true)
        else toast.add({ type: 'error', title: 'Failed to load', message: errorMessage(e) })
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [slug, toast])

  // ── SEO meta ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!company) return
    const prevTitle = document.title
    const t = `${company.name} — IT & Tech Careers in UAE | UAEITJOBS`
    document.title = t
    setMeta(
      'description',
      company.description
        ? `${company.name}: ${company.description.slice(0, 150)}`
        : `${company.name} hires IT and technology professionals in ${company.city ?? 'the UAE'}. View open careers and recent roles.`,
    )
    return () => { document.title = prevTitle }
  }, [company])

  const jsonLd = useMemo(() => {
    if (!company) return null
    return JSON.stringify({
      '@context': 'https://schema.org',
      '@type':    'Organization',
      name:        company.name,
      url:         company.websiteUrl ?? company.careersUrl,
      description: company.description ?? undefined,
      address: company.city ? {
        '@type':       'PostalAddress',
        addressLocality: company.city,
        addressCountry: 'AE',
      } : undefined,
    })
  }, [company])

  if (loading) return <Loading />

  if (notFound || !company) {
    return (
      <Container className="py-16 text-center">
        <Building2 className="mx-auto h-10 w-10 text-slate-400" />
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Company not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          It may have been removed or isn’t yet approved.
        </p>
        <Link to="/companies" className="mt-6 inline-block">
          <Button variant="secondary"><ArrowLeft className="h-4 w-4" /> Back to directory</Button>
        </Link>
      </Container>
    )
  }

  return (
    <Container className="py-10">
      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} /> : null}

      <Link to="/companies" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-pink-700">
        <ArrowLeft className="h-4 w-4" /> All companies
      </Link>

      <Card className="mt-4 p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                {company.name}
              </h1>
              {company.featured ? (
                <Star className="h-5 w-5 fill-amber-400 stroke-amber-500" aria-label="Featured" />
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              {company.city ? <span>{company.city}</span> : null}
              {company.city && company.category ? <span aria-hidden="true">·</span> : null}
              {company.category ? <span>{company.category}</span> : null}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone={ACTIVITY_TONE[company.hiringStatus]}>{ACTIVITY_LABEL[company.hiringStatus]}</Badge>
              {company.urlVerified ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" /> Careers URL verified
                </span>
              ) : (
                <span className="text-xs text-slate-500">Careers URL pending verification</span>
              )}
            </div>
          </div>
          <a
            href={company.careersUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-pink-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-pink-800"
          >
            View open roles <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {company.description ? (
          <p className="mt-6 max-w-3xl text-base leading-7 text-slate-700">{company.description}</p>
        ) : null}

        {company.techFocus ? (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tech focus</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {company.techFocus.split('|').map((t) => t.trim()).filter(Boolean).map((t) => (
                <Badge key={t} tone="slate">{t}</Badge>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-4 border-t border-slate-200 pt-6 text-sm">
          <a
            href={company.careersUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-pink-700 hover:underline"
          >
            Careers page
          </a>
          {company.websiteUrl ? (
            <a
              href={company.websiteUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-slate-700 hover:text-pink-700 hover:underline"
            >
              Company website
            </a>
          ) : null}
          <Link to={`/jobs?q=${encodeURIComponent(company.name)}`} className="text-slate-700 hover:text-pink-700 hover:underline">
            Search jobs at {company.name}
          </Link>
        </div>
      </Card>
    </Container>
  )
}

function setMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.name = name
    document.head.appendChild(el)
  }
  el.content = content
}
