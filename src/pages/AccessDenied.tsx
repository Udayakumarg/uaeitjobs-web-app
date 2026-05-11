import { Link } from 'react-router-dom'
import { Button, EmptyState } from '../components/ui'

export default function AccessDenied() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <EmptyState title="You do not have access to this area." action={<Link to="/jobs"><Button>Browse jobs</Button></Link>} />
    </main>
  )
}
