import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'
export type Accent = 'pink' | 'indigo' | 'teal' | 'emerald' | 'orange'

export const ACCENTS: { key: Accent; label: string; swatch: string }[] = [
  { key: 'pink', label: 'Rose', swatch: '#be185d' },
  { key: 'indigo', label: 'Indigo', swatch: '#4338ca' },
  { key: 'teal', label: 'Teal', swatch: '#0f766e' },
  { key: 'emerald', label: 'Emerald', swatch: '#047857' },
  { key: 'orange', label: 'Orange', swatch: '#c2410c' },
]

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
  accent: read<Accent>(ACCENT_KEY, ['pink', 'indigo', 'teal', 'emerald', 'orange'], 'pink'),
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
