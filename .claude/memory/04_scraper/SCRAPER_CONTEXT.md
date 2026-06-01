---
name: scraper-context
description: "Complete scraper system — sources, stealth, session, trigger server, deployment"
metadata: 
  node_type: memory
  type: project
  originSessionId: 6dbfd671-d5b7-4590-95f5-28c17451db19
---

# UAEITJobs Scraper — Full Context

## Location
- **Repo**: `github.com/Udayakumarg/uaeitjobs-web-app` at `scraper/`
- **Local**: `C:\Users\inbox\uaeitjobs\uaeitjobs-fe\scraper\`
- **VPS**: `/opt/apps/uaeitjobs-web-app/scraper/`
- **NOT a separate repo** — part of frontend repo

## File structure
```
scraper/src/
  index.ts              — orchestrator (browser launch, routes to scrapers, posts results)
  trigger-server.ts     — HTTP server (pm2, port 3001)
  scrapers/
    bayt.ts             — Playwright, CSS selectors, data-js-job card IDs
    naukrigulf.ts       — Playwright, CSS selectors, data-job-id
    gulftalent.ts       — Cheerio HTTP only (no browser — site is SSR)
    linkedin.ts         — Playwright, 3-layer extraction, takes BrowserContext
  utils/
    stealth.ts          — applyContextStealth() context-level patches
    delay.ts            — delayWithJitter(page, baseMs) ±1000ms + smooth scroll
    proxy.ts            — pickProxy(), parseProxy() from PROXIES env var
    gmail-code.ts       — fetchLinkedInVerificationCode() via IMAP (imapflow)
    linkedin-session.ts — ensureLinkedInSession(), cookie load/save/probe, login
  api.ts                — postJobs(source, jobs) → POST /admin/ingest/external
  types.ts              — ScrapedJob, IngestResult interfaces
```

---

## Sources

### Bayt (`bayt.ts`)
- Search URL: `https://www.bayt.com/en/uae/jobs/?q={term}&l=United+Arab+Emirates&start={offset}`
- Card selector: `li[data-js-job]` · ID: `data-js-job` attribute
- Location selector: `.t-mute, .jb-location, [data-automation-id="job-location"]`
- Post-load delay: `delayWithJitter(page, 3000)` (2-4s) · Inter-page: `delayWithJitter(page, 2000)` (1-3s)
- Appends `, AE` to location string

### NaukriGulf (`naukrigulf.ts`)
- Search URL: `https://www.naukrigulf.com/jobs-in-uae?q={term}&city=United+Arab+Emirates&page={n}`
- Card selector: `.ni-job-tuple, .jobTuple, [data-job-id]`
- Location selector: `.loc, .location, .ni-job-tuple-icon-srp-loc, [data-automation="location"]`
- Post-load delay: `delayWithJitter(page, 3500)` (2.5-4.5s)

### GulfTalent (`gulftalent.ts`)
- Uses `axios` + `cheerio` — no Playwright
- URL: `https://www.gulftalent.com/uae/jobs/title/{slug}` + `/{page}` for pagination
- Job links: `a[href*="/uae/jobs/"]` matching `-\d+` at end
- Structure: `h3` = title, `p.eq(0)` = company, `p.eq(1)` = location, `p.eq(2)` = date
- Sleep between pages: 600ms

### LinkedIn (`linkedin.ts`)
- Takes `BrowserContext` (not `Page`) — needs cookies + Voyager route interception
- **Discovery**: `https://www.linkedin.com/jobs/search/?keywords={term}&location=United+Arab+Emirates&f_TPR=r604800&start={offset}`
  - Extracts job IDs from `[data-entity-urn*="jobPosting"]`, `[data-job-id]`, `a[href*="/jobs/view/"]`
- **Detail**: `https://www.linkedin.com/jobs/view/{id}/` for each ID
- **3-layer extraction**:
  1. Voyager API intercept: `**/voyager/api/jobs/jobPostings/**` → captures JSON passively
  2. JSON-LD `JobPosting` from `<script type="application/ld+json">`
  3. Semantic DOM (regex on HTML): `og:title`, `itemprop`, `topcard__flavor--bullet`, largest description block
- Clicks "See more" button before extraction to expand description
- `MAX_DETAIL` (default 50) caps detail fetches per run
- Post-detail delay: `delayWithJitter(page, 2500)`

---

## Stealth stack

### Browser level (playwright-extra + stealth plugin)
```typescript
const { chromium } = require('playwright-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
chromium.use(StealthPlugin())
```
Patches: navigator.webdriver, plugins array, iframe isolation, ~18 total

### Context level (applyContextStealth)
```typescript
// WebGL vendor spoofing
if (parameter === 37445) return 'Intel Inc.'           // UNMASKED_VENDOR_WEBGL
if (parameter === 37446) return 'Intel Iris OpenGL Engine'  // UNMASKED_RENDERER_WEBGL

// window.chrome presence
if (!window.chrome) window.chrome = { runtime: {} }

// Permissions API fix (headless returns 'denied' for notifications)
navigator.permissions.query = (desc) =>
  desc.name === 'notifications'
    ? Promise.resolve({ state: Notification.permission })
    : origQuery(desc)

// Language list
Object.defineProperty(navigator, 'languages', { get: () => ['en-AE', 'en-US', 'en'] })
```

