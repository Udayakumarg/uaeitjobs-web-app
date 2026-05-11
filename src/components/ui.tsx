import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'
import clsx from 'clsx'

export function cn(...classes: Parameters<typeof clsx>) {
  return twMerge(clsx(classes))
}

export function Button({ className, variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return (
    <button
      className={cn(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' && 'bg-blue-700 text-white hover:bg-blue-800',
        variant === 'secondary' && 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
        variant === 'ghost' && 'text-slate-700 hover:bg-slate-100',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
        className,
      )}
      {...props}
    />
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn('min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400', props['aria-invalid'] && 'border-red-500 bg-red-50', props.className)} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn('min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400', props['aria-invalid'] && 'border-red-500 bg-red-50', props.className)} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn('min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950', props['aria-invalid'] && 'border-red-500 bg-red-50', props.className)} />
}

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs font-medium text-red-600" role="alert">{error}</span> : null}
    </label>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-lg border border-slate-200 bg-white p-5 shadow-sm', className)}>{children}</div>
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'blue' | 'green' | 'amber' | 'red' }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', {
    'bg-slate-100 text-slate-700': tone === 'slate',
    'bg-blue-100 text-blue-800': tone === 'blue',
    'bg-green-100 text-green-800': tone === 'green',
    'bg-amber-100 text-amber-800': tone === 'amber',
    'bg-red-100 text-red-800': tone === 'red',
  })}>{children}</span>
}

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600"><p>{title}</p>{action ? <div className="mt-4">{action}</div> : null}</div>
}
