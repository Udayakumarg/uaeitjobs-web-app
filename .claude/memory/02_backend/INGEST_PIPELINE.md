# Ingest Pipeline

## Entry points

| Source | How it enters pipeline |
|--------|----------------------|
| JSearch | `JobIngestService.runJSearchForKeyword(kw)` → `pipeline.process(job)` |
| Adzuna / RemoteOK / Himalayas | `JobIngestService.runGeneric(source)` → `pipeline.process(job)` |
| Bayt / NaukriGulf / GulfTalent / LinkedIn | `POST /admin/ingest/external` → `AdminController.ingestExternal()` → `jobIngestService.runExternalBatch()` → `pipeline.process(job)` |

All paths converge at `JobIngestPipeline.process(IngestedJob)`.

## Pipeline steps

```
IngestedJob
  │
  ├─ 1. Hard reject
  │     RelevanceScorer.hardReject(title, locationUae, "AE", description)
  │     isPublisherAllowed() — checks publisher allowlist if configured
  │
  ├─ 2. Normalise
  │     Normalizers.normalizeTitle(rawTitle)
  │     Normalizers.normalizeCompany(companyName)
  │     Normalizers.normalizeLocation(locationUae, emirate, null) → LocaleInfo(city, emirate, country)
  │     Normalizers.classifySeniority(title, description)
  │     Normalizers.classifyWorkMode(title, description, remoteUae)
  │
  ├─ 3. Technology extraction
  │     TechnologyExtractor.applyTo(job, haystack) — sets has_* booleans + JSONB skills
  │     TechCatalog.ENTRIES — master pattern list (shared with LinkedInScraperService)
  │
  ├─ 4. Score
  │     RelevanceScorer.score(title, description, techCount, reasons)
  │     MIN_SCORE = 70 — below this → Rejected(SCORE)
  │
  ├─ 5. Dedup
  │     hash = dedup.hash(normCompany, normTitle, locale.city())
  │     DedupResolver.resolve(source, externalJobId, hash, normTitle, normCompany, city)
  │       L1: match by source + externalJobId → update lastSeenAt
  │       L2: match by dedupHash → update lastSeenAt + duplicateSourceCount++
  │       L3: fuzzy title+company match → update lastSeenAt
  │
  └─ 6. Persist new
        populateNewJob(job, incoming, hash, now)
          — description_sections (JSONB) ← descriptionFormatter.parseSections(raw)
          — description             ← descriptionFormatter.format(raw)
          — description_html        ← formatterRegistry.forVendor(source).toHtml(raw)
          — requirements             ← incoming.requirements() verbatim (see note below)
        jobRepository.save(job)
        → Inserted
```

## Description formatting — what it does and does NOT do

`description_html` (the field every page actually renders) comes from
`DescriptionFormatterRegistry.forVendor(source).toHtml(raw)`, resolved in this
order: (1) a vendor-specific formatter registered for that exact `source` string,
(2) the bean registered under `"default"` (currently `LlmDescriptionFormatter` —
OpenAI/Gemini/Claude, configurable via `app.llm.provider`), (3) always-on fallback
`HeuristicDescriptionFormatter` (regex-based).

**This step only re-formats text that was already scraped — it cannot fetch or
invent content.** `LlmDescriptionFormatter`'s own system prompt explicitly
instructs the model to preserve the original wording exactly and never
paraphrase, summarise, or add new content; its job is purely to wrap flat text in
semantic `<h3>/<p>/<ul>/<li>` HTML. If the upstream scraper only captured a
one-line teaser, the LLM formats *that same teaser* — a thin description is
always a scraping-stage problem (see `04_scraper/SOURCES.md` → "Description
completeness"), never something this step can compensate for. On any failure
(disabled, missing key, timeout, malformed/non-HTML response), it silently falls
back to the heuristic formatter — a job is never dropped over an LLM failure, but
also never gets richer than what was actually scraped.

**`requirements`** is stored directly from `incoming.requirements()` with no
processing. As of 2026-08 this is empty for 100% of jobs from every real
source — no scraper currently extracts a requirements section as a distinct
field, even where the source page has one (GulfTalent, NaukriGulf fold it into
the general description text instead; see their per-source docs).

## Normalizers.normalizeLocation behaviour
```java
normalizeLocation(city, area, country)
// city = incoming.locationUae() e.g. "Dubai, AE"
// area = incoming.emirate()    e.g. "dubai"
// Derives emirate from haystack (city + area)
// cityOut: if city is EMPTY and emirate found → capitalize emirate
//          if city is NON-EMPTY → use city as-is
// countryOut: "AE" default
```
Note: `city` parameter actually receives the full `locationUae` string, not just the city name. This is a naming quirk — do not rename without updating all callers.

## IngestRunLog
Written by `JobIngestService` for every batch (open at start, close at end with counters):
- `openLog(source, keyword)` → saves with `startedAt`
- `closeLog(runLog, counters)` → sets `finishedAt`, fetched, inserted, rejectedHard, rejectedScore, duplicatesL1/L2/L3

## ExternalIngestRequest mapping (Playwright scrapers)
`AdminController.ingestExternal()` maps `ExternalJob` → `IngestedJob`:
- `externalId` → `src + "_" + j.getExternalId()` (prefixed with source)
- `location` → `locationUae` (null → "United Arab Emirates, AE")
- `jobType` → null → "full_time"
- `salaryCurrency` → null → "AED"
- `experienceLevel` → `inferExperienceLevel(title)`

## Publisher allowlist
`app.ingest.publisher-allowlist` (default empty = accept all)  
Matches case-insensitive substring on publisher name OR apply URL host.  
Example: `linkedin,bayt,naukrigulf,naukri.com,gulftalent`
