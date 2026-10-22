import { Check, Monitor, Moon, Palette, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ACCENTS, useThemeStore, type ThemeMode } from '../store/themeStore'

const MODES: { key: ThemeMode; label: string; icon: typeof Sun }[] = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'system', label: 'System', icon: Monitor },
]

export function ThemeMenu({ align = 'right' }: { align?: 'left' | 'right' }) {
  const { mode, accent, setMode, setAccent } = useThemeStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Theme and colour"
        aria-haspopup="true"
        aria-expanded={open}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
      >
        <Palette className="h-[18px] w-[18px]" />
      </button>

      {open ? (
        <div
          role="menu"
          className={`absolute top-full z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Theme</p>
          <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
            {MODES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="menuitemradio"
                aria-checked={mode === key}
                onClick={() => setMode(key)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                  mode === key ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Accent colour</p>
          <div className="mt-2 flex items-center gap-2">
            {ACCENTS.map(({ key, label, swatch }) => (
              <button
                key={key}
                type="button"
                role="menuitemradio"
                aria-checked={accent === key}
                aria-label={label}
                title={label}
                onClick={() => setAccent(key)}
                className="relative h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-white transition hover:scale-110"
                style={{ background: swatch, ['--tw-ring-color' as string]: accent === key ? swatch : 'transparent', ['--tw-ring-offset-color' as string]: 'var(--surface)' }}
              >
                {accent === key ? <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white" strokeWidth={3} /> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
