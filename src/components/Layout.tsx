import { Bookmark, BriefcaseBusiness, LayoutDashboard, LogIn, Menu, Search, UserRound, Users2, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Toasts } from './Toast'
import { Button, Container } from './ui'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium tracking-tight transition ${
    isActive
      ? 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-100'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
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
        <Search className="h-4 w-4" />
        Browse jobs
      </NavLink>
      {user?.userType === 'job_seeker' ? (
        <>
          <NavLink to="/seeker" className={navClass} end>
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </NavLink>
          <NavLink to="/seeker/saved" className={navClass}>
            <Bookmark className="h-4 w-4" />
            Saved jobs
          </NavLink>
        </>
      ) : null}
      {user?.userType === 'hr' ? (
        <NavLink to="/hr" className={navClass}>
          <Users2 className="h-4 w-4" />
          HR workspace
        </NavLink>
      ) : null}
    </>
  )

  return (
    <div className="flex min-h-screen flex-col">
      <Toasts />

      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
        <Container className="flex items-center justify-between py-3.5">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-lg font-black tracking-tight text-slate-950"
            onClick={() => setOpen(false)}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
              <BriefcaseBusiness className="h-5 w-5" />
            </span>
            <span className="text-base sm:text-lg">
              uaeit<span className="text-indigo-700">jobs</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">{links}</nav>

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
                <Button size="sm" onClick={() => navigate('/register')}>
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
        </Container>

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
                  <Button className="w-full" onClick={() => navigate('/register')}>
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

      {/* ───── Footer ───────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-slate-200/70 bg-white/60">
        <Container className="py-12">
          <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <Link to="/" className="flex items-center gap-2.5 text-lg font-black tracking-tight text-slate-950">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
                  <BriefcaseBusiness className="h-5 w-5" />
                </span>
                <span>
                  uaeit<span className="text-indigo-700">jobs</span>
                </span>
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">
                UAE-focused IT and technology hiring. Verified employers, curated roles, faster
                shortlists.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                For candidates
              </p>
              <ul className="mt-4 grid gap-2 text-sm">
                <li>
                  <Link to="/jobs" className="text-slate-700 hover:text-indigo-700">
                    Browse jobs
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="text-slate-700 hover:text-indigo-700">
                    Create profile
                  </Link>
                </li>
                <li>
                  <Link to="/seeker" className="text-slate-700 hover:text-indigo-700">
                    My applications
                  </Link>
                </li>
                <li>
                  <Link to="/seeker/saved" className="text-slate-700 hover:text-indigo-700">
                    Saved jobs
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                For employers
              </p>
              <ul className="mt-4 grid gap-2 text-sm">
                <li>
                  <Link to="/register?type=hr" className="text-slate-700 hover:text-indigo-700">
                    Post a job
                  </Link>
                </li>
                <li>
                  <Link to="/hr" className="text-slate-700 hover:text-indigo-700">
                    HR workspace
                  </Link>
                </li>
                <li>
                  <Link to="/register?type=hr" className="text-slate-700 hover:text-indigo-700">
                    LinkedIn import
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Company
              </p>
              <ul className="mt-4 grid gap-2 text-sm">
                <li>
                  <a href="mailto:hello@uaeitjobs.com" className="text-slate-700 hover:text-indigo-700">
                    Contact
                  </a>
                </li>
                <li>
                  <span className="text-slate-700">Privacy</span>
                </li>
                <li>
                  <span className="text-slate-700">Terms</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-slate-200/70 pt-6 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
            <span>© {new Date().getFullYear()} uaeitjobs. All rights reserved.</span>
            <span className="uppercase tracking-[0.18em]">
              Dubai · Abu Dhabi · Sharjah · Remote UAE
            </span>
          </div>
        </Container>
      </footer>
    </div>
  )
}
