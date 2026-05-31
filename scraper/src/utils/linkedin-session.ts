/**
 * LinkedIn session manager — login once, persist cookies, reuse indefinitely.
 *
 * Flow:
 *   1. Load cookies from .linkedin-cookies.json (if present)
 *   2. Quick session probe — if the feed loads without a redirect, session is live
 *   3. If session is dead or cookies absent → full login with email/password
 *   4. If LinkedIn requests a verification code → read it from Gmail automatically
 *   5. Save fresh cookies to disk
 *
 * Env vars required:
 *   LI_EMAIL    — LinkedIn account e-mail
 *   LI_PASSWORD — LinkedIn account password
 */
import type { BrowserContext } from 'playwright'
import * as fs   from 'fs'
import * as path from 'path'
import { fetchLinkedInVerificationCode } from './gmail-code'

const COOKIES_PATH = path.join(process.cwd(), '.linkedin-cookies.json')
const LI_EMAIL     = process.env.LI_EMAIL     ?? ''
const LI_PASSWORD  = process.env.LI_PASSWORD  ?? ''

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Ensures the browser context has a live LinkedIn session.
 * Call this once before scraping — the session is shared across all pages
 * opened from the same context.
 */
export async function ensureLinkedInSession(context: BrowserContext): Promise<void> {
  if (!LI_EMAIL || !LI_PASSWORD) {
    throw new Error('LI_EMAIL and LI_PASSWORD env vars are required for LinkedIn scraping')
  }

  // ── Attempt to restore existing session ──────────────────────────────────
  if (fs.existsSync(COOKIES_PATH)) {
    try {
      const stored = JSON.parse(fs.readFileSync(COOKIES_PATH, 'utf-8'))
      await context.addCookies(stored)
      console.log('  [li-session] Loaded cookies from disk — verifying…')

      if (await isSessionLive(context)) {
        console.log('  [li-session] ✓ Session active')
        return
      }
      console.log('  [li-session] Cookies expired — re-logging in')
    } catch {
      console.log('  [li-session] Cookie file corrupt — re-logging in')
    }
  }

  // ── Full login ────────────────────────────────────────────────────────────
  await performLogin(context)
}

// ─── Session probe ────────────────────────────────────────────────────────────

async function isSessionLive(context: BrowserContext): Promise<boolean> {
  const page = await context.newPage()
  try {
    const response = await page.goto(
      'https://www.linkedin.com/feed/',
      { waitUntil: 'domcontentloaded', timeout: 15_000 },
    )
    // LinkedIn redirects to /login when the session is dead
    const landed = page.url()
    return response?.ok() === true && !landed.includes('/login') && !landed.includes('/authwall')
  } catch {
    return false
  } finally {
    await page.close()
  }
}

// ─── Login flow ───────────────────────────────────────────────────────────────

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
    // LinkedIn may show a PIN/OTP screen after login
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
      throw new Error(`Login failed — landed on: ${url}`)
    }

    // ── Persist cookies ───────────────────────────────────────────────────
    const cookies = await context.cookies()
    fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2))
    console.log(`  [li-session] ✓ Logged in — cookies saved to ${COOKIES_PATH}`)
  } finally {
    await page.close()
  }
}
