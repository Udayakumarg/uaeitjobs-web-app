# Deployment Overview

## Architecture on VPS

```
VPS (82.25.110.205)
  │
  ├── Docker containers
  │     ├── uaeitjobs-backend  (Spring Boot, port 8081)
  │     └── qten-db            (PostgreSQL, shared with QTEN app)
  │
  ├── Host processes (pm2)
  │     └── scraper-trigger    (Node.js, port 3001)
  │
  └── Static files
        └── uaeitjobs-web-app/ (React build + scraper source)
```

## CI/CD pipelines

### Backend (uaeitjobs-services)
Push to `main` → GitHub Actions:
1. `mvn clean package` (builds JAR)
2. Docker build → push to GHCR
3. SSH to VPS → pull new image → restart container

### Frontend (uaeitjobs-web-app)
Push to `main` → GitHub Actions:
1. `npm install && npm run build`
2. ESLint check
3. Deploy static files to VPS

### Scraper
No CI — manual process:
```bash
ssh -i ~/.ssh/new-vps-key root@82.25.110.205
cd /opt/apps/uaeitjobs-web-app && git pull origin main --ff-only
cd scraper && npm install
pm2 restart scraper-trigger
```

## Manual backend redeploy (memorize)
```bash
cd /opt/apps/uaeitjobs && \
docker compose pull uaeitjobs-backend && \
docker stop uaeitjobs-backend && \
docker rm uaeitjobs-backend && \
docker compose up -d --no-deps uaeitjobs-backend
```
**Never use `docker compose down`** — it stops the DB container too.

## VPS paths
| What | Path |
|------|------|
| Docker compose files | `/opt/apps/uaeitjobs/` |
| Backend .env | `/opt/apps/uaeitjobs/.env` |
| Frontend/scraper repo | `/opt/apps/uaeitjobs-web-app/` |
| Scraper .env | `/opt/apps/uaeitjobs-web-app/scraper/.env` |
| Scraper cookies | `/opt/apps/uaeitjobs-web-app/scraper/.linkedin-cookies.json` |
