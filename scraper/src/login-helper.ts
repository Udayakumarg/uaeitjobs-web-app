/**
 * LinkedIn cookie generation helper — run this LOCALLY (residential IP).
 *
 * Purpose: LinkedIn blocks fresh logins from datacenter IPs (VPS). The fix
 * is to authenticate from a residential IP (your home network), capture the
 * session cookies, and ship them to the VPS where the scraper will reuse
 * them via `ensureLinkedInSession()`.
 *
 * Usage:
 *   cd scraper
 *   npm run linkedin:login              # fully manual login
 *   LI_EMAIL=... LI_PASSWORD=... npm run linkedin:login   # auto-fill, manual completion
 *
 * After successful login, the script prints the scp command for copying
 * the cookies to the VPS:
 *   scp .linkedin-cookies.json \
 *     root@82.25.110.205:/opt/apps/uaeitjobs-web-app/scraper/.linkedin-cookies.json
 *
 * The browser is launched non-headless so you can complete any LinkedIn
 * challenge (CAPTCHA, device verification, OTP). The script waits until
 * the URL leaves /login, /checkpoint and /authwall, then captures cookies
 * and validates that the critical li_at cookie is present.
 *
 * Env vars:
 *   LI_EMAIL          (optional) auto-fills email field
 *   LI_PASSWORD       (optional) auto-fills password field
 *   LOGIN_TIMEOUT_MS  (optional) wait deadline in ms — default 600000 (10 min)
 */
import 'dotenv/config'
import * as fs   from 'fs'
import * as path from 'path'

// playwright-extra wraps Playwright with plugin support. Match index.ts.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { chromium } = require('playwright-extra')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StealthPlugin = require('puppeteer-extra-plugin-stealth')

chromium.use(StealthPlugin())

import { applyContextStealth } from './utils/stealth'
import { validateLinkedInCookies } from './utils/linkedin-session'

const COOKIES_PATH      = path.join(process.cwd(), '.linkedin-cookies.json')
const LOGIN_DEADLINE_MS = parseInt(process.env.LOGIN_TIMEOUT_MS ?? '600000', 10)
const LI_EMAIL          = process.env.LI_EMAIL    ?? ''
const LI_PASSWORD       = process.env.LI_PASSWORD ?? ''

async function main(): Promise<void> {
  console.log('\n🔐 LinkedIn cookie generation helper')
  console.log(`   Output  : ${COOKIES_PATH}`)
  console.log(`   Mode    : non-headless (manual completion supported)`)
  console.log(`   Timeout : ${LOGIN_DEADLINE_MS / 1000}s`)
  console.log(`   Autofill: ${LI_EMAIL ? 'yes' : 'no — manual login required'}\n`)

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--disable-dev-shm-usage',
    ],
  })

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-AE',
    timezoneId: 'Asia/Dubai',
    viewport: { width: 1366, height: 768 },
    colorScheme: 'light',
  })

  await applyContextStealth(context)

  const page = await context.newPage()

  try {
    await page.goto('https://www.linkedin.com/login', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    await page.waitForTimeout(2_000)

    // ── Optional auto-fill ───────────────────────────────────────────────
    if (LI_EMAIL && LI_PASSWORD) {
      console.log(`  Auto-filling credentials for ${LI_EMAIL}…`)
      try {
        await page.locator('input[type="email"]').first().fill(LI_EMAIL, { force: true })
        await page.waitForTimeout(400)
        await page.locator('input[type="password"]').first().fill(LI_PASSWORD, { force: true })
        console.log('  Credentials filled. Click "Sign in" in the browser to continue.\n')
      } catch (err) {
        console.warn(`  Auto-fill failed (${(err as Error).message}) — please complete manually.\n`)
      }
    } else {
      console.log('  Log in manually in the browser window that just opened.\n')
    }

    console.log('  → Waiting for successful authentication (URL leaves /login, /checkpoint, /authwall)…')
    console.log('  → Complete any CAPTCHA / device verification in the browser when prompted.\n')

    // ── Poll for auth completion ────────────────────────────────────────
    const deadline = Date.now() + LOGIN_DEADLINE_MS
    let landed = page.url()
    while (Date.now() < deadline) {
      landed = page.url()
      const stillOnAuthScreen =
        landed.includes('/login') ||
        landed.includes('/checkpoint') ||
        landed.includes('/authwall') ||
        landed.includes('/uas/login')

      if (!stillOnAuthScreen && landed.includes('linkedin.com')) {
        // URL has progressed past auth. Give the page a moment to finish
        // setting any remaining cookies (Voyager handshake etc.)
        await page.waitForTimeout(3_000)
        break
      }
      await page.waitForTimeout(2_000)
    }

    if (
      landed.includes('/login') ||
      landed.includes('/checkpoint') ||
      landed.includes('/authwall')
    ) {
      throw new Error(
        `Authentication did not complete within ${LOGIN_DEADLINE_MS / 1000}s. ` +
        `Last URL: ${landed}`,
      )
    }

    console.log(`  ✓ Authentication complete — landed on: ${landed}`)

    // ── Capture and validate cookies ────────────────────────────────────
    const cookies = await context.cookies()
    const validation = validateLinkedInCookies(cookies)

    if (!validation.valid) {
      throw new Error(`Cookie validation failed: ${validation.reason}`)
    }

    fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2))

    console.log(`\n  ✓ Saved ${cookies.length} cookies to ${COOKIES_PATH}`)
    console.log(
      `  ✓ li_at expires: ${
        validation.li_atExpiry ? validation.li_atExpiry.toISOString() : 'session (no explicit expiry)'
      }`,
    )

    console.log('\n  Next — copy cookies to the VPS:')
    console.log('    scp .linkedin-cookies.json \\')
    console.log('      root@82.25.110.205:/opt/apps/uaeitjobs-web-app/scraper/.linkedin-cookies.json')
    console.log('\n  Then verify on the VPS:')
    console.log('    ssh -i ~/.ssh/new-vps-key root@82.25.110.205 \\')
    console.log('      "ls -la /opt/apps/uaeitjobs-web-app/scraper/.linkedin-cookies.json"\n')
  } finally {
    await browser.close()
  }
}

main().catch(err => {
  console.error('\n  ✗ Cookie generation failed:', (err as Error).message)
  console.error('\n  Tips:')
  console.error('    • Try again — sometimes LinkedIn requires extra verification on first attempt')
  console.error('    • If you saw a CAPTCHA, complete it in the browser, then retry')
  console.error('    • Confirm you are on a residential network (not VPN / datacenter)\n')
  process.exit(1)
})
