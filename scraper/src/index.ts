import 'dotenv/config'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { chromium } = require('playwright-extra')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
chromium.use(StealthPlugin())

import { scrapeBayt } from './scrapers/bayt'
import { scrapeNaukrigulf } from './scrapers/naukrigulf'
import { scrapeGulfTalent } from './scrapers/gulftalent'
import { postJobs } from './api'

const HEADED  = process.env.HEADED === 'true'
const SOURCES = process.env.SOURCES?.split(',').map(s => s.trim().toLowerCase()) ?? ['gulftalent']

const args = process.argv.slice(2)
const sourceArg = args.find(a => a.startsWith('--source='))?.split('=')[1]
const activeSources = sourceArg ? [sourceArg] : SOURCES

async function main() {
  console.log(`\n🚀 uaeitjobs scraper — sources: ${activeSources.join(', ')} | headed: ${HEADED}`)

  const browser = await chromium.launch({
    headless: !HEADED,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-http2',
    ],
  })

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-US',
    viewport: { width: 1280, height: 900 },
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },
  })

  // Stealth plugin already patches webdriver — this is a belt-and-suspenders backup
  await context.addInitScript(() => {
    try { Object.defineProperty((globalThis as Record<string, unknown>).navigator, 'webdriver', { get: () => undefined }) } catch (_e) { /* noop */ }
  })

  const page = await context.newPage()

  // Block only media — keep CSS/JS so pages render correctly
  await page.route('**/*.{mp4,mp3,ogg,wav}', (r: import('playwright').Route) => r.abort())

  const summary: Record<string, object> = {}

  try {
    for (const source of activeSources) {
      console.log(`\n── ${source.toUpperCase()} ──────────────────────────`)

      let jobs: Awaited<ReturnType<typeof scrapeBayt>> = []
      if (source === 'bayt') {
        jobs = await scrapeBayt(page)
      } else if (source === 'naukrigulf') {
        jobs = await scrapeNaukrigulf(page)
      } else if (source === 'gulftalent') {
        jobs = await scrapeGulfTalent()
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
