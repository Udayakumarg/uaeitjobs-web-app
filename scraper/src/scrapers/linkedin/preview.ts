/**
 * Dry run for the LinkedIn guest scraper — fetches and prints, posts nothing.
 *
 * Use this to sanity-check data quality after LinkedIn changes its markup,
 * before letting a real run write to the database.
 *
 *   cd scraper
 *   npx ts-node src/scrapers/linkedin/preview.ts
 *
 * Defaults to a deliberately narrow sweep so it finishes in well under a
 * minute. Widen it the same way a real run is tuned:
 *
 *   LI_KEYWORDS="devops engineer,data engineer" LI_LOCATIONS="Dubai" \
 *     npx ts-node src/scrapers/linkedin/preview.ts
 */
import 'dotenv/config'

// NOTE: ./index is imported dynamically inside main(), not here. It reads its
// tunables into module-level constants at load time, and a static import would
// be hoisted above the assignments below — so the overrides would silently do
// nothing. Setting the environment first, then importing, is what makes them
// take effect.

// Keep the preview small unless the caller has said otherwise.
process.env.LI_KEYWORDS ??= 'software engineer'
process.env.LI_LOCATIONS ??= 'Dubai'
process.env.LI_MAX_PAGES ??= '3'

// Real runs default to card-only. The preview enriches a handful anyway, so
// the coverage report below shows what descriptions would add if turned on.
process.env.LI_FETCH_DETAIL ??= 'true'
process.env.LI_MAX_DETAIL ??= '5'

async function main() {
  const { scrapeLinkedIn } = await import('./index')

  const started = Date.now()
  const jobs = await scrapeLinkedIn()
  const elapsed = ((Date.now() - started) / 1000).toFixed(1)

  if (jobs.length === 0) {
    console.error('\n✗ No jobs returned — check the warnings above.')
    process.exitCode = 1
    return
  }

  console.log(`\n── Sample (${Math.min(10, jobs.length)} of ${jobs.length}) ─────────────────`)
  console.table(
    jobs.slice(0, 10).map(j => ({
      id: j.externalId,
      title: j.title.slice(0, 40),
      company: j.company.slice(0, 24),
      location: j.location,
      emirate: j.emirate ?? '—',
      posted: j.postedAt ?? '—',
      type: j.jobType,
      desc: j.description.length,
    })),
  )

  console.log('\n── First record in full ──────────────────────────────')
  console.log(JSON.stringify(jobs[0], null, 2))

  // Field coverage is the signal that matters when markup drifts: a selector
  // that silently stops matching shows up here as a collapsed percentage.
  const pct = (n: number) => `${((n / jobs.length) * 100).toFixed(0)}%`
  console.log('\n── Field coverage ────────────────────────────────────')
  console.log(`  title        ${pct(jobs.filter(j => j.title).length)}`)
  console.log(`  company      ${pct(jobs.filter(j => j.company && j.company !== 'Unknown').length)}`)
  console.log(`  location     ${pct(jobs.filter(j => j.location).length)}`)
  console.log(`  emirate      ${pct(jobs.filter(j => j.emirate).length)}`)
  console.log(`  postedAt     ${pct(jobs.filter(j => j.postedAt).length)}`)
  console.log(`  description  ${pct(jobs.filter(j => j.description.length > 200).length)} over 200 chars`)
  console.log(
    '\n  Note: production runs are card-only by default, so a low description\n' +
    '  percentage here is expected — only LI_MAX_DETAIL jobs were enriched.',
  )
  console.log(`\n  ${jobs.length} jobs in ${elapsed}s — nothing was posted to the backend.\n`)
}

main().catch(err => {
  console.error('Preview failed:', err)
  process.exit(1)
})
