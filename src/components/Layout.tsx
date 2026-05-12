import { BriefcaseBusiness, LogIn, Menu, UserRound, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Toasts } from './Toast'
import { Button } from './ui'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `relative text-sm font-medium transition ${
    isActive
      ? 'text-teal-700 after:absolute after:-bottom-[18px] after:left-0 after:right-0 after:h-0.5 after:bg-teal-700'
      : 'text-slate-600 hover:text-slate-950'
  }`

export function Layout() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    setOpen(false)
    navigate('/')
  }

  const links = (
    <>
      <NavLink to="/jobs" className={navClass}>
        Jobs
      </NavLink>
      {user?.userType === 'job_seeker' ? (
        <NavLink to="/seeker" className={navClass}>
          My dashboard
        </NavLink>
      ) : null}
      {user?.userType === 'hr' ? (
        <NavLink to="/hr" className={navClass}>
          HR dashboard
        </NavLink>
      ) : null}
    </>
  )

  return (
    <div className="flex min-h-screen flex-col">
      <Toasts />
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-lg font-black tracking-tight text-slate-950"
            onClick={() => setOpen(false)}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
              <BriefcaseBusiness className="h-5 w-5" />
            </span>
            <span className="text-base sm:text-lg">
              uaeit<span className="text-teal-700">jobs</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">{links}</nav>

          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  <UserRound className="h-3.5 w-3.5" />
                  {user.displayName || user.email}
                </span>
                <Button variant="secondary" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  <LogIn className="h-4 w-4" /> Sign in
                </Button>
                <Button size="sm" className="bg-slate-950 hover:bg-slate-800" onClick={() => navigate('/register')}>
                  Get started
                </Button>
              </>
            )}
          </div>

          <button
            className="rounded-md p-2 text-slate-700 hover:bg-slate-100 md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle navigation"
            aria-expanded={open}
            aria-controls="mobile-navigation"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {open ? (
          <div id="mobile-navigation" className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
            <nav className="grid gap-4" onClick={() => setOpen(false)}>
              {links}
            </nav>
            <div className="mt-4 flex gap-2">
              {user ? (
                <Button className="w-full" variant="secondary" onClick={handleLogout}>
                  Logout
                </Button>
              ) : (
                <>
                  <Button className="w-full" variant="secondary" onClick={() => navigate('/login')}>
                    Sign in
                  </Button>
                  <Button className="w-full bg-slate-950 hover:bg-slate-800" onClick={() => navigate('/register')}>
                    Get started
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-auto border-t border-slate-200 bg-white/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-950 text-white">
              <BriefcaseBusiness className="h-3.5 w-3.5" />
            </span>
            <span className="font-semibold text-slate-700">uaeitjobs</span>
            <span className="text-slate-400">- UAE tech hiring, focused.</span>
          </div>
          <span className="text-xs uppercase tracking-wider text-slate-400">
            Dubai | Abu Dhabi | Sharjah | Remote UAE
          </span>
        </div>
      </footer>
    </div>
  )
}
