import { ExternalLink } from 'lucide-react'

/**
 * Shown when we only hold a short summary of a posting. Says so plainly and sends the
 * visitor to the original listing, instead of leaving a one-line description that looks
 * like the whole job.
 */
export function FullPostingNotice({ href, sourceName }: { href: string; sourceName?: string | null }) {
  const where = sourceName ? `on ${sourceName}` : 'on the original listing'
  return (
    <div
      className="mt-8 flex flex-col gap-3 rounded-xl border border-[var(--accent-ring)] bg-[var(--accent-soft)] p-4 sm:flex-row sm:items-center sm:justify-between"
      role="note"
    >
      <p className="text-sm leading-6 text-slate-700">
        <span className="font-semibold text-slate-950">This is a short summary.</span> The employer's complete role
        details, responsibilities and requirements are {where}.
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
        style={{ background: 'var(--accent-fill)' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-fill-hover)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-fill)' }}
      >
        <ExternalLink size={14} /> Read the full posting
      </a>
    </div>
  )
}
