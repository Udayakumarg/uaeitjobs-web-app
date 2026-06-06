/**
 * LinkedIn session manager — login once, persist cookies, reuse indefinitely.
 *
 * Authentication priority order (executed in sequence, first success wins):
 *   1. Cookies present + valid + session probe succeeds → use cookies
 *   2. Cookies missing/invalid + LINKEDIN_PROXY_SERVER set → login via proxy
 *   3. Cookies missing/invalid + no proxy → attempt direct login
 *   4. Any failure → throw with actionable guidance (refresh cookies / set proxy)
 *
 * Datacenter IPs (VPS) are frequently blocked at the login screen, so on the
 * VPS the cookie path is the *only* reliable strategy. To refresh cookies:
 *
 *   # locally, on a residential IP
 *   npm run linkedin:login
 *   # then copy to VPS
 *   scp .linkedin-cookies.json \
 *     root@82.25.110.205:/opt/apps/uaeitjobs-web-app/scraper/.linkedin-cookies.json
 *
 * Env vars (login fallback only — not needed when cookies are valid):
 *   LI_EMAIL    — LinkedIn account e-mail
 *   LI_PASSWORD — LinkedIn account password
 */
import type { BrowserContext, Cookie } from 'playwright'
import * as fs   from 'fs'
import * as path from 'path'
import { fetchLinkedInVerificationCode } from './gmail-code'

// Use __dirname (location of this source file) rather than process.cwd().
// process.cwd() varies depending on how the scraper child process is spawned
// (pm2 trigger-server → spawn with cwd=scraper/ works, but is fragile).
// __dirname is always scraper/src/utils/, so ../../ reliably resolves to
// scraper/ where the cookie file lives.
const COOKIES_PATH = path.join(__dirname, '../../.linkedin-cookies.json')
const LI_EMAIL     = process.env.LI_EMAIL     ?? ''
const LI_PASSWORD  = process.env.LI_PASSWORD  ?? ''

// The session-bearing cookie. Without a live li_at, every other LinkedIn
// cookie is meaningless. Typical lifetime ~30 days.
const REQUIRED_COOKIES = ['li_at']

export interface CookieValidation {
  valid:        boolean
  reason?:      string
  li_atExpiry?: Date
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Structurally validate a cookie array — does it contain the critical
 * LinkedIn session cookies, and are they unexpired?
 *
 * This is a static check only. It does not prove the session is live on
 * LinkedIn's side; use a live navigation probe for that.
 */
export function validateLinkedInCookies(cookies: Cookie[]): CookieValidation {
  if (!Array.isArray(cookies) || cookies.length === 0) {
    return { valid: false, reason: 'cookie list empty' }
  }

  let li_atExpiry: Date | undefined

  for (const name of REQUIRED_COOKIES) {
    const c = cookies.find(x => x.name === name)
    if (!c) return { valid: false, reason: `missing required cookie "${name}"` }

    // Playwright stores expiry as unix-seconds; -1 means "session cookie" (no expiry tracked).
    if (typeof c.expires === 'number' && c.expires > 0) {
      const expiry = new Date(c.expires * 1000)
      if (expiry.getTime() < Date.now()) {
        return { valid: false, reason: `cookie "${name}" expired at ${expiry.toISOString()}` }
      }
      if (name === 'li_at') li_atExpiry = expiry
    }
  }

  return { valid: true, li_atExpiry }
}

/**
 * Read .linkedin-cookies.json from disk and validate. Returns null when
 * the file is missing or unparseable.
 */
export function readCookieFile(): { cookies: Cookie[]; validation: CookieValidation } | null {
  if (!fs.existsSync(COOKIES_PATH)) return null
  try {
    const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH, 'utf-8')) as Cookie[]
    return { cookies, validation: validateLinkedInCookies(cookies) }
  } catch {
    return null
  }
}

/**
 * Ensures the browser context has a live LinkedIn session.
 * See module docstring for the full priority order.
 */
export async function ensureLinkedInSession(context: BrowserContext): Promise<void> {
  // ── Step 1: try existing cookies ────────────────────────────────────────
  const fromDisk = readCookieFile()

  if (fromDisk === null) {
    console.log('  [li-session] ✗ LinkedIn cookies missing — no .linkedin-cookies.json on disk')
    console.log('  [li-session] ✗ Fresh login required')
    return loginOrThrow(context)
  }

  if (!fromDisk.validation.valid) {
    console.log(`  [li-session] ✗ LinkedIn cookies invalid — ${fromDisk.validation.reason}`)
    console.log('  [li-session] ✗ Fresh login required')
    return loginOrThrow(context)
  }

  await context.addCookies(fromDisk.cookies)
  console.log('  [li-session] ✓ Using LinkedIn session cookies')
  if (fromDisk.validation.li_atExpiry) {
    console.log(`  [li-session]   li_at expires: ${fromDisk.validation.li_atExpiry.toISOString()}`)
  }

  if (await isSessionLive(context)) {
    console.log('  [li-session] ✓ LinkedIn authentication valid')
    return
  }

  console.log('  [li-session] ✗ Cookies present but live probe failed — session dead')
  return loginOrThrow(context)
}

