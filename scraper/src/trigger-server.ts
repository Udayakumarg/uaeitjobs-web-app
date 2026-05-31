/**
 * Lightweight HTTP trigger server — runs alongside the scraper cron.
 * Accepts authenticated POST requests from the backend to launch a
 * specific scraper source in a background child process.
 *
 * Start with:   ts-node src/trigger-server.ts
 * Or via pm2:   pm2 start dist/trigger-server.js --name scraper-trigger
 *
 * Env vars:
 *   TRIGGER_PORT    — port to listen on (default: 3001)
 *   TRIGGER_SECRET  — shared secret; header X-Trigger-Secret must match
 */
import 'dotenv/config'
import * as http     from 'http'
import * as path     from 'path'
import { spawn }     from 'child_process'

const PORT   = parseInt(process.env.TRIGGER_PORT   ?? '3001', 10)
const SECRET = process.env.TRIGGER_SECRET ?? ''

const VALID_SOURCES = new Set(['bayt', 'naukrigulf', 'gulftalent', 'linkedin'])

// Track which source is currently running so we don't double-launch
const running = new Map<string, boolean>()

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
    res.writeHead(200).end(JSON.stringify({ status }))
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

  // ── Spawn scraper in background ────────────────────────────────────────
  res.writeHead(202).end(JSON.stringify({ status: 'started', source }))

  running.set(source, true)
  console.log(`[trigger] Starting scraper: ${source}`)

  const child = spawn(
    'npx', ['ts-node', 'src/index.ts', `--source=${source}`],
    {
      cwd:      path.resolve(__dirname, '..'),
      env:      process.env,
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
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯  Scraper trigger server listening on port ${PORT}`)
  console.log(`    Auth : ${SECRET ? 'enabled' : 'DISABLED — set TRIGGER_SECRET'}`)
  console.log(`    Sources: ${[...VALID_SOURCES].join(', ')}`)
})
