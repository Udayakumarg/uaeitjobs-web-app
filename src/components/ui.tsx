import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'
import clsx from 'clsx'

export function cn(...classes: Parameters<typeof clsx>) {
  return twMerge(clsx(classes))
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ className, variant = 'primary', size = 'md', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]',
        size === 'sm' && 'min-h-9 px-3 py-1.5 text-xs',
        size === 'md' && 'min-h-10 px-4 py-2 text-sm',
        size === 'lg' && 'min-h-12 px-6 py-3 text-base',
        variant === 'primary' && 'bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-sm shadow-blue-700/20 hover:from-blue-700 hover:to-blue-800 hover:shadow-md',
        variant === 'secondary' && 'border border-slate-200 bg-white text-slate-800 shadow-sm hover:border-slate-300 hover:bg-slate-50',
        variant === 'subtle' && 'bg-blue-50 text-blue-700 hover:bg-blue-100',
        variant === 'ghost' && 'text-slate-700 hover:bg-slate-100',
        variant === 'danger' && 'bg-red-600 text-white shadow-sm shadow-red-700/20 hover:bg-red-700',
        className,
      )}
      {...props}
    />
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400',
        'hover:border-slate-300',
        'focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15',
        props['aria-invalid'] && 'border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-red-500/15',
        props.className,
      )}
    />
  )
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        'min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400',
        'hover:border-slate-300',
        'focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15',
        props['aria-invalid'] && 'border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-red-500/15',
        props.className,
      )}
    />
  )
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'min-h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3.5 py-2 pr-9 text-sm text-slate-900 shadow-sm transition',
        'hover:border-slate-300',
        'focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15',
        props['aria-invalid'] && 'border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-red-500/15',
        'bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2020%2020%27%20fill%3D%27%2364748b%27%3E%3Cpath%20fill-rule%3D%27evenodd%27%20d%3D%27M5.23%207.21a.75.75%200%20011.06.02L10%2011.06l3.71-3.83a.75.75%200%20111.08%201.04l-4.25%204.39a.75.75%200%2001-1.08%200L5.21%208.27a.75.75%200%2001.02-1.06z%27%20clip-rule%3D%27evenodd%27%2F%3E%3C%2Fsvg%3E")] bg-[length:18px_18px] bg-[right_0.75rem_center] bg-no-repeat',
        props.className,
      )}
    />
  )
}

export function Field({
  label,
  error,
  hint,
  children,
  required,
}: {
  label: string
  error?: string
  hint?: string
  children: ReactNode
  required?: boolean
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="flex items-center gap-1 font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-500">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="text-xs font-medium text-red-600" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-slate-500">{hint}</span>
      ) : null}
    </label>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.08)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode
  tone?: 'slate' | 'blue' | 'green' | 'amber' | 'red'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        tone === 'slate' && 'bg-slate-50 text-slate-700 ring-slate-200',
        tone === 'blue' && 'bg-blue-50 text-blue-700 ring-blue-200',
        tone === 'green' && 'bg-green-50 text-green-700 ring-green-200',
        tone === 'amber' && 'bg-amber-50 text-amber-700 ring-amber-200',
        tone === 'red' && 'bg-red-50 text-red-700 ring-red-200',
      )}
    >
      {children}
    </span>
  )
}

export function EmptyState({ title, action, description }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
      <p className="text-base font-semibold text-slate-900">{title}</p>
      {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}
