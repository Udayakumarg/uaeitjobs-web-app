import { BriefcaseBusiness, Menu, UserRound, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Button } from './ui'
import { Toasts } from './Toast'

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'font-semibold text-blue-700' : 'font-medium text-slate-600 hover:text-blue-700'

export function Layout() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const links = (
    <>
      <NavLink to="/jobs" className={navClass}>Jobs</NavLink>
      {user?.userType === 'job_seeker' ? <NavLink to="/seeker" className={navClass}>My dashboard</NavLink> : null}
      {user?.userType === 'hr' ? <NavLink to="/hr" className={navClass}>HR dashboard</NavLink> : null}
    </>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <Toasts />
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-950" onClick={() => setOpen(false)}>
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-700 text-white"><BriefcaseBusiness className="h-5 w-5" /></span>
            UAEITJOBS
          </Link>
          <nav className="hidden items-center gap-6 md:flex">{links}</nav>
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                <span className="inline-flex items-center gap-2 text-sm text-slate-600"><UserRound className="h-4 w-4" />{user.displayName || user.email}</span>
                <Button variant="secondary" onClick={() => { logout(); navigate('/') }}>Logout</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/login')}>Login</Button>
                <Button onClick={() => navigate('/register')}>Register</Button>
              </>
            )}
          </div>
          <button className="rounded-md p-2 text-slate-700 hover:bg-slate-100 md:hidden" onClick={() => setOpen((value) => !value)} aria-label="Toggle navigation">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {open ? (
          <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
            <nav className="grid gap-4" onClick={() => setOpen(false)}>{links}</nav>
            <div className="mt-4 flex gap-2">
              {user ? <Button className="w-full" variant="secondary" onClick={() => { logout(); navigate('/') }}>Logout</Button> : <><Button className="w-full" variant="secondary" onClick={() => navigate('/login')}>Login</Button><Button className="w-full" onClick={() => navigate('/register')}>Register</Button></>}
            </div>
          </div>
        ) : null}
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <span>UAEITJOBS connects UAE technology teams with serious candidates.</span>
          <span>Dubai · Abu Dhabi · Sharjah · Remote UAE</span>
        </div>
      </footer>
    </div>
  )
}
