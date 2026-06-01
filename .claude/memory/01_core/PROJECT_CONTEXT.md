---
name: project-context
description: "Core identity of UAEITJobs — repos, VPS, stack, CI/CD, env vars"
metadata: 
  node_type: memory
  type: project
  originSessionId: 6dbfd671-d5b7-4590-95f5-28c17451db19
---

# UAEITJobs — Project Context

## What it is
UAE-focused IT job board aggregating listings from LinkedIn, Bayt, NaukriGulf, GulfTalent, JSearch, Adzuna, RemoteOK, Himalayas. Serves UAE-based IT professionals and HR teams. Live at: **https://www.uaeitjobs.com**

---

## Repositories

| Repo | GitHub | Local path |
|------|--------|-----------|
| Backend (Spring Boot) | `github.com/Udayakumarg/uaeitjobs-services` | `C:\Users\inbox\uaeitjobs\uaeitjobs-be` |
| Frontend + Scraper | `github.com/Udayakumarg/uaeitjobs-web-app` | `C:\Users\inbox\uaeitjobs\uaeitjobs-fe` |

**The scraper lives at `scraper/` inside the frontend repo — NOT a separate repo.**

---

## VPS

- **Host**: `82.25.110.205` · **User**: `root` · **Key**: `~/.ssh/new-vps-key`

| Service | VPS path |
|---------|----------|
| Docker compose | `/opt/apps/uaeitjobs/` |
| Frontend repo (incl. scraper) | `/opt/apps/uaeitjobs-web-app/` |
| Scraper only | `/opt/apps/uaeitjobs-web-app/scraper/` |

---

## Database

Container: `qten-db` (shared with QTEN app) · DB: `uaeitjobs_db` · User: `uaeitjobs_user` · Pass: `UaeItJobs2026` · Engine: PostgreSQL · Migrations: Flyway (V1 init, V2 indexes, V3 seed)

---

## User types

| Type | Role |
|------|------|
| `admin` | Super-admin; full admin dashboard |
| `hr` | Employer; posts jobs, manages applicants, URL/LinkedIn import |
| `job_seeker` | Candidate; browses, applies, saves jobs |

---

## Stack

- **Backend**: Java 17, Spring Boot 3, Spring Security (JWT), Spring Data JPA, Flyway, MapStruct, Lombok, Jsoup, Playwright Java
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router v6, Lucide, Axios
- **Scraper**: Node.js 22, TypeScript, ts-node, Playwright, playwright-extra, puppeteer-extra-plugin-stealth, imapflow, mailparser, cheerio, axios
- **Infra**: Docker + docker-compose (backend only), pm2 (scraper trigger server), GitHub Actions CI/CD

---

## CI/CD

Push to `main`:
- **Backend**: GH Actions → Maven → Docker → GHCR → SSH deploy
- **Frontend**: GH Actions → `npm run build` → ESLint → deploy
- **Scraper**: No CI — deployed via `git pull` on VPS manually

### Manual backend redeploy
```bash
cd /opt/apps/uaeitjobs && docker compose pull uaeitjobs-backend && docker stop uaeitjobs-backend && docker rm uaeitjobs-backend && docker compose up -d --no-deps uaeitjobs-backend
```

---

## Key env vars

### Backend
```
APP_INGEST_JSEARCH_ENABLED=true
APP_INGEST_JSEARCH_RAPIDAPI_KEY=<key>      # ⚠ NEEDS ROTATION
APP_INGEST_JSEARCH_SITE_RESTRICT=          # e.g. linkedin.com,bayt.com
APP_SCRAPER_TRIGGER_URL=http://localhost:3001
APP_SCRAPER_TRIGGER_SECRET=uaeit_trigger_2026
```

### Scraper (.env at `/opt/apps/uaeitjobs-web-app/scraper/.env`)
```
BACKEND_URL=https://www.uaeitjobs.com
ADMIN_EMAIL=<admin>
ADMIN_PASSWORD=<pass>
LI_EMAIL=<linkedin account>
LI_PASSWORD=<linkedin pass>
GMAIL_USER=shaalucbe@gmail.com
GMAIL_APP_PASSWORD=<16-char app password>
TRIGGER_PORT=3001
TRIGGER_SECRET=uaeit_trigger_2026
PROXIES=                    # optional http://user:pass@host:port
MAX_PAGES=3
LI_MAX_DETAIL=50
```

---

## Ports

| Service | Port |
|---------|------|
| Backend (Docker) | 8081 |
| Scraper trigger server (pm2, host) | 3001 |

---

## ⚠ Action required
JSearch RapidAPI key was exposed in conversation history — rotate at RapidAPI dashboard.
