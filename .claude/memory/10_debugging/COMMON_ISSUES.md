# Common Issues & Fixes

## Backend

### mvn compile fails after adding field to JobResponse
```
JobDTOTest: EXPECTED_FIELD_COUNT expected 31 but was 32
```
Fix: Update `EXPECTED_FIELD_COUNT` in `JobDTOTest.java`.

### Login returns 401 "Email not verified"
User exists but `verified=false`. Fix: Admin panel → resend verification. Or in DB: `UPDATE users SET verified=true WHERE email='...'`.

### Friction signals empty
`loginAttemptRepository` not populated. Check `LoginAttemptRepository` is wired in `AdminService`. Verify `@Transactional(REQUIRES_NEW)` is on the attempt log method.

### ingestExternal returns 0 inserted, 0 fetched
Scraper sent empty jobs array or malformed JSON. Check `ExternalIngestRequest` field names match `ScrapedJob` interface. Check `externalId`, `title`, `applyUrl` all non-null (required for pipeline entry).

### Duplicate check blocking all imports in importPreview
`jobService.existsByApplyUrl(url)` — URL already in DB. Admin can delete the existing job or update applyUrl.

## Frontend

### Activity page shows empty LoginHealthToday
`loginHealthToday` field missing from `UserActivityStats` TypeScript interface. Add it to `src/types/index.ts`.

### Trigger buttons show "trigger server offline"
pm2 process down on VPS. SSH and run `pm2 restart scraper-trigger`. Check `pm2 logs scraper-trigger` for errors.

### Location dropdown not pre-populated after import
- Check `inferUaeCity()` in `LinkedInScraperService` — confirm hyphen normalisation is present
- Check `HRController.importPreview()` LinkedIn branch sets `.locationUae(ld.getLocation())`
- Check `LinkedInJobData` has `location` field and `scrapeDocument()` calls `extractLocation()`

### Admin Activity page route 404
App.tsx has `import('./pages/Admin/Activity')` not `import('./pages/Admin/AdminActivity')`. The page is in a folder, not a file.

## Scraper

### LinkedIn login timeout on `input[type="email"]`
LinkedIn served a page WITHOUT the login form (bot wall, CAPTCHA, or redirect).  
Check page URL: if not `linkedin.com/login/`, LinkedIn is blocking.  
Fix: Try running headed (`HEADED=true`) to see what's shown. Add residential proxy.

### LinkedIn `waitForSelector` times out even though element exists
Input is in DOM but not "visible" (CSS animation). Use `{ force: true }`:
```typescript
await page.locator('input[type="email"]').first().fill(value, { force: true })
```

### Gmail OTP never arrives
- Check `GMAIL_APP_PASSWORD` is correct (16-char app password, not main password)
- Check `GMAIL_USER` matches the account
- LinkedIn may have sent to a different email — verify scraper account's email address

### GulfTalent returning wrong company/location
Positional `p` selectors broke. `ps.eq(0)` should be company, `ps.eq(1)` location. Inspect a GulfTalent job page HTML to verify structure.

### `playwright-stealth` import errors or no effect
Wrong package. Never use `playwright-stealth`. Always:
```typescript
const { chromium } = require('playwright-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
chromium.use(StealthPlugin())
```

## VPS / Deploy

### Backend not updating after push
CI deployed but container wasn't restarted. Manual redeploy:
```bash
cd /opt/apps/uaeitjobs && docker compose pull uaeitjobs-backend && docker stop uaeitjobs-backend && docker rm uaeitjobs-backend && docker compose up -d --no-deps uaeitjobs-backend
```

### git pull fails with "untracked files would be overwritten"
```bash
git clean -fd scraper/src/utils/   # remove untracked files that conflict
git pull origin main --ff-only
```

### VPS scraper git merge conflict
```bash
git stash
git pull origin main --ff-only
cd scraper && npm install
pm2 restart scraper-trigger
```
