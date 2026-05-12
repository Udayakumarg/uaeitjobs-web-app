import { Bookmark, ClipboardList, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui'
import { useAuthStore } from '../../store/authStore'

export default function JobSeekerDashboard() {
  const user = useAuthStore((state) => state.user)
  const actions: Array<[string, string, LucideIcon, string]> = [
    ['Profile and CV', '/seeker/profile', UserRound, 'Update skills, profile summary, visa status, and upload your latest CV.'],
    ['Applications', '/seeker/applications', ClipboardList, 'Track application statuses from applied through hired.'],
    ['Saved jobs', '/seeker/saved', Bookmark, 'Return to bookmarked opportunities quickly.'],
  ]

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-slate-950">Job seeker dashboard</h1>
      <p className="mt-2 text-slate-600">Welcome{user?.displayName ? `, ${user.displayName}` : ''}. Manage your UAE IT job search from here.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {actions.map(([title, href, Icon, body]) => (
          <Link key={String(title)} to={String(href)}>
            <Card className="h-full transition hover:border-teal-300 hover:shadow-md">
              <Icon className="text-teal-700" size={24} />
              <h2 className="mt-4 font-bold text-slate-950">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  )
}