### Browser launch args
```
--no-sandbox, --disable-setuid-sandbox, --disable-blink-features=AutomationControlled,
--disable-infobars, --disable-dev-shm-usage, --disable-http2
```

### Context fingerprint
- UA: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36`
- Locale: `en-AE` · Timezone: `Asia/Dubai` · Viewport: 1366×768 · colorScheme: light

### Route blocking (per page)
- Images/fonts: `**/*.{png,jpg,jpeg,gif,webp,svg,ico,woff,woff2,ttf,eot,mp4,...}`
- Analytics: `**/{google-analytics,googletagmanager,hotjar,clarity,doubleclick,facebook.com/tr}**`

---

## LinkedIn session management (`linkedin-session.ts`)

### Cookie lifecycle
1. Load `.linkedin-cookies.json` if exists → inject into context
2. Probe: navigate to `https://www.linkedin.com/feed/` — if redirects to `/login` → session dead
3. If dead → `performLogin()`
4. Save fresh cookies after successful login

### Login flow
```
goto /login (domcontentloaded, 30s timeout)
waitForTimeout(3000)  // React render time
fill input[type="email"] { force: true }
fill input[type="password"] { force: true }
click button[type="submit"].first() { force: true }
waitForTimeout(5000)
// Check for OTP screen:
if input[name="pin"] or input[autocomplete="one-time-code"] exists:
  code = await fetchLinkedInVerificationCode()
  fill + submit
waitForTimeout(5000)
// Verify: URL must NOT contain /login, /authwall, /checkpoint
save cookies to .linkedin-cookies.json
```

**Critical**: LinkedIn uses dynamic React IDs (`:r0:`, `:r1:`). `#username` does NOT exist. Use `input[type="email"]`.  
**Critical**: Force-fill because inputs are in DOM before CSS animation makes them "visible".

---

## Gmail OTP reader (`gmail-code.ts`)

- IMAP to `imap.gmail.com:993` (SSL)
- Credentials: `GMAIL_USER` + `GMAIL_APP_PASSWORD` (16-char app password, not main password)
- Polls every 5s for up to 90s
- Searches: `from: security@linkedin.com` + `since: last 10 minutes`
- Extracts 6-digit code via `/\b([0-9]{6})\b/`
- Uses `imapflow` + `mailparser` packages

---

## Trigger server (`trigger-server.ts`)

- Port: `TRIGGER_PORT` env var (default 3001)
- Auth: `X-Trigger-Secret` header must match `TRIGGER_SECRET` env var
- `GET /status` → `{ status: { bayt: "idle"|"running", naukrigulf: "idle", gulftalent: "idle", linkedin: "idle" } }`
- `POST /trigger/:source` → 202 started / 409 already_running / 400 unknown source / 401 bad secret
- Spawns: `npx ts-node src/index.ts --source={source}` as child process
- Prevents double-launch: `Map<source, boolean>` tracking

### pm2 start command
```bash
cd /opt/apps/uaeitjobs-web-app/scraper
TRIGGER_SECRET=uaeit_trigger_2026 TRIGGER_PORT=3001 \
  pm2 start 'npx ts-node src/trigger-server.ts' --name scraper-trigger
pm2 save
```

### Backend wiring
- `PlaywrightTriggerService.java` calls trigger server
- Config: `APP_SCRAPER_TRIGGER_URL=http://localhost:3001` + `APP_SCRAPER_TRIGGER_SECRET=uaeit_trigger_2026`
- Endpoints: `POST /api/v1/admin/scraper/trigger/{source}` · `GET /api/v1/admin/scraper/status`

---

## npm scripts
```json
"scrape": "ts-node src/index.ts"
"scrape:bayt": "ts-node src/index.ts --source=bayt"
"scrape:naukrigulf": "ts-node src/index.ts --source=naukrigulf"
"scrape:gulftalent": "ts-node src/index.ts --source=gulftalent"
"scrape:linkedin": "ts-node src/index.ts --source=linkedin"
"scrape:all": "ts-node src/index.ts --source=gulftalent,bayt,naukrigulf"
"trigger-server": "ts-node src/trigger-server.ts"
```

---

## Key packages
```json
"playwright": "^1.44.0"
"playwright-extra": "^4.3.6"
"puppeteer-extra-plugin-stealth": "^2.11.2"
"puppeteer-extra-plugin-recaptcha": "^3.6.8"   // installed, not yet wired
"imapflow": "^1.3.4"
"mailparser": "^3.9.9"
"cheerio": "^1.2.0"
"axios": "^1.16.1"
"dotenv": "^16.4.5"
```

---

## Known issues
- LinkedIn login works but datacenter IP risks 999 blocks without residential proxies
- `puppeteer-extra-plugin-recaptcha` installed but not integrated into flow yet
- `--disable-http2` flag in browser args helps with TLS fingerprint but not sufficient alone
- No proxy configured (`PROXIES=` is empty) — residential proxy would significantly improve LinkedIn success rate
