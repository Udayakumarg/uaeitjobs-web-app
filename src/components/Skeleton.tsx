import { cn } from './ui'

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('shimmer rounded-md', className)} />
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm" aria-hidden="true">
      <SkeletonBlock className="h-6 w-3/4" />
      <SkeletonBlock className="mt-3 h-4 w-1/2" />
      <div className="mt-5 grid gap-2">
        {Array.from({ length: lines }).map((_, index) => (
          <SkeletonBlock key={index} className={index === lines - 1 ? 'h-4 w-4/5' : 'h-4 w-full'} />
        ))}
      </div>
      <div className="mt-5 flex gap-2">
        <SkeletonBlock className="h-10 flex-1" />
        <SkeletonBlock className="h-10 w-12" />
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 4, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-hidden="true">
      <div className="grid gap-3">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }).map((__, column) => (
              <SkeletonBlock key={column} className="h-5" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
