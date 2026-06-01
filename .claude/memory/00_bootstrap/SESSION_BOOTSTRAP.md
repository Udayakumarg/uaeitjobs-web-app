---
name: session-bootstrap
description: Everything a new Claude session needs to know to start working immediately on UAEITJobs
metadata: 
  node_type: memory
  type: project
  originSessionId: 6dbfd671-d5b7-4590-95f5-28c17451db19
---

# New Session Bootstrap — UAEITJobs

## Read these files first (in order)
1. `01_core/PROJECT_CONTEXT.md` — repos, VPS, stack, env vars
2. `01_core/CURRENT_STATE.md` — what is built and working
3. `01_core/ARCHITECTURE.md` — how subsystems connect
4. `01_core/NON_NEGOTIABLES.md` — rules that must not be broken
5. `01_core/DECISIONS.md` — why things are built the way they are
6. `04_scraper/SCRAPER_CONTEXT.md` — scraper-specific details

---

## Quick orientation

### Two repos, one scraper
- Backend → `C:\Users\inbox\uaeitjobs\uaeitjobs-be` (Spring Boot)
- Frontend + Scraper → `C:\Users\inbox\uaeitjobs\uaeitjobs-fe` (React + Node.js at `scraper/`)

### VPS access
```bash
ssh -i ~/.ssh/new-vps-key root@82.25.110.205
```

### Backend compile check
```bash
cd C:\Users\inbox\uaeitjobs\uaeitjobs-be
mvn clean compile -q   # no output = success
```

### Scraper TypeScript check
```bash
cd C:\Users\inbox\uaeitjobs\uaeitjobs-fe\scraper
npx tsc --noEmit
```

### Push changes
```bash
# Frontend/scraper
cd C:\Users\inbox\uaeitjobs\uaeitjobs-fe
git add <files> && git commit -m "..." && git push origin main

# Backend
cd C:\Users\inbox\uaeitjobs\uaeitjobs-be
git add <files> && git commit -m "..." && git push origin main

# Pull on VPS (scraper only — backend auto-deploys via CI)
ssh -i ~/.ssh/new-vps-key root@82.25.110.205 "cd /opt/apps/uaeitjobs-web-app && git pull origin main --ff-only && cd scraper && npm install"
```

---

## Active pm2 processes on VPS
```
scraper-trigger   port 3001   X-Trigger-Secret: uaeit_trigger_2026
```
Check: `pm2 status` · Restart: `pm2 restart scraper-trigger`

---

## Current priorities / known issues

### ⚠ Action required
- JSearch RapidAPI key needs rotation (exposed in conversation history)

### LinkedIn scraper
- Login flow is working but LinkedIn occasionally blocks datacenter IPs
- No residential proxies configured — scraper runs on VPS datacenter IP
- `puppeteer-extra-plugin-recaptcha` is installed but not wired into scraper yet
- Cookies saved to `.linkedin-cookies.json` in scraper working dir

### Scraper trigger
- pm2 must be running for admin UI trigger buttons to work
- If trigger server is down, IngestDashboard shows "trigger server offline"

---

## Key file locations

| What | Where |
|------|-------|
| All admin API endpoints | `AdminController.java` |
| All HR API endpoints | `HRController.java` |
| Ingest pipeline entry | `JobIngestPipeline.java` |
| URL import (non-LinkedIn) | `UrlJobScraperService.java` |
| LinkedIn import | `LinkedInScraperService.java` |
| All frontend API calls | `src/services/api.ts` |
| All TypeScript types | `src/types/index.ts` |
| Admin Activity page | `src/pages/Admin/Activity/index.tsx` |
| Ingest Monitor | `src/pages/Admin/IngestDashboard.tsx` |
| LinkedIn/URL import page | `src/pages/HR/LinkedInImport.tsx` |
| Scraper orchestrator | `scraper/src/index.ts` |
| LinkedIn scraper | `scraper/src/scrapers/linkedin.ts` |
| Session manager | `scraper/src/utils/linkedin-session.ts` |
| Gmail OTP reader | `scraper/src/utils/gmail-code.ts` |
| Trigger server | `scraper/src/trigger-server.ts` |
| Trigger service (backend) | `PlaywrightTriggerService.java` |

---

## Commit message style
```
feat(scope): short description
fix(scope): short description

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## User preferences
- Terse responses — no trailing summaries
- No emoji unless requested
- Direct answers — no headers for conversational replies
- Credentials must never be pasted in chat — always direct user to terminal
- Push to remote after any significant change
