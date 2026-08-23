import { create } from 'zustand'
import type { AuthResponse, User } from '../types'

interface AuthState {
  accessToken: string | null
  user: User | null
  setSession: (session: AuthResponse) => void
  updateUser: (user: User) => void
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

  updateUser: (user) => {
    localStorage.setItem('uaeitjobs.user', JSON.stringify(user))
    set({ user })
  },

  logout: () => {
    // Capture the token BEFORE clearing state, then fire revocation via a
    // raw fetch() instead of the axios api instance.  Using fetch() avoids:
    //   1. The circular-dependency between authStore ↔ api (no lazy import needed).
    //   2. The axios 401 interceptor, which would otherwise see the server's
    //      401 (token already cleared), attempt a token refresh, receive a new
    //      session from setSession(), and silently re-log the user back in.
    const token = localStorage.getItem('uaeitjobs.accessToken')
    // Mirror services/api.ts's apiBaseUrl() logic inline rather than
    // importing it (see the circular-dependency note above) — VITE_API_URL
    // is documented to optionally already end in /api/v1, so appending it
    // unconditionally used to produce /api/v1/api/v1/auth/logout, which
    // 404'd silently (see the .catch(() => {}) below) and left the
    // refresh-token cookie un-revoked on "logout".
    const rawBase = import.meta.env.VITE_API_URL?.replace(/\/+$/, '') ?? ''
    const base = rawBase.endsWith('/api/v1') ? rawBase : `${rawBase}/api/v1`
    fetch(`${base}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include', // sends the httpOnly refresh_token cookie for server-side revocation
    }).catch(() => {})
    localStorage.removeItem('uaeitjobs.accessToken')
    localStorage.removeItem('uaeitjobs.refreshToken') // clean up legacy key
    localStorage.removeItem('uaeitjobs.user')
    set({ accessToken: null, user: null })
  },
}))
