# UAEITJobs Frontend + Scraper — Claude Context

This repo contains the React frontend AND the Node.js Playwright scraper (at `scraper/`).

## Read at session start
1. `.claude/memory/00_bootstrap/SESSION_BOOTSTRAP.md` — quick orientation, VPS access, key files
2. `.claude/memory/01_core/CURRENT_STATE.md` — what is built and working
3. `.claude/memory/01_core/NON_NEGOTIABLES.md` — hard rules (credentials, git, style)

## Full memory index
`.claude/memory/` contains the complete project knowledge base:
- `00_bootstrap/` — session startup guides
- `01_core/` — architecture, decisions, cross-dependencies
- `02_backend/` — backend subsystem details
- `03_frontend/` — frontend structure, routes, patterns
- `04_scraper/` — scraper sources, stealth, session, trigger server
- `05_deployment/` — VPS, Docker, pm2, env vars
- `10_debugging/` — known issues, fixes, debugging guides

## Key facts
- **Backend repo**: `github.com/Udayakumarg/uaeitjobs-services` at `C:\Users\inbox\uaeitjobs\uaeitjobs-be`
- **VPS**: `root@82.25.110.205` key `~/.ssh/new-vps-key`
- **Scraper**: lives at `scraper/` in THIS repo — deployed to `/opt/apps/uaeitjobs-web-app/scraper/` on VPS
- **Trigger server**: pm2 process `scraper-trigger` on port 3001 on VPS host
- **Never** enter passwords in chat. Never use `playwright-stealth` (stub). Always `mvn clean compile -q` before backend commits.
