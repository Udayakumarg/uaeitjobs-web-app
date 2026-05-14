import { Eye, EyeOff } from 'lucide-react'
import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { cn } from './ui'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput(props, ref) {
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <input
        {...props}
        ref={ref}
        type={shown ? 'text' : 'password'}
        className={cn(
          'min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 pr-12 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400',
          'hover:border-slate-300',
          'focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-600/15',
          props['aria-invalid'] && 'border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-red-500/15',
          props.className,
        )}
      />
      <button
        type="button"
        onClick={() => setShown((value) => !value)}
        aria-label={shown ? 'Hide password' : 'Show password'}
        aria-pressed={shown}
        tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
      >
        {shown ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
})
