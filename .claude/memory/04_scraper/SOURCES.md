# Scraper Sources

## Summary

| Source | File | Method | Auth needed | Notes |
|--------|------|--------|-------------|-------|
| Bayt | `scrapers/bayt.ts` | Playwright | No | UAE IT jobs, CSS selectors |
| NaukriGulf | `scrapers/naukrigulf.ts` | Playwright | No | UAE IT jobs, CSS selectors |
| GulfTalent | `scrapers/gulftalent.ts` | Cheerio HTTP | No | SSR site, no browser needed |
| LinkedIn | `scrapers/linkedin.ts` | Playwright | Yes (cookies) | 3-layer extraction, takes context |
| JSearch | `JSearchSource.java` (backend) | RapidAPI | API key | Keyword rotation, site: filter |
| Adzuna | `AdzunaSource.java` (backend) | API | API key | |
| RemoteOK | `RemoteOkSource.java` (backend) | API | No | |
| Himalayas | `HimalayasSource.java` (backend) | API | No | |

## npm run commands
```
npm run scrape:bayt
npm run scrape:naukrigulf
npm run scrape:gulftalent
npm run scrape:linkedin
npm run scrape:all          # gulftalent + bayt + naukrigulf (not linkedin)
npm run scrape              # uses SOURCES env var
npm run trigger-server      # start HTTP trigger server
```

## Environment variable: SOURCES
Default: `bayt,naukrigulf`  
Override: `SOURCES=bayt,naukrigulf,gulftalent,linkedin`  
Or use `--source=` CLI arg: `ts-node src/index.ts --source=linkedin`

## MAX_PAGES (default 3)
Controls pagination depth per search term. Set `MAX_PAGES=1` for testing.

## LI_MAX_DETAIL (default 50, LinkedIn only)
Caps how many job detail pages are fetched per run. Discovery can find 100s of IDs but detail fetches are slow.

## Data flow after scraping
All Playwright scrapers:
1. Build `ScrapedJob[]` (see `types.ts`)
2. Call `postJobs(source, jobs)` in `api.ts`
3. Backend `POST /api/v1/admin/ingest/external` receives it
4. Runs through `JobIngestPipeline` (same as API sources)
5. `IngestRunLog` entry created — shows in IngestDashboard

## ScrapedJob interface (`types.ts`)
```typescript
interface ScrapedJob {
  externalId: string
  title: string
  company: string
  description: string
  location: string         // "Dubai, AE" format
  emirate?: string         // "dubai" | "abu_dhabi" | ...
  applyUrl: string
  publisher: string
  postedAt?: string        // "2024-01-25"
  jobType?: string         // "full_time" | "part_time" | "contract" | "internship"
  remoteUae?: boolean
  salaryMin?: number
  salaryMax?: number
  salaryCurrency?: string
}
```
