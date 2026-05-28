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
  // Always POST even when jobs array is empty — this ensures every scraper run
  // appears as a row in the ingest monitor so you can see it ran (and why it got 0).
  const token = await getToken()
  const { data } = await axios.post<IngestResult>(
    `${BASE}/api/v1/admin/ingest/external`,
    { source, jobs },
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return data
}
