import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'
export type Accent = 'pink' | 'blue' | 'teal' | 'green' | 'graphite'

export const ACCENTS: { key: Accent; label: string; swatch: string }[] = [
  { key: 'pink', label: 'Rose', swatch: '#be185d' },
  { key: 'blue', label: 'Blue', swatch: '#1d4ed8' },
  { key: 'teal', label: 'Teal', swatch: '#0f766e' },
  { key: 'green', label: 'Green', swatch: '#15803d' },
  { key: 'graphite', label: 'Graphite', swatch: '#334155' },
]

// Accents renamed or retired in an earlier release; map saved choices to the closest current one.
const LEGACY_ACCENTS: Record<string, Accent> = { indigo: 'blue', emerald: 'green', orange: 'pink' }

const MODE_KEY = 'uaeitjobs.theme'
const ACCENT_KEY = 'uaeitjobs.accent'
const THEME_COLOR = { light: '#4338ca', dark: '#0b1220' }

function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = localStorage.getItem(key) as T | null
    return value && allowed.includes(value) ? value : fallback
  } catch {
    return fallback
  }
}

function readAccent(): Accent {
  try {
    const saved = localStorage.getItem(ACCENT_KEY) ?? ''
    if (ACCENTS.some((a) => a.key === saved)) return saved as Accent
    return LEGACY_ACCENTS[saved] ?? 'pink'
  } catch {
    return 'pink'
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage blocked (private mode) — the choice still applies for this session
  }
}

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

export function applyTheme(mode: ThemeMode, accent: Accent) {
  const resolved = mode === 'system' ? (prefersDark() ? 'dark' : 'light') : mode
  const root = document.documentElement
  root.dataset.theme = resolved
  root.dataset.accent = accent
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[resolved])
}

interface ThemeState {
  mode: ThemeMode
  accent: Accent
  setMode: (mode: ThemeMode) => void
  setAccent: (accent: Accent) => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: read<ThemeMode>(MODE_KEY, ['light', 'dark', 'system'], 'system'),
  accent: readAccent(),
  setMode: (mode) => {
    write(MODE_KEY, mode)
    set({ mode })
    applyTheme(mode, get().accent)
  },
  setAccent: (accent) => {
    write(ACCENT_KEY, accent)
    set({ accent })
    applyTheme(get().mode, accent)
  },
}))

export function initTheme() {
  const { mode, accent } = useThemeStore.getState()
  applyTheme(mode, accent)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const state = useThemeStore.getState()
    if (state.mode === 'system') applyTheme('system', state.accent)
  })
}
