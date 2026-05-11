import { Link } from 'react-router-dom'
import { Button, EmptyState } from '../components/ui'

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <EmptyState title="That page could not be found." action={<Link to="/"><Button>Go home</Button></Link>} />
    </main>
  )
}
