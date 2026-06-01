# Backend Overview

**Repo**: `github.com/Udayakumarg/uaeitjobs-services` · **Local**: `C:\Users\inbox\uaeitjobs\uaeitjobs-be`  
**Stack**: Java 17, Spring Boot 3, Spring Security (JWT), Spring Data JPA, Flyway, MapStruct, Lombok  
**DB**: PostgreSQL on `qten-db` container · `uaeitjobs_db` database

## Package structure

```
com.uaeitjobs
  controller/           — HTTP layer
    AdminController     — /api/v1/admin/* (ingest, scraper trigger, users, jobs)
    AuthController      — /api/v1/auth/*
    HRController        — /api/v1/hr/*, /api/v1/jobs (HR CRUD), /api/v1/linkedin-import
    JobController       — /api/v1/jobs (public read)
    JobSeekerController — /api/v1/jobseeker/*
    SeoController       — sitemap, robots.txt
    SkillController     — /api/v1/skills

  service/
    AdminService        — userActivity(), frictionSignals(), sendWelcome()
    AuthService         — register, login, refresh, verify, reset password
    JobService          — CRUD, search, slug generation
    HRService           — HR-specific job ops, applicant management
    JobSeekerService    — applications, saved jobs, profile
    EmailService        — all outbound email
    UrlJobScraperService — URL import (JSON-LD → og → inferUaeCity)
    LinkedInScraperService — LinkedIn import (CSS → inferUaeCity)
    PlaywrightTriggerService — calls Node.js trigger server on port 3001
    AsyncDescriptionEnhancer — background description enhancement

  service/ingest/
    JobIngestService    — orchestrates all ingest runs, writes IngestRunLog
    JobIngestPipeline   — single process() entry: reject→normalize→score→dedup→persist
    JSearchSource       — JSearch RapidAPI calls with keyword + site: filter
    AdzunaSource        — Adzuna API
    RemoteOkSource      — RemoteOK API
    HimalayasSource     — Himalayas API
    IngestedJob         — source-agnostic record (input to pipeline)

  service/ingest/pipeline/
    Normalizers         — title, company, location, seniority, workMode
    TechnologyExtractor — tech keyword extraction using TechCatalog
    TechCatalog         — master list of tech patterns + display names
    RelevanceScorer     — 0-100 score, hardReject() check
    DedupResolver       — L1/L2/L3 dedup logic
    JobDescriptionFormatter — plain text formatter
    DescriptionFormatterRegistry — per-vendor HTML formatters
    CompanyLogoResolver — logo URL resolution

  dto/                  — request/response DTOs (AdminDTO, JobDTO, AuthDTO, etc.)
  entity/               — JPA entities (Job, User, ApplicationEntity, IngestRunLog, etc.)
  repository/           — Spring Data interfaces
  config/               — SecurityConfig, JwtConfig, RateLimitingInterceptor, CacheConfig
  util/                 — JwtUtil, SlugGenerator, JobCategoryClassifier, SecurityUtils
  mapper/               — MapStruct: JobMapper, UserMapper, ApplicationMapper
  exception/            — GlobalExceptionHandler, custom exceptions
```

## Key behaviours

| Behaviour | Where |
|-----------|-------|
| Rate limiting | `RateLimitingInterceptor` — 10 req/min per IP on auth endpoints |
| JWT auth | `JwtAuthenticationFilter` — reads Bearer token, sets SecurityContext |
| Login attempt log | `AuthService` with `@Transactional(REQUIRES_NEW)` |
| Job insert | `JobIngestPipeline.process()` then `jobRepository.save()` |
| Ingest orchestration | `JobIngestService.runAll()` and `runExternalBatch()` |
| URL import routing | `HRController.importPreview()` — LinkedIn vs generic |
| Scraper trigger | `PlaywrightTriggerService` → HTTP to localhost:3001 |

## Compile check
```bash
cd C:\Users\inbox\uaeitjobs\uaeitjobs-be
mvn clean compile -q   # no output = success
```
