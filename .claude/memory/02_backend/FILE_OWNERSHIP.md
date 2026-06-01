# Backend File Ownership

## Controllers → what they own
| File | Owns |
|------|------|
| `AdminController.java` | /admin/* endpoints, ingest/external, scraper trigger, friction signals, send-welcome |
| `HRController.java` | /hr/*, /jobs CRUD, import-preview, linkedin-import, applications status |
| `AuthController.java` | /auth/* login/register/verify/reset |
| `JobController.java` | /jobs public read |
| `JobSeekerController.java` | /applications, /saved-jobs, /user/profile |

## Services → what they own
| File | Owns |
|------|------|
| `AdminService.java` | userActivity(), frictionSignals(), sendWelcome() |
| `JobIngestService.java` | runAll(), runExternalBatch(), runJSearchForKeyword(), IngestRunLog writes |
| `JobIngestPipeline.java` | process() — reject/normalize/score/dedup/persist |
| `Normalizers.java` | normalizeTitle/Company/Location/Seniority/WorkMode |
| `RelevanceScorer.java` | score(), hardReject() |
| `DedupResolver.java` | hash(), resolve() with L1/L2/L3 |
| `JSearchSource.java` | JSearch RapidAPI calls, buildQuery() with site: filter |
| `UrlJobScraperService.java` | URL import: JSON-LD, og:*, Playwright fallback, inferUaeCity |
| `LinkedInScraperService.java` | LinkedIn HTML scraping, extractLocation(), inferUaeCity |
| `PlaywrightTriggerService.java` | HTTP calls to trigger server on port 3001 |
| `PlaywrightScraperService.java` | Java Playwright (for JS-rendered URL import only — NOT the main scraper) |
| `EmailService.java` | All outbound email |

## DTOs → who uses them
| DTO | Used by |
|-----|---------|
| `AdminDTO.UserActivityResponse` | AdminController → frontend Activity page |
| `AdminDTO.LoginHealthToday` | Nested in UserActivityResponse |
| `AdminDTO.FrictionSignal` | AdminController → frontend FrictionSignals component |
| `ExternalIngestRequest` | AdminController.ingestExternal() ← Playwright scrapers |
| `UrlImportDTO.Preview` | HRController.importPreview() → frontend LinkedInImport.tsx |
| `LinkedInJobData` | LinkedInScraperService → HRController |
| `JobDTO.JobResponse` | JobController, HRController, AdminController → all job-displaying frontend pages |

## Critical invariants
- `JobDTOTest.EXPECTED_FIELD_COUNT = 31` — must update when adding to JobResponse
- `LoginAttempt` logging must use `@Transactional(REQUIRES_NEW)` — do not change propagation
- `normalizeLocation()` first param is named "city" but receives full locationUae string — naming quirk, do not refactor without checking all callers
