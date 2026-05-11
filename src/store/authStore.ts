import { create } from 'zustand'
import type { AuthResponse, User } from '../types'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  setSession: (session: AuthResponse) => void
  logout: () => void
}

const stored = {
  accessToken: localStorage.getItem('uaeitjobs.accessToken'),
  refreshToken: localStorage.getItem('uaeitjobs.refreshToken'),
  user: localStorage.getItem('uaeitjobs.user'),
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: stored.accessToken,
  refreshToken: stored.refreshToken,
  user: stored.user ? JSON.parse(stored.user) as User : null,
  setSession: (session) => {
    localStorage.setItem('uaeitjobs.accessToken', session.accessToken)
    localStorage.setItem('uaeitjobs.refreshToken', session.refreshToken)
    localStorage.setItem('uaeitjobs.user', JSON.stringify(session.user))
    set({ accessToken: session.accessToken, refreshToken: session.refreshToken, user: session.user })
  },
  logout: () => {
    localStorage.removeItem('uaeitjobs.accessToken')
    localStorage.removeItem('uaeitjobs.refreshToken')
    localStorage.removeItem('uaeitjobs.user')
    set({ accessToken: null, refreshToken: null, user: null })
  },
}))
