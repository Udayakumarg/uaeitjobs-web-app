import 'dotenv/config'
import { chromium } from 'playwright'
import { scrapeBayt } from './scrapers/bayt'
import { scrapeNaukrigulf } from './scrapers/naukrigulf'
import { postJobs } from './api'

const HEADED  = process.env.HEADED === 'true'
const SOURCES = process.env.SOURCES?.split(',').map(s => s.trim().toLowerCase()) ?? ['bayt', 'naukrigulf']

const args = process.argv.slice(2)
const sourceArg = args.find(a => a.startsWith('--source='))?.split('=')[1]
const activeSources = sourceArg ? [sourceArg] : SOURCES

async function main() {
  console.log(`\n🚀 uaeitjobs scraper — sources: ${activeSources.join(', ')} | headed: ${HEADED}`)

  const browser = await chromium.launch({
    headless: !HEADED,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-US',
    viewport: { width: 1280, height: 800 },
  })

  const page = await context.newPage()
  // Block images/fonts/media to speed up scraping
  await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,ttf,mp4,mp3}', r => r.abort())

  const summary: Record<string, object> = {}

  try {
    for (const source of activeSources) {
      console.log(`\n── ${source.toUpperCase()} ──────────────────────────`)

      let jobs = []
      if (source === 'bayt') {
        jobs = await scrapeBayt(page)
      } else if (source === 'naukrigulf') {
        jobs = await scrapeNaukrigulf(page)
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
