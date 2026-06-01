---
name: decisions
description: Architectural and implementation decisions with rationale — why things are built the way they are
metadata: 
  node_type: memory
  type: project
  originSessionId: 6dbfd671-d5b7-4590-95f5-28c17451db19
---

# UAEITJobs — Key Decisions

## Scraper is on host, not in Docker
**Decision**: Playwright scrapers run as Node.js processes on the VPS host, not inside Docker.  
**Why**: Playwright needs a real Chromium binary + system deps that bloat Docker images significantly. Host execution is simpler to manage, debug, and update.  
**Consequence**: Backend (in Docker) cannot exec scrapers directly. Uses HTTP trigger server on port 3001 instead.

## Trigger server over shared volume / cron-only
**Decision**: A small HTTP server (`trigger-server.ts`) on port 3001 accepts on-demand trigger requests.  
**Why**: Admin needs to trigger specific scrapers manually from the UI without SSH. File-based triggers are fragile; a cron-only model has no on-demand capability.  
**Consequence**: pm2 must be running. Secret header (`X-Trigger-Secret`) prevents unauthorized triggers.

## playwright-extra + puppeteer-extra-plugin-stealth over playwright-stealth
**Decision**: Use `playwright-extra@^4.3.6` + `puppeteer-extra-plugin-stealth@^2.11.2`.  
**Why**: `playwright-stealth` on npm is a 2021 placeholder stub at version 0.0.1. Only `playwright-extra` + the puppeteer stealth plugin is the actual working implementation.  
**Lesson**: Never use `playwright-stealth` — it does nothing.

## LinkedIn: input[type="email"] not #username
**Decision**: LinkedIn login uses `input[type="email"]` and `input[type="password"]` selectors.  
**Why**: LinkedIn's React app generates dynamic IDs (`:r0:`, `:r1:`) that change between renders. `#username` does not exist in the actual DOM.  
**Fix needed**: Force-fill `{ force: true }` because inputs are in DOM before CSS animations make them "visible" to Playwright's visibility check.

## LinkedIn: BrowserContext not Page for scraper
**Decision**: `scrapeLinkedIn()` takes `BrowserContext` not `Page`.  
**Why**: LinkedIn scraper needs (a) session cookies loaded into the context, (b) Voyager API route interception set at context level. A single page can't hold cookies for future pages or intercept routes globally.

## inferUaeCity normalises hyphens
**Decision**: `String t = text.toLowerCase().replace('-', ' ')` before all `contains()` checks.  
**Why**: LinkedIn writes "Ras al-Khaimah" and "Umm al-Quwain" with hyphens. Space-based matching fails. Applied in both `LinkedInScraperService` and `UrlJobScraperService`.

## jobLocation as array in JSON-LD
**Decision**: `UrlJobScraperService.tryJsonLd()` handles `jobLocation` as both object and array.  
**Why**: JSON-LD spec allows both. Modern ATS platforms (Greenhouse, Lever, Workday) emit array form. Old code assumed object only — city was silently null for ~50% of imports.  
**Fix**:
```java
JsonNode locNode = node.path("jobLocation");
if (locNode.isArray() && locNode.size() > 0) locNode = locNode.get(0);
```

## LinkedInJobData must have location field
**Decision**: `LinkedInJobData` has a `location` field; `HRController.importPreview` sets `.locationUae(ld.getLocation())`.  
**Why**: The LinkedIn branch of `importPreview` built the Preview response without setting `locationUae` — it was always null. Location was never propagated to the frontend dropdown.

## Login attempt logging uses REQUIRES_NEW
**Decision**: `@Transactional(propagation = REQUIRES_NEW)` on the login attempt log write.  
**Why**: If login fails (bad password, locked, etc.), the outer transaction rolls back. Without REQUIRES_NEW, the attempt record is never written, breaking the rate-limiting and friction signal features.

## Rate limit threshold: 10 not 5
**Decision**: Auth rate limit is 10 requests/minute per IP.  
**Why**: Updated to match real-world usage patterns. Tests updated accordingly (`for (int i = 0; i < 10; i++)`).

## JSearch site:restrict via env var
**Decision**: `APP_INGEST_JSEARCH_SITE_RESTRICT` controls which publisher domains JSearch queries target.  
**Why**: Allows targeting LinkedIn, Bayt etc. via JSearch API without building direct scrapers. Setting `linkedin.com,bayt.com,gulftalent.com` turns JSearch into a LinkedIn-first ingest without any Playwright risk.

## Gmail App Password, not OAuth
**Decision**: Gmail IMAP uses an App Password (`GMAIL_APP_PASSWORD`), not OAuth2.  
**Why**: OAuth2 requires a registered app + refresh token rotation. App Password is simpler for a single-account scraper use case. Trade-off: less secure, requires "Allow less secure apps" to be off and 2FA enabled.

## GulfTalent uses Cheerio not Playwright
**Decision**: GulfTalent scraper uses `axios` + `cheerio` (no browser).  
**Why**: GulfTalent serves SSR HTML to regular HTTP clients. No JavaScript rendering needed. Playwright would be slower and more detectable for a site that doesn't need it.

## EngagementStrip replaces second row of stat cards
**Decision**: 10 stat cards on Activity page condensed to 5 hero cards + 1 `EngagementStrip` component.  
**Why**: "15 cards display is somewhat odd" — user feedback. EngagementStrip shows 5 engagement metrics (active today/7d/30d, new 7d/30d) in a single compact multi-column card.

## DOM lib in scraper tsconfig
**Decision**: `"lib": ["ES2020", "DOM"]` in `scraper/tsconfig.json`.  
**Why**: Playwright's `addInitScript` and `evaluate` callbacks run in browser context. TypeScript needs DOM types (`window`, `WebGLRenderingContext`, `navigator`, `Notification`, `PermissionStatus`) to compile these callbacks. Without DOM lib, TypeScript errors on all browser globals.
