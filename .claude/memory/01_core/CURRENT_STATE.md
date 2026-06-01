---
name: current-state
description: What is fully implemented and working as of June 2026
metadata: 
  node_type: memory
  type: project
  originSessionId: 6dbfd671-d5b7-4590-95f5-28c17451db19
---

# UAEITJobs — Current Implementation State (June 2026)

## Backend — implemented

### Auth
- Register, login (email verification required), logout, refresh token, forgot/reset password
- Rate limiting: 10 req/min per IP · error: "Rate limit exceeded. Please try again shortly."
- `@Transactional(REQUIRES_NEW)` on login attempt logging (failures survive rollback)
- `LoginAttemptRepository` tracks success/failure per user/IP

### Job management
- Full CRUD for HR-posted jobs · search with filters (emirate, category, type, salary, remote, exp)
- Job slug system · view count tracking · apply URL masking for guests
- `JobCategoryClassifier` · `CompanyLogoResolver`

### Ingest pipeline
- **API sources**: JSearch (keyword rotation with tiers), Adzuna, RemoteOK, Himalayas
- **External batch**: `POST /api/v1/admin/ingest/external` receives Playwright scraper results
- Three-level dedup: L1 (externalId), L2 (content hash), L3 (fuzzy)
- Relevance scoring 0-100, min 70 to insert
- `IngestRunLog` tracks every run · `KeywordSearchStrategy` drives JSearch rotation
- `JobIngestPipeline.process()` single entry for all sources
- `Normalizers`: title/company/location/seniority/workMode

### Admin endpoints
- `GET /admin/users/activity` → `UserActivityResponse` with `LoginHealthToday` (attempts, successes, failures, successRate, failureBreakdown)
- `GET /admin/users/friction-signals` → `List<FrictionSignal>` (HIGH/MEDIUM/LOW, sorted)
  - Types: REPEATED_FAILURES, EMPLOYER_INACTIVE, VERIFIED_NEVER_LOGIN, STUCK_PENDING_LONG
- `POST /admin/users/{id}/send-welcome`
- `POST /admin/ingest/run` → async API ingest
- `GET /admin/ingest/status?limit=100` → run logs + running flag
- `POST /admin/scraper/trigger/{source}` → calls trigger server (bayt/naukrigulf/gulftalent/linkedin)
- `GET /admin/scraper/status` → per-source idle/running from trigger server

### HR / URL import
- `POST /hr/jobs/import-preview` — routes LinkedIn URLs to `LinkedInScraperService`, all others to `UrlJobScraperService`
- `UrlJobScraperService` extraction order: JSON-LD (jobLocation as array AND object) → og:locality → `inferUaeCity(title+desc)`
- `LinkedInScraperService` extraction: CSS selectors (`topcard__flavor--bullet` etc.) → `inferUaeCity(loc)` → `inferUaeCity(title+desc)`
- **`inferUaeCity()` in both services normalises hyphens**: `"Ras al-Khaimah"` → matches `"ras al khaimah"` → returns `"Ras Al Khaimah"`
- `LinkedInJobData` has `location` field (added June 2026 — was missing)

---

## Frontend — implemented

### Public: job listing, job detail, SEO (JSON-LD, sitemap)

### Job seeker portal (`/dashboard/*`)
Browse, apply, saved jobs, applications history, profile (avatar, name, phone, country)

### HR portal (`/hr/*`)
Post/edit/delete jobs, applicants, URL import (`/hr/linkedin-import`), subscriptions

### Admin dashboard

**Activity page** (`/admin/activity`) — 4 named sections:
1. User base: 5 hero cards + `EngagementStrip` (active today/7d/30d, new 7d/30d)
2. Login health: `LoginHealthSummary` (4 metric cards) + `LoginFailureBreakdown` (horizontal bars, only shown when failures > 0)
3. Friction signals: `FrictionSignals` table with action buttons (RESEND_VERIFICATION / RESET_PASSWORD / SEND_WELCOME)
4. User lists: recent signups + flagged
- 60s auto-refresh with countdown chip

**Ingest Monitor** (`/admin/ingest`) — IngestDashboard:
- `ManualTriggerPanel`: 4 Playwright scraper buttons (LinkedIn/Bayt/NaukriGulf/GulfTalent) + "Run all API sources" button
  - Shows trigger server online/offline · prevents double-launch (409 when already running)
- Playwright Scrapers section: 3 health cards (bayt/naukrigulf/gulftalent) — last run time-ago, saved/fetched today, insert rate mini-bar
- Pipeline efficiency bar · Recent Runs table · API Keywords tab
- 8s auto-refresh

### Source badge colors
```
jsearch=violet  adzuna=sky     remoteok=emerald  himalayas=amber
bayt=rose       naukrigulf=orange  gulftalent=teal  linkedin=blue
```

---

## Scraper — implemented

### Sources
- **Bayt**: Playwright · CSS selectors · `data-js-job` IDs · jitter delays
- **NaukriGulf**: Playwright · CSS selectors · `data-job-id` · jitter delays
- **GulfTalent**: Cheerio HTTP (no browser — site is SSR) · slug pagination
- **LinkedIn**: Playwright · 3-layer (Voyager API intercept > JSON-LD > semantic DOM) · session cookies

### LinkedIn session
- Cookies → `.linkedin-cookies.json` · probe via `/feed/` navigation
- Login selectors: `input[type="email"]` / `input[type="password"]` (NOT `#username` — LinkedIn uses React dynamic IDs like `:r0:`)
- Force-fill (`{ force: true }`) for inputs in DOM but not yet visible
- OTP code: `gmail-code.ts` polls Gmail IMAP (imapflow + mailparser) every 5s up to 90s

### Trigger server (`src/trigger-server.ts`)
- Port 3001 · pm2 name: `scraper-trigger`
- `GET /status` → `{ status: { bayt: "idle"|"running", ... } }`
- `POST /trigger/:source` → 202 started / 409 already_running
- Auth: `X-Trigger-Secret` header
- `PlaywrightTriggerService.java` in backend calls this

### Stealth stack
- `playwright-extra` + `puppeteer-extra-plugin-stealth` (browser level, ~18 patches)
- `applyContextStealth()` (context level): WebGL vendor → "Intel Inc." / "Intel Iris OpenGL Engine", `window.chrome`, permissions API, language list `['en-AE','en-US','en']`
- UA: Windows Chrome 124 · locale: `en-AE` · tz: `Asia/Dubai` · viewport: 1366×768
- `--disable-http2` flag · image/font/analytics route blocking
- `delayWithJitter(page, baseMs)`: `baseMs ± 1000ms` + smooth scroll

---

## Tests

| Test | Key assertion |
|------|--------------|
| `AuthControllerIntegrationTest` | Users must have `verified=true` before login; rate limit = 10, message updated |
| `RateLimitingIntegrationTest` | Threshold 10, message "Rate limit exceeded. Please try again shortly." |
| `SecurityAuthorizationIntegrationTest` | Bad app status update → 400 (not 404) |
| `JobDTOTest` | `EXPECTED_FIELD_COUNT = 31` |
| `LinkedInScraperServiceTest` | `getLocation()` = "Ras Al Khaimah" from `topcard__flavor--bullet` with "Ras al-Khaimah" text |
