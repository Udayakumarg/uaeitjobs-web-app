/**
 * Lightweight HTTP trigger server — runs alongside the scraper cron.
 * Accepts authenticated POST requests from the backend to launch a
 * specific scraper source in a background child process, AND runs each
 * source on its own daily schedule so ingest doesn't depend on someone
 * remembering to click the admin dashboard's trigger buttons.
 *
 * Start with:   ts-node src/trigger-server.ts
 * Or via pm2:   pm2 start dist/trigger-server.js --name scraper-trigger
 *
 * Env vars:
 *   TRIGGER_PORT          — port to listen on (default: 3001)
 *   TRIGGER_SECRET        — shared secret; header X-Trigger-Secret must match
 *   SCHEDULE_ENABLED       — "false" to disable the daily cron entirely (default: true)
 *   SCHEDULE_LI_FRESHNESS  — LinkedIn LI_FRESHNESS for the scheduled run only;
 *                            manual/admin-triggered runs are unaffected (default: r90000,
 *                            25h — a 1h buffer over the 24h interval so timing drift
 *                            never opens a gap between two days' coverage)
 */
import 'dotenv/config'
import * as http     from 'http'
import * as path     from 'path'
import { spawn }     from 'child_process'
import * as cron     from 'node-cron'

const PORT   = parseInt(process.env.TRIGGER_PORT   ?? '3001', 10)
const SECRET = process.env.TRIGGER_SECRET ?? ''

const VALID_SOURCES = new Set(['bayt', 'naukrigulf', 'gulftalent', 'linkedin'])

// Track which source is currently running so we don't double-launch — shared
// between the HTTP trigger and the cron schedule below, so an admin clicking
// "trigger" while the daily job is mid-run gets the same 409 either way,
// rather than the two launch paths racing each other.
const running = new Map<string, boolean>()

/**
 * Launch a scraper source as a background child process.
 *
 * @param envOverrides Extra env vars for this run only (e.g. LI_FRESHNESS for
 *   the scheduled LinkedIn run). Never mutates process.env, so a concurrent
 *   manual trigger for a different source is unaffected.
 * @returns false if the source was already running (no-op), true once launched.
 */
function launchSource(source: string, envOverrides: Record<string, string> = {}): boolean {
  if (running.get(source)) return false

  running.set(source, true)
  console.log(`[trigger] Starting scraper: ${source}${Object.keys(envOverrides).length ? ` (${JSON.stringify(envOverrides)})` : ''}`)

  const child = spawn(
    'npx', ['ts-node', 'src/index.ts', `--source=${source}`],
    {
      cwd:      path.resolve(__dirname, '..'),
      env:      { ...process.env, ...envOverrides },
      stdio:    'inherit',
      detached: false,
    },
  )

  child.on('close', (code) => {
    running.set(source, false)
    console.log(`[trigger] ${source} exited with code ${code}`)
  })

  child.on('error', (err) => {
    running.set(source, false)
    console.error(`[trigger] ${source} spawn error:`, err.message)
  })

  return true
}

// ─── Daily schedule ─────────────────────────────────────────────────────────
//
// UTC times, staggered ~20 min apart so the four sources never overlap and
// don't burst all their requests at once. Chosen to land in the small hours
// Gulf Standard Time (UTC+4) — 01:00 UTC = 05:00 GST — ahead of the backend's
// own 02:00/02:15 UTC maintenance crons (expire-stale-jobs / refresh-active-jobs),
// so a job discovered tonight is already in the database before those run.
//
// | Source     | UTC   | GST (UTC+4) | Notes                                    |
// |------------|-------|-------------|-------------------------------------------|
// | bayt       | 01:00 | 05:00       | Currently 403-blocked from this IP — see  |
// | naukrigulf | 01:20 | 05:20       | note below. Scheduling them anyway means  |
// | gulftalent | 01:40 | 05:40       | the day a proxy fixes access, ingest      |
// | linkedin   | 02:00 | 06:00       | resumes with no further changes needed.   |
//
// Bayt and GulfTalent return HTTP 403 from this VPS's IP (verified against
// their own sitemap.xml, not just the search pages — an IP/ASN-level block,
// not a selector problem). Scheduling still runs them daily; each run simply
// logs 0 results until a residential/rotating proxy is configured via
// LINKEDIN_PROXY_SERVER-style env vars for those sources.
const SCHEDULE_ENABLED      = process.env.SCHEDULE_ENABLED !== 'false'
const SCHEDULE_LI_FRESHNESS = process.env.SCHEDULE_LI_FRESHNESS ?? 'r90000'

if (SCHEDULE_ENABLED) {
  cron.schedule('0 1 * * *',  () => launchSource('bayt'),       { timezone: 'UTC' })
  cron.schedule('20 1 * * *', () => launchSource('naukrigulf'), { timezone: 'UTC' })
  cron.schedule('40 1 * * *', () => launchSource('gulftalent'), { timezone: 'UTC' })
  // Scheduled LinkedIn runs use LI_FRESHNESS to fetch only the last ~25h of
  // postings — see the module docstring on why a daily full-market sweep
  // would be wasteful once the database already has yesterday's jobs.
  cron.schedule('0 2 * * *',  () => launchSource('linkedin', { LI_FRESHNESS: SCHEDULE_LI_FRESHNESS }), { timezone: 'UTC' })
  console.log('[trigger] Daily schedule armed: bayt 01:00, naukrigulf 01:20, gulftalent 01:40, linkedin 02:00 UTC')
} else {
  console.log('[trigger] SCHEDULE_ENABLED=false — daily cron disabled, manual triggers only')
}

// ─── HTTP server ──────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json')

  // ── Auth ────────────────────────────────────────────────────────────────
  if (SECRET && req.headers['x-trigger-secret'] !== SECRET) {
    res.writeHead(401).end(JSON.stringify({ error: 'Unauthorised' }))
    return
  }

  // ── Status endpoint ──────────────────────────────────────────────────────
  if (req.method === 'GET' && req.url === '/status') {
    const status: Record<string, string> = {}
    for (const src of VALID_SOURCES) {
      status[src] = running.get(src) ? 'running' : 'idle'
    }
    res.writeHead(200).end(JSON.stringify({ status, scheduleEnabled: SCHEDULE_ENABLED }))
    return
  }

  // ── Trigger endpoint  POST /trigger/:source ───────────────────────────
  if (req.method !== 'POST' || !req.url?.startsWith('/trigger/')) {
    res.writeHead(404).end(JSON.stringify({ error: 'Not found' }))
    return
  }

  const source = req.url.replace('/trigger/', '').toLowerCase()

  if (!VALID_SOURCES.has(source)) {
    res.writeHead(400).end(JSON.stringify({ error: `Unknown source "${source}"` }))
    return
  }

  if (running.get(source)) {
    res.writeHead(409).end(JSON.stringify({ status: 'already_running', source }))
    return
  }

  launchSource(source)
  res.writeHead(202).end(JSON.stringify({ status: 'started', source }))
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯  Scraper trigger server listening on port ${PORT}`)
  console.log(`    Auth : ${SECRET ? 'enabled' : 'DISABLED — set TRIGGER_SECRET'}`)
  console.log(`    Sources: ${[...VALID_SOURCES].join(', ')}`)
})
