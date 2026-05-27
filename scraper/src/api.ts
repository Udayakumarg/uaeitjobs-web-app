import axios from 'axios'
import { ScrapedJob, IngestResult } from './types'

const BASE = (process.env.BACKEND_URL ?? 'http://localhost:8080').replace(/\/$/, '')

let _token: string | null = null

async function getToken(): Promise<string> {
  if (_token) return _token
  const { data } = await axios.post(`${BASE}/api/v1/auth/login`, {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  })
  _token = data.accessToken as string
  console.log('  ✓ Authenticated as', process.env.ADMIN_EMAIL)
  return _token
}

export async function postJobs(source: string, jobs: ScrapedJob[]): Promise<IngestResult> {
  if (jobs.length === 0) return { source, fetched: 0, inserted: 0, duplicates: 0, rejected: 0 }

  const token = await getToken()
  const { data } = await axios.post<IngestResult>(
    `${BASE}/api/v1/admin/ingest/external`,
    { source, jobs },
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return data
}
