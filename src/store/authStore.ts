import { create } from 'zustand'
import type { AuthResponse, User } from '../types'

interface AuthState {
  accessToken: string | null
  user: User | null
  setSession: (session: AuthResponse) => void
  logout: () => void
}

function storedUser() {
  const raw = localStorage.getItem('uaeitjobs.user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    localStorage.removeItem('uaeitjobs.user')
    localStorage.removeItem('uaeitjobs.accessToken')
    localStorage.removeItem('uaeitjobs.refreshToken') // legacy key — cleaned up on parse error
    return null
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: localStorage.getItem('uaeitjobs.accessToken'),
  user: storedUser(),

  setSession: (session) => {
    localStorage.setItem('uaeitjobs.accessToken', session.accessToken)
    localStorage.setItem('uaeitjobs.user', JSON.stringify(session.user))
    // Refresh token is now stored in an httpOnly cookie set by the backend.
    // Remove any legacy localStorage copy that may have been written by an
    // older version of the app.
    localStorage.removeItem('uaeitjobs.refreshToken')
    set({ accessToken: session.accessToken, user: session.user })
  },

  logout: () => {
    // Best-effort server-side revocation — the cookie carries the token.
    // Import lazily to avoid a circular-dependency between authStore ↔ api.
    import('../services/api').then(({ authApi }) => authApi.logout().catch(() => {}))
    localStorage.removeItem('uaeitjobs.accessToken')
    localStorage.removeItem('uaeitjobs.refreshToken') // clean up legacy key
    localStorage.removeItem('uaeitjobs.user')
    set({ accessToken: null, user: null })
  },
}))
