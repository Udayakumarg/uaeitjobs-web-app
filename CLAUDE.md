# UAEITJobs — Claude Context (auto-loaded)

Frontend + Scraper repo. Backend is separate: `C:\Users\inbox\uaeitjobs\uaeitjobs-be`

## Identity
- UAE IT job board at https://www.uaeitjobs.com
- VPS: `root@82.25.110.205` key `~/.ssh/new-vps-key`
- DB: `uaeitjobs_db` on `qten-db` container (PostgreSQL)
- Scraper: `scraper/` in this repo → VPS at `/opt/apps/uaeitjobs-web-app/scraper/`
- Trigger server: pm2 `scraper-trigger` on port 3001, secret `uaeit_trigger_2026`

## Hard rules — always apply, no exceptions

**Credentials**: Never ask user to paste passwords/keys in chat. Never enter them via tools. If they appear in chat, flag immediately and tell user to rotate.

**Before every backend commit**: `mvn clean compile -q` — no output = success.

**Before every scraper commit**: `npx tsc --noEmit` in `scraper/` directory.

**Never use `playwright-stealth`** — npm stub at 0.0.1. Always use `playwright-extra` + `puppeteer-extra-plugin-stealth`.

**Never `docker compose down`** — stops the shared DB. Use: `docker stop uaeitjobs-backend && docker rm uaeitjobs-backend && docker compose up -d --no-deps uaeitjobs-backend`

**Git**: No force-push to main. No `--no-verify`. Always end commits with:
`Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`

**Responses**: Terse. No trailing summaries. No emoji unless asked.

## Critical state (June 2026)
- LinkedIn login uses `input[type="email"]` NOT `#username` (React dynamic IDs)
- `inferUaeCity()` must normalise hyphens: `.toLowerCase().replace('-', ' ')`
- `jobLocation` in JSON-LD handled as array AND object in `UrlJobScraperService`
- `LinkedInJobData` has `location` field — `HRController` sets `.locationUae(ld.getLocation())`
- `JobDTOTest.EXPECTED_FIELD_COUNT = 31` — increment when adding fields to `JobResponse`
- Rate limit: 10 req/min · error: "Rate limit exceeded. Please try again shortly."
- Login attempt logging uses `@Transactional(REQUIRES_NEW)` — do not change propagation
- ⚠ JSearch RapidAPI key needs rotation (was exposed in conversation history)

## For complex tasks — read these in order
1. `.claude/memory/00_bootstrap/SESSION_BOOTSTRAP.md` — VPS, repos, commit style, pm2
2. `.claude/memory/01_core/CURRENT_STATE.md` — all implemented features + endpoints
3. `.claude/memory/01_core/ARCHITECTURE.md` — subsystem connections
4. `.claude/memory/01_core/DECISIONS.md` — why things are built as they are

**Scraper work**: also read `.claude/memory/04_scraper/SCRAPER_CONTEXT.md`
**Backend work**: also read `.claude/memory/02_backend/BACKEND_OVERVIEW.md`
**Admin UI work**: also read `.claude/memory/03_frontend/ADMIN_DASHBOARD.md`

## Full memory index
`.claude/memory/` — 73 files covering every subsystem, deployment, debugging
