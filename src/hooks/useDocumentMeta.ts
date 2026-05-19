import { useEffect } from 'react'

export interface DocumentMeta {
  /** Page <title>. Will be suffixed with " · UAEITJOBS" automatically unless you set raw. */
  title: string
  /** <meta name="description"> contents. */
  description?: string
  /** Open Graph image URL — absolute. */
  image?: string
  /** Canonical URL — defaults to current location. */
  canonical?: string
  /** Override automatic " · UAEITJOBS" suffix. */
  raw?: boolean
  /** Optional structured data (JSON-LD). Pass any schema.org object. */
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>
}

const SUFFIX = ' · UAEITJOBS'
const DEFAULT_IMAGE = 'https://www.uaeitjobs.com/og-default.png'
const JSON_LD_TAG_ID = 'page-jsonld'

function setMetaTag(attr: 'name' | 'property', key: string, value: string | undefined) {
  if (typeof document === 'undefined') return
  const selector = `meta[${attr}="${key}"]`
  let tag = document.head.querySelector<HTMLMetaElement>(selector)
  if (!value) {
    tag?.remove()
    return
  }
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', value)
}

function setLink(rel: string, href: string | undefined) {
  if (typeof document === 'undefined') return
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!href) {
    tag?.remove()
    return
  }
  if (!tag) {
    tag = document.createElement('link')
    tag.setAttribute('rel', rel)
    document.head.appendChild(tag)
  }
  tag.setAttribute('href', href)
}

function setJsonLd(payload: DocumentMeta['jsonLd']) {
  if (typeof document === 'undefined') return
  const existing = document.getElementById(JSON_LD_TAG_ID)
  if (!payload) {
    existing?.remove()
    return
  }
  const script = (existing as HTMLScriptElement | null) ?? document.createElement('script')
  script.id = JSON_LD_TAG_ID
  script.type = 'application/ld+json'
  script.text = JSON.stringify(payload)
  if (!existing) document.head.appendChild(script)
}

export function useDocumentMeta(meta: DocumentMeta) {
  useEffect(() => {
    const fullTitle = meta.raw ? meta.title : `${meta.title}${SUFFIX}`
    document.title = fullTitle

    setMetaTag('name', 'description', meta.description)
    setMetaTag('property', 'og:title', fullTitle)
    setMetaTag('property', 'og:description', meta.description)
    setMetaTag('property', 'og:type', 'website')
    setMetaTag('property', 'og:image', meta.image ?? DEFAULT_IMAGE)
    setMetaTag('property', 'og:url', meta.canonical ?? window.location.href)
    setMetaTag('name', 'twitter:card', 'summary_large_image')
    setMetaTag('name', 'twitter:title', fullTitle)
    setMetaTag('name', 'twitter:description', meta.description)
    setMetaTag('name', 'twitter:image', meta.image ?? DEFAULT_IMAGE)
    setLink('canonical', meta.canonical ?? window.location.href)

    setJsonLd(meta.jsonLd)

    return () => {
      // Per-page JSON-LD should not leak into the next route
      setJsonLd(undefined)
    }
  }, [
    meta.title,
    meta.description,
    meta.image,
    meta.canonical,
    meta.raw,
    JSON.stringify(meta.jsonLd ?? null),
  ])
}
