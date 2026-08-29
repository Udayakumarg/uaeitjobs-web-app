# Scraper Known Issues

## LinkedIn

### Datacenter IP blocking
VPS has a datacenter IP. LinkedIn blocks these with HTTP 999 or shows login walls.  
**Fix**: Add residential proxy to `PROXIES` env var.

### Login form selectors
LinkedIn uses React dynamic IDs (`:r0:`, `:r1:`). **`#username` does not exist.**  
Use `input[type="email"]` and `input[type="password"]` with `{ force: true }`.

### Force-fill required
Login inputs are in DOM before CSS animation makes them visible to Playwright.  
`page.waitForSelector(...)` with default visibility check times out.  
**Fix**: `page.locator('input[type="email"]').first().fill(value, { force: true })`

### networkidle never fires
LinkedIn has constant background polling. `waitUntil: 'networkidle'` hangs forever.  
**Fix**: Use `'domcontentloaded'` + `waitForTimeout(3000)` instead.

### Session cookie expiry
`.linkedin-cookies.json` expires after some days. Scraper falls back to full re-login + Gmail OTP.  
**Mitigation**: Scraper probes session on every run, re-logs automatically.

### puppeteer-extra-plugin-recaptcha not wired
Package installed (`^3.6.8`) but NOT integrated into login flow. CAPTCHA challenges will fail.  
**TODO**: Wire into `performLogin()` after detecting CAPTCHA page.

## Bayt

### .t-mute selector too generic
Location extracted from `.t-mute` — this class appears on dates, metadata, etc.  
Risk: location may be "2 days ago" or other non-location text.  
**Fix TODO**: Use more specific selector like `[data-automation-id="job-location"]` if available.

## GulfTalent

Card extraction uses named classes (`.title`, `.company-name`, `.location`,
`.date`), not positional `p.eq(n)` selectors — the previous entry here describing
positional fragility was stale (predates a rewrite). See `GULFTALENT.md` for the
current extraction approach, including the 2026-08 fix that made it fetch each
job's own detail page for a real description instead of fabricating one.

## NaukriGulf

See `NAUKRIGULF.md` — as of 2026-08 also fetches each new job's own detail page
for the real description, not just the search-card snippet.

## Description completeness (LinkedIn, Indeed)

**LinkedIn** — manual/admin-triggered scrape runs default to card-only (no detail
fetch); only the scheduled daily cron passes `LI_FETCH_DETAIL=true`. As of
2026-08-29, 61% of LinkedIn's 2,828 active jobs (1,724 jobs, ~43% of the *entire*
active DB) have a description ≤100 characters as a direct result. This is the
single largest remaining source of thin descriptions site-wide and has not been
fixed — extending detail-fetch to manual runs risks tripping LinkedIn's rate
limiting/blocking, so this needs a product decision on that tradeoff before
touching it, not just a code change. See `SOURCES.md` for the full breakdown.

**Indeed** — confirmed live 2026-08 that both the search page and the detail page
are blocked by Cloudflare Bot Management (403/401 on every header combination
tested; the block also escalates to an interactive challenge after ~6 requests in
a short window). Card-only here is the ceiling without paying for a residential
proxy or a CAPTCHA-solving service — not a bug to chase with more selector work.

## Trigger server

### pm2 startup not configured
If VPS reboots, trigger server won't auto-start. Admin trigger buttons show "offline".  
**Fix**: Run `pm2 startup` on VPS and follow instructions.

## General

### Playwright scrapers DO have a daily cron (correction — previously documented as absent)
`trigger-server.ts` schedules Bayt/NaukriGulf/GulfTalent/LinkedIn/Indeed on a
staggered daily UTC schedule (01:00/01:20/01:40/02:00/02:20) in addition to manual
triggers via IngestDashboard or CLI. The scheduled LinkedIn run specifically also
sets `LI_FETCH_DETAIL=true` — see the LinkedIn description-completeness note
above for why manual runs don't get the same treatment.
