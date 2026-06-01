# UAEITJobs — Claude Project Memory

This directory contains structured context for Claude AI sessions working on UAEITJobs.

## How to use

### Starting a new Claude session
1. Open Claude Code in `C:\Users\inbox\uaeitjobs\uaeitjobs-fe`
2. Claude auto-reads `CLAUDE.md` at repo root — provides quick orientation
3. Ask Claude to read the full bootstrap: "Read .claude/memory/00_bootstrap/SESSION_BOOTSTRAP.md"
4. Or paste the prompt from `00_bootstrap/NEW_SESSION_PROMPT.md`

### Working on backend only
Open Claude Code in `C:\Users\inbox\uaeitjobs\uaeitjobs-be` — Claude reads that repo's `CLAUDE.md` automatically.

## Directory index

```
00_bootstrap/   — Read first: session startup, rules, new session prompt template
01_core/        — Architecture, decisions, current state, known issues, cross-dependencies
02_backend/     — Backend subsystems: API map, DB model, auth, ingest, URL import, admin
03_frontend/    — Frontend: routes, components, admin dashboard, styling patterns
04_scraper/     — All scraper sources, stealth, LinkedIn session, trigger server, pm2
05_deployment/  — VPS setup, Docker, env vars, CI/CD, manual redeploy
10_debugging/   — Common issues, fixes, debugging guides
11_snapshots/   — Point-in-time state snapshots
```

## Keeping this updated

After significant features or fixes, update:
- `01_core/CURRENT_STATE.md` — add new endpoints/behaviours
- `01_core/KNOWN_ISSUES.md` — add/remove known issues
- `01_core/TODO.md` — update task list
- Relevant subsystem file (e.g., `02_backend/ADMIN_SERVICES.md` for new admin endpoints)

## Last updated
June 2026 — covers all work through LinkedIn scraper, Gmail OTP, manual trigger UI, and URL import location fixes.
