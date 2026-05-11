import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import type { UserType } from '../types'

export function ProtectedRoute({ roles }: { roles?: UserType[] }) {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.accessToken)

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && !roles.includes(user.userType)) {
    return <Navigate to="/access-denied" replace />
  }

  return <Outlet />
}
