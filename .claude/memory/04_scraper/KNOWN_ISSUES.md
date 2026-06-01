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

### Positional p selector fragility
`ps.eq(0)` = company, `ps.eq(1)` = location, `ps.eq(2)` = date.  
If GulfTalent adds/removes a `<p>` tag, this silently picks wrong fields.  
**Fix TODO**: Use data attributes or structured selectors when available.

## Trigger server

### pm2 startup not configured
If VPS reboots, trigger server won't auto-start. Admin trigger buttons show "offline".  
**Fix**: Run `pm2 startup` on VPS and follow instructions.

## General

### No cron for Playwright scrapers
Bayt, NaukriGulf, GulfTalent, LinkedIn have no scheduled cron — manual trigger only (via IngestDashboard or CLI).  
**TODO**: Set up cron via pm2 ecosystem config or crontab.
