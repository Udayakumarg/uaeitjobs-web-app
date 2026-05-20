import { useState } from 'react'
import { initials } from '../utils/format'

interface CompanyLogoProps {
  logoUrl?: string | null
  companyName?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: { outer: 'h-9 w-9 rounded-lg text-xs',  img: 'h-9 w-9 rounded-lg p-1' },
  md: { outer: 'h-11 w-11 rounded-xl text-sm', img: 'h-11 w-11 rounded-xl p-1.5' },
  lg: { outer: 'h-16 w-16 rounded-2xl text-lg', img: 'h-16 w-16 rounded-2xl p-2' },
}

/**
 * Shows the company's Clearbit logo when available;
 * falls back to a stylised initials avatar when the image 404s or no URL is provided.
 */
export function CompanyLogo({ logoUrl, companyName, size = 'md', className = '' }: CompanyLogoProps) {
  const [error, setError] = useState(false)
  const s = sizeMap[size]
  const name = companyName ?? ''

  if (logoUrl && !error) {
    return (
      <img
        src={logoUrl}
        alt={name}
        onError={() => setError(true)}
        className={`${s.img} shrink-0 bg-white object-contain ring-1 ring-inset ring-slate-200 ${className}`}
      />
    )
  }

  return (
    <div
      className={`${s.outer} shrink-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50 font-bold tracking-tight text-slate-700 ring-1 ring-inset ring-slate-200 ${className}`}
    >
      {initials(name)}
    </div>
  )
}