// ─── Fallback login (with actionable error wrapping) ──────────────────────────

async function loginOrThrow(context: BrowserContext): Promise<void> {
  if (!LI_EMAIL || !LI_PASSWORD) {
    throw new Error(
      'LinkedIn cookies invalid AND LI_EMAIL/LI_PASSWORD not set for fallback login.\n' +
      '  → Refresh cookies on a residential IP:\n' +
      '      npm run linkedin:login\n' +
      '    then copy to VPS:\n' +
      '      scp .linkedin-cookies.json root@82.25.110.205:/opt/apps/uaeitjobs-web-app/scraper/',
    )
  }

  if (process.env.LINKEDIN_PROXY_SERVER) {
    console.log('  [li-session] ⚠ No valid cookies — attempting login via residential proxy')
  } else {
    console.log('  [li-session] ⚠ No proxy configured — attempting direct login')
    console.log('  [li-session]   (LinkedIn frequently blocks datacenter IPs; this may fail)')
  }

  try {
    await performLogin(context)
  } catch (err) {
    throw new Error(
      `LinkedIn login failed: ${(err as Error).message}\n` +
      '  → If running on the VPS, the datacenter IP is most likely the cause.\n' +
      '    Refresh cookies on a residential IP:\n' +
      '      npm run linkedin:login\n' +
      '    then: scp .linkedin-cookies.json root@82.25.110.205:/opt/apps/uaeitjobs-web-app/scraper/\n' +
      '  → Or configure: LINKEDIN_PROXY_SERVER / LINKEDIN_PROXY_USERNAME / LINKEDIN_PROXY_PASSWORD',
    )
  }
}

// ─── Session probe ────────────────────────────────────────────────────────────

async function isSessionLive(context: BrowserContext): Promise<boolean> {
  const page = await context.newPage()
  try {
    const response = await page.goto(
      'https://www.linkedin.com/feed/',
      { waitUntil: 'domcontentloaded', timeout: 15_000 },
    )
    // LinkedIn redirects to /login or /authwall when the session is dead
    const landed = page.url()
    return response?.ok() === true && !landed.includes('/login') && !landed.includes('/authwall')
  } catch {
    return false
  } finally {
    await page.close()
  }
}

// ─── Full login flow (used as a fallback when cookies are invalid) ────────────

async function performLogin(context: BrowserContext): Promise<void> {
  console.log('  [li-session] Logging in to LinkedIn…')
  const page = await context.newPage()

  try {
    await page.goto('https://www.linkedin.com/login', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })

    // Give React time to finish rendering the form
    await page.waitForTimeout(3_000)

    console.log(`  [li-session] Landed on: ${page.url()}`)

    // LinkedIn's React app uses dynamic IDs and may keep inputs in the DOM
    // before they're "visible" (CSS animation / lazy mount). Use force:true
    // to fill regardless of visibility state.
    await page.locator('input[type="email"]').first().fill(LI_EMAIL, { force: true })
    await page.waitForTimeout(400 + Math.floor(Math.random() * 400))
    await page.locator('input[type="password"]').first().fill(LI_PASSWORD, { force: true })
    await page.waitForTimeout(600 + Math.floor(Math.random() * 500))
    await page.locator('button[type="submit"]').first().click({ force: true })
    await page.waitForTimeout(5_000)

    // ── Verification code screen ──────────────────────────────────────────
    const pinInput = await page.$(
      'input[name="pin"], input[id="input__email_verification_pin"], input[autocomplete="one-time-code"]',
    )
    if (pinInput) {
      console.log('  [li-session] Verification code required — reading from Gmail…')
      const code = await fetchLinkedInVerificationCode()
      await page.fill(
        'input[name="pin"], input[id="input__email_verification_pin"], input[autocomplete="one-time-code"]',
        code,
      )
      await page.waitForTimeout(500)
      await page.locator('button[type="submit"]').first().click({ force: true })
      await page.waitForTimeout(5_000)
    }

    // ── Verify success ────────────────────────────────────────────────────
    const url = page.url()
    if (url.includes('/login') || url.includes('/authwall') || url.includes('/checkpoint')) {
      throw new Error(`landed on ${url} after submit`)
    }

    // ── Persist cookies ───────────────────────────────────────────────────
    const cookies = await context.cookies()
    const validation = validateLinkedInCookies(cookies)
    if (!validation.valid) {
      throw new Error(`login completed but cookie validation failed: ${validation.reason}`)
    }

    fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2))
    console.log(`  [li-session] ✓ Logged in — cookies saved to ${COOKIES_PATH}`)
    if (validation.li_atExpiry) {
      console.log(`  [li-session]   li_at expires: ${validation.li_atExpiry.toISOString()}`)
    }
  } finally {
    await page.close()
  }
}
