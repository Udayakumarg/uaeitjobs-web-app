---
name: architecture
description: "System architecture, subsystem boundaries, data flow, and service responsibilities"
metadata: 
  node_type: memory
  type: project
  originSessionId: 6dbfd671-d5b7-4590-95f5-28c17451db19
---

# UAEITJobs — Architecture

## System overview

```
Browser
  │
  ├── Frontend (React/Vite) ──────────────────────────────────────────────────┐
  │     Served statically on VPS                                               │
  │     Calls backend at /api/v1/*                                             │
  │                                                                            │
  └── Backend (Spring Boot, Docker:8081) ──────────────────────────────────── │
        │                                                                      │
        ├── PostgreSQL (qten-db container)                                     │
        │                                                                      │
        └── Scraper Trigger Server (pm2, host:3001) ──────────────────────────┘
              │
              └── Playwright Scrapers (Node.js, host)
                    └── POST results → backend /admin/ingest/external
```

**Key constraint**: Backend runs in Docker. Scraper runs on host. They communicate via:
- Backend → trigger server (HTTP:3001) to START scrapers
- Scrapers → backend API to POST results

---

## Subsystems

### 1. Ingest pipeline
**Owner**: `JobIngestPipeline.java`

All jobs — regardless of source — flow through:
```
IngestedJob → hardReject? → normalize → extractTech → score → dedup → persist
```
- `Normalizers`: title, company, location, seniority, workMode
- `TechnologyExtractor` + `TechCatalog`: shared between pipeline and LinkedIn scraper
- `RelevanceScorer`: 0-100, min score 70
- `DedupResolver`: L1 (externalId) → L2 (content hash) → L3 (fuzzy)
- `IngestRunLog`: written by `JobIngestService` for every batch
- `JobDescriptionFormatter` + `DescriptionFormatterRegistry`: per-vendor HTML formatters

**Sources feeding the pipeline**:
| Source | Entry point |
|--------|-------------|
| JSearch (API) | `JSearchSource.search(keyword)` |
| Adzuna / RemoteOK / Himalayas | `JobIngestSource.fetch()` |
| Bayt / NaukriGulf / GulfTalent / LinkedIn (Playwright) | `POST /admin/ingest/external` |

### 2. URL import engine
**Owner**: `UrlJobScraperService.java` + `LinkedInScraperService.java`

Routing in `HRController.importPreview`:
- LinkedIn URL → `LinkedInScraperService.scrapeDocument()` → `LinkedInJobData` (has `.location`)
- Other URL → `UrlJobScraperService.scrape()` → `UrlImportDTO.Preview`

Extraction priority (both):
1. JSON-LD `JobPosting` (jobLocation handled as object OR array)
2. og:locality / CSS selectors
3. `inferUaeCity(text)` — scans for UAE city names, normalises hyphens

### 3. Scraper trigger architecture
```
AdminController → PlaywrightTriggerService → HTTP:3001 → trigger-server.ts → spawn npm run scrape:{source}
```
- `PlaywrightTriggerService`: configured via `APP_SCRAPER_TRIGGER_URL` + `APP_SCRAPER_TRIGGER_SECRET`
- Trigger server prevents double-launch per source (tracks `Map<source, boolean>`)
- Results flow back asynchronously: scraper → `POST /admin/ingest/external`

### 4. Admin dashboard data flow
```
AdminController → AdminService → repositories → DTOs → frontend
```
- `userActivity()`: aggregates users + login attempts → `UserActivityResponse` with `LoginHealthToday`
- `frictionSignals()`: queries for anomalous accounts → sorted HIGH→MEDIUM→LOW
- `sendWelcome()`: `@Transactional` call to `EmailService`

### 5. Authentication
```
Login request → RateLimitingInterceptor → AuthService → LoginAttemptRepository (REQUIRES_NEW) → JWT pair
```
- Access token (short-lived) + refresh token
- Email verification required before login
- `@Transactional(REQUIRES_NEW)` on attempt logging: failure is recorded even if outer tx rolls back

---

## Data model — key entities

| Entity | Key fields |
|--------|-----------|
| `Job` | slug, title, normalizedTitle, companyName, normalizedCompanyName, locationUae, city, emirate, country, source, externalJobId, externalSource, dedupHash, relevanceScore, jobCategory, descriptionHtml, descriptionSections, companyLogoUrl, companyDomain, workMode, seniority |
| `User` | email, userType, verified, lastLogin, avatarUrl |
| `LoginAttempt` | userId, email, ipAddress, success, failureReason, createdAt |
| `IngestRunLog` | source, keyword, startedAt, finishedAt, fetched, inserted, duplicatesL1/L2/L3, rejectedHard, rejectedScore, error |
| `KeywordSearchStrategy` | keyword, tier, totalRuns, totalInserted, lastRunAt |
| `ApplicationEntity` | jobId, userId, status (APPLIED/REVIEWED/SHORTLISTED/REJECTED) |

---

## Frontend architecture

```
src/
  pages/
    Admin/
      Activity/         ← index.tsx (shell), LoginHealthSummary, LoginFailureBreakdown, FrictionSignals
      IngestDashboard.tsx
      AdminUsers.tsx
      AdminJobs.tsx
    HR/
      LinkedInImport.tsx  ← used for BOTH LinkedIn AND general URL import
      JobForm.tsx
    Jobs/               ← browse + detail
    Dashboard/          ← job seeker portal
  services/
    api.ts              ← all API calls: hrApi, adminApi, authApi, jobApi
  types/
    index.ts            ← all shared TypeScript types
  components/
    ui/                 ← Button, Card, Field, Input, Select, Textarea
    Toast.tsx
```

**Important**: `LinkedInImport.tsx` is used for ALL URL imports — LinkedIn AND generic URLs. Its route is `/hr/linkedin-import` but it calls `hrApi.importPreview` which the backend routes intelligently.

---

## Scraper architecture

```
scraper/src/
  index.ts              ← orchestrator: launches browser, routes to scrapers, posts results
  trigger-server.ts     ← HTTP server (pm2), accepts trigger requests
  scrapers/
    bayt.ts
    naukrigulf.ts
    gulftalent.ts       ← uses cheerio, no Playwright
    linkedin.ts         ← 3-layer extraction, uses context not page
  utils/
    stealth.ts          ← applyContextStealth() - context-level patches
    delay.ts            ← delayWithJitter()
    proxy.ts            ← pickProxy(), parseProxy()
    gmail-code.ts       ← fetchLinkedInVerificationCode() via IMAP
    linkedin-session.ts ← ensureLinkedInSession(), performLogin(), isSessionLive()
  api.ts                ← postJobs() to backend
  types.ts              ← ScrapedJob, IngestResult
```

**LinkedIn scraper takes `context` not `page`** (needs full context for cookie management + Voyager API route interception).

All others take `page` (shared page object from index.ts).
