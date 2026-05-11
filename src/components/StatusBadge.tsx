import type { ApplicationStatus } from '../types'
import { Badge } from './ui'

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const tone = status === 'hired' ? 'green' : status === 'rejected' ? 'red' : status === 'shortlisted' ? 'blue' : status === 'reviewed' ? 'amber' : 'slate'
  return <Badge tone={tone}>{status.replaceAll('_', ' ')}</Badge>
}
