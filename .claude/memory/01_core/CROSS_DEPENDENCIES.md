---
name: cross-dependencies
description: "How backend, frontend, and scraper depend on each other — contracts, shared types, breakage risks"
metadata: 
  node_type: memory
  type: project
  originSessionId: 6dbfd671-d5b7-4590-95f5-28c17451db19
---

# UAEITJobs — Cross-System Dependencies

## Backend ↔ Frontend

### API contract (backend → frontend)
The frontend consumes these backend DTOs directly. Changing any field name or type is a breaking change requiring a frontend update.

| DTO | Frontend type | Used in |
|-----|--------------|---------|
| `JobDTO.JobResponse` | `Job` in `types/index.ts` | Browse, detail, HR portal, admin |
| `AdminDTO.UserActivityResponse` | `UserActivityStats` | Activity page |
| `AdminDTO.LoginHealthToday` | `LoginHealthToday` | `LoginHealthSummary.tsx` |
| `AdminDTO.FrictionSignal` | `FrictionSignal` | `FrictionSignals.tsx` |
| `UrlImportDTO.Preview` | inline `Preview` interface in `LinkedInImport.tsx` | URL/LinkedIn import |
| `IngestRunLog` (entity exposed via status endpoint) | `IngestRunLog` in `types/index.ts` | `IngestDashboard.tsx` |
| `IngestStatus` | `IngestStatus` in `types/index.ts` | `IngestDashboard.tsx` |

### Field count test
`JobDTOTest` asserts `EXPECTED_FIELD_COUNT = 31`. **Adding any field to `JobResponse` requires updating this test.**

### Auth flow
Frontend stores `accessToken` + `refreshToken` in memory/localStorage. Backend issues both on login. `refreshToken` may be null for some login paths — frontend must handle null gracefully.

---

## Backend ↔ Scraper

### Shared API contract
Scraper POSTs to `POST /api/v1/admin/ingest/external`:
```json
{
  "source": "bayt",
  "jobs": [{
    "externalId": "12345",
    "title": "...",
    "company": "...",
    "description": "...",
    "location": "Dubai, AE",
    "emirate": "dubai",
    "applyUrl": "https://...",
    "publisher": "Bayt",
    "postedAt": "2024-01-25",
    "remoteUae": false,
    "jobType": "full_time"
  }]
}
```
**Field names in `ExternalIngestRequest.ExternalJob` must match `ScrapedJob` TypeScript interface exactly.**

If backend renames `location` → `locationUae` here, all scrapers break silently (jobs would all get fallback "United Arab Emirates, AE").

### Trigger contract
Backend → scraper trigger server:
- `POST http://localhost:3001/trigger/{source}` with `X-Trigger-Secret: uaeit_trigger_2026`
- Valid sources: `bayt`, `naukrigulf`, `gulftalent`, `linkedin`
- Response 202 = started, 409 = already_running

If scraper trigger server is down, `GET /admin/scraper/status` returns `{ serverReachable: false, sources: {} }`. Frontend shows "trigger server offline" banner.

### IngestRunLog dependency
`JobIngestService.runExternalBatch()` writes to `IngestRunLog` for every scraper batch. `IngestDashboard` reads these logs. If scraper posts results successfully but runLog fails to write, the dashboard won't show the run.

---

## Frontend ↔ Scraper (indirect)

No direct dependency. Frontend triggers scraper via:
```
Frontend → adminApi.triggerScraper(source) → POST /admin/scraper/trigger/{source} → backend → trigger server → scraper
```

Frontend reads scraper results via the existing IngestRunLog mechanism (same as API ingest sources).

---

## Shared utilities / shared logic

### inferUaeCity / inferEmirate — must stay in sync
Both `LinkedInScraperService.java` and `UrlJobScraperService.java` have `inferUaeCity()`.  
Both `bayt.ts`, `naukrigulf.ts`, `gulftalent.ts`, `linkedin.ts` have `inferEmirate()`.  
Both backend and scraper must normalise hyphens: `text.toLowerCase().replace('-', ' ')` / `text.toLowerCase().replace(/-/g, ' ')`.

If you update emirate detection logic in one place, check all four locations.

### Emirate enum values
Backend stores emirate as lowercase snake_case: `dubai`, `abu_dhabi`, `sharjah`, `ajman`, `ras_al_khaimah`, `fujairah`, `umm_al_quwain`.  
Frontend `<Select>` options use display form: `Dubai`, `Abu Dhabi`, `Ras Al Khaimah`, `Umm Al Quwain` etc.  
`locationUae` field is free text (e.g. `"Dubai, AE"`), `emirate` field is the enum value.

### Source names — must be consistent
Source names used in `IngestRunLog`, `SOURCE_COLORS` map, trigger server, `ScrapedJob.publisher`, and `ExternalIngestRequest.source` must all match:

| Source | IngestRunLog | SOURCE_COLORS | Trigger | publisher field |
|--------|-------------|---------------|---------|----------------|
| `jsearch` | jsearch | violet | N/A (API) | varies |
| `adzuna` | adzuna | sky | N/A | Adzuna |
| `remoteok` | remoteok | emerald | N/A | RemoteOK |
| `himalayas` | himalayas | amber | N/A | Himalayas |
| `bayt` | bayt | rose | POST /trigger/bayt | Bayt |
| `naukrigulf` | naukrigulf | orange | POST /trigger/naukrigulf | NaukriGulf |
| `gulftalent` | gulftalent | teal | POST /trigger/gulftalent | GulfTalent |
| `linkedin` | linkedin | blue (trigger panel) | POST /trigger/linkedin | LinkedIn |

---

## Breakage risks

| Change | What breaks |
|--------|------------|
| Add field to `JobResponse` | `JobDTOTest.EXPECTED_FIELD_COUNT` must increment |
| Rename `ExternalIngestRequest.ExternalJob.location` | All scrapers send wrong field → all jobs get fallback location |
| Change rate limit threshold | `RateLimitingIntegrationTest` + `AuthControllerIntegrationTest` loop counts |
| Change rate limit error message | Both integration tests assert exact string |
| Stop pm2 `scraper-trigger` | Admin trigger buttons show "offline", trigger fails |
| Delete `.linkedin-cookies.json` | Next scraper run must re-login (sends OTP to Gmail) |
| Change `TRIGGER_SECRET` | Must update both `TRIGGER_SECRET` (scraper .env) and `APP_SCRAPER_TRIGGER_SECRET` (backend .env) simultaneously |
| Add emirate without hyphen normalisation | Scrapers fail to match multi-word emirates from LinkedIn |
