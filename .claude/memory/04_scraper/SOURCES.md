# Scraper Sources

## Summary

| Source | File | Method | Auth needed | Notes |
|--------|------|--------|-------------|-------|
| Bayt | `scrapers/bayt.ts` | Playwright | No | Genuinely IP/ASN-blocked (Cloudflare) as of 2026-08 — 0 results until a residential proxy is configured |
| NaukriGulf | `scrapers/naukrigulf.ts` | Playwright | No | Fetches each new job's own detail page as of 2026-08 (previously card-snippet only — see 2026-08 fix below) |
| GulfTalent | `scrapers/gulftalent.ts` | Cheerio HTTP (no browser) | No | Fetches each new job's own detail page as of 2026-08 (previously fabricated a placeholder description — see below) |
| LinkedIn | `scrapers/linkedin.ts` | Guest API, plain HTTP (no browser, no cookies) | No | **Card-only by default** — only the scheduled daily cron passes `LI_FETCH_DETAIL=true`; manual/admin-triggered runs get title/company/short snippet only. See "Description completeness" below — this is the single largest source of thin descriptions site-wide |
| Indeed | `scrapers/indeed.ts` | Playwright | No | Confirmed live (2026-08) Cloudflare Bot Management blocks the detail page (403/401) on every header combo tested — card-only is not a bug here, it's the ceiling without a residential proxy or paid CAPTCHA-solving service |
| JSearch | `JSearchSource.java` (backend) | RapidAPI | API key | Keyword rotation, site: filter |
| Adzuna | `AdzunaSource.java` (backend) | API | API key | Disabled (`ADZUNA_ENABLED=false`) — no UAE country code, GB workaround unreliable |
| RemoteOK | `RemoteOkSource.java` (backend) | API | No | |
| Himalayas | `HimalayasSource.java` (backend) | API | No | |

## Description completeness (verified against production DB, 2026-08-29)

Half of all 3,974 active jobs have a description ≤100 characters — a teaser,
not real content — even though the raw `description` column is non-null for
~98%+ of rows everywhere. "Non-null" and "actually detailed" are different
things; don't conflate them when debugging a "missing description" report.

| Source | Active jobs | Avg desc length | % ≤100 chars |
|---|---|---|---|
| LinkedIn | 2,828 (71% of DB) | 877 | 61% (1,724 jobs — biggest single contributor, ~43% of the whole DB) |
| Himalayas | 367 | 555 | 18% |
| NaukriGulf | 353 | 171 → fixed 2026-08, expect this to rise on the next run | — |
| GulfTalent | 161 | 65 → fixed 2026-08, expect this to rise on the next run | 96% (pre-fix) |
| JSearch | 104 | 2,792 | 0% |
| Indeed | 26 | 68 (confirmed unfixable without paid infra) | 96% |
| RemoteOK | 21 | 4,252 | 0% |

`requirements` is a separate DB column from `description` and is **100%
empty across every real source** — no scraper currently populates it
distinctly. Where a source's detail page has a genuine Requirements/Desired-
Candidate-Profile section (GulfTalent, NaukriGulf), it's currently folded
into the `description` text rather than split into `requirements` — the LLM/
heuristic formatter still renders it as its own section in the HTML output,
so this isn't visually broken, just not queryable as a separate field. Wiring
a real `requirements` field through end-to-end (`ScrapedJob` → external
ingest DTO → `IngestedJob`) is a natural follow-up, not yet done.

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
