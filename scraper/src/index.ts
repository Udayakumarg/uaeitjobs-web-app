import 'dotenv/config'
// playwright-extra wraps Playwright with plugin support.
// Using require() avoids ESM interop issues with ts-node + commonjs.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { chromium } = require('playwright-extra')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StealthPlugin = require('puppeteer-extra-plugin-stealth')

// Wire the stealth plugin — applies ~18 patches before any page is created
chromium.use(StealthPlugin())

import { scrapeBayt } from './scrapers/bayt'
import { scrapeNaukrigulf } from './scrapers/naukrigulf'
import { scrapeGulfTalent } from './scrapers/gulftalent'
import { scrapeLinkedIn } from './scrapers/linkedin'
import { scrapeIndeed } from './scrapers/indeed'
import { postJobs } from './api'
import { pickProxy } from './utils/proxy'
import { applyContextStealth } from './utils/stealth'

const HEADED        = process.env.HEADED === 'true'
const SOURCES       = process.env.SOURCES?.split(',').map(s => s.trim().toLowerCase()) ?? ['bayt', 'naukrigulf']
const args          = process.argv.slice(2)
const sourceArg     = args.find(a => a.startsWith('--source='))?.split('=')[1]
// Regression: this used to wrap sourceArg in a single-element array without
// splitting on commas, so `--source=gulftalent,bayt,naukrigulf` produced the
// literal source name "gulftalent,bayt,naukrigulf" — no scraper matched it,
// so npm run scrape:all logged "Unknown source" and scraped nothing.
const activeSources = sourceArg ? sourceArg.split(',').map(s => s.trim().toLowerCase()) : SOURCES

async function main() {
  // ── Proxy selection ─────────────────────────────────────────────────────────
  // Applies to the Playwright sources only. LinkedIn no longer takes a proxy:
  // it runs against the guest API over plain HTTP, which the datacenter IP
  // serves fine — that was the whole reason for the rewrite.
  const proxy      = pickProxy()
  const proxyLabel = proxy
    ? `${proxy.server} (${proxy.username ? 'authenticated' : 'no-auth'})`
    : 'direct connection'

  console.log(`\n🚀 uaeitjobs scraper`)
  console.log(`   Sources : ${activeSources.join(', ')}`)
  console.log(`   Proxy   : ${proxyLabel}`)
  console.log(`   Headed  : ${HEADED}`)

  // ── Browser launch ──────────────────────────────────────────────────────────
  const browser = await chromium.launch({
    headless: !HEADED,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      // Hide automation markers at the Blink engine level
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--disable-dev-shm-usage',
      '--disable-http2',
    ],
    ...(proxy && { proxy }),
  })

  // ── Context — human-like fingerprint ────────────────────────────────────────
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-AE',            // UAE-English locale — natural for Bayt / NaukriGulf
    timezoneId: 'Asia/Dubai',   // Match proxy exit country when using UAE proxies
    viewport: { width: 1366, height: 768 },
    colorScheme: 'light',
    deviceScaleFactor: 1,
    extraHTTPHeaders: {
      'Accept-Language': 'en-AE,en-US;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },
  })

  // Layer 2: manual context-level patches (WebGL vendor, chrome object, permissions)
  await applyContextStealth(context)

  // ── Single page shared across all scrapers ───────────────────────────────────
  const page = await context.newPage()

  // Block binary assets — reduces navigation time ~40% with no DOM impact
  await page.route(
    '**/*.{png,jpg,jpeg,gif,webp,svg,ico,woff,woff2,ttf,eot,mp4,mp3,avi,ogg}',
    (r: import('playwright').Route) => r.abort(),
  )
  // Block tracking/analytics scripts that fingerprint headless environments
  await page.route(
    '**/{google-analytics,googletagmanager,hotjar,clarity,doubleclick,facebook.com/tr}**',
    (r: import('playwright').Route) => r.abort(),
  )

  const summary: Record<string, object> = {}

  try {
    for (const source of activeSources) {
      console.log(`\n── ${source.toUpperCase()} ──────────────────────────`)

      // One source's scrape/post failure must not abort every source after
      // it in the list — this used to propagate straight out of the loop to
      // main()'s catch, silently skipping every remaining source.
      try {
        let jobs: Awaited<ReturnType<typeof scrapeBayt>> = []
        if (source === 'bayt') {
          jobs = await scrapeBayt(page)
        } else if (source === 'naukrigulf') {
          jobs = await scrapeNaukrigulf(page)
        } else if (source === 'gulftalent') {
          jobs = await scrapeGulfTalent()
        } else if (source === 'linkedin') {
          // LinkedIn uses the guest API over plain HTTP — no browser, no session.
          jobs = await scrapeLinkedIn()
        } else if (source === 'indeed') {
          jobs = await scrapeIndeed(page)
        } else {
          console.warn(`  Unknown source "${source}" — skipping`)
          continue
        }

        if (jobs.length === 0) {
          console.log(`  No jobs scraped from ${source}`)
          summary[source] = { fetched: 0, inserted: 0, duplicates: 0, rejected: 0 }
          continue
        }

        console.log(`  Posting ${jobs.length} jobs to backend…`)
        const result = await postJobs(source, jobs)
        summary[source] = result
        console.log(`  ✓ ${source}: inserted=${result.inserted} dupes=${result.duplicates} rejected=${result.rejected}`)
      } catch (err) {
        console.error(`  ✗ ${source} failed:`, err instanceof Error ? err.message : err)
        summary[source] = { error: err instanceof Error ? err.message : String(err) }
      }
    }
  } finally {
    await browser.close()
  }

  console.log('\n📊 Summary:')
  console.table(summary)
  console.log('Done.\n')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
