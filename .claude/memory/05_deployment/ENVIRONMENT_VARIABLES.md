# Environment Variables

## Backend (`/opt/apps/uaeitjobs/.env`)

```env
# Database
SPRING_DATASOURCE_URL=jdbc:postgresql://qten-db:5432/uaeitjobs_db
SPRING_DATASOURCE_USERNAME=uaeitjobs_user
SPRING_DATASOURCE_PASSWORD=UaeItJobs2026

# JWT
APP_JWT_SECRET=<secret>
APP_JWT_EXPIRATION_MS=<ms>

# Email (SMTP)
SPRING_MAIL_HOST=<host>
SPRING_MAIL_PORT=<port>
SPRING_MAIL_USERNAME=<user>
SPRING_MAIL_PASSWORD=<pass>

# JSearch (RapidAPI)
APP_INGEST_JSEARCH_ENABLED=true
APP_INGEST_JSEARCH_RAPIDAPI_KEY=<key>      # ⚠ NEEDS ROTATION
APP_INGEST_JSEARCH_COUNTRY=ae
APP_INGEST_JSEARCH_PAGES=1
APP_INGEST_JSEARCH_DATE_POSTED=3days
APP_INGEST_JSEARCH_SITE_RESTRICT=          # e.g. linkedin.com,bayt.com,gulftalent.com

# JSearch keyword tiers
APP_INGEST_JSEARCH_DELAY_MS=1700
APP_INGEST_JSEARCH_TIER1_KEYWORDS=2
APP_INGEST_JSEARCH_TIER2_KEYWORDS=1
APP_INGEST_JSEARCH_TIER3_KEYWORDS=0
APP_INGEST_JSEARCH_TIER4_KEYWORDS=0

# Scraper trigger server
APP_SCRAPER_TRIGGER_URL=http://localhost:3001
APP_SCRAPER_TRIGGER_SECRET=uaeit_trigger_2026

# Publisher allowlist (empty = accept all)
APP_INGEST_PUBLISHER_ALLOWLIST=

# Admin bootstrap
APP_ADMIN_EMAIL=<admin email>
APP_ADMIN_PASSWORD=<admin pass>
```

## Scraper (`/opt/apps/uaeitjobs-web-app/scraper/.env`)

```env
# Backend API
BACKEND_URL=https://www.uaeitjobs.com
ADMIN_EMAIL=<admin email>
ADMIN_PASSWORD=<admin password>

# LinkedIn account (dedicated scraper account)
LI_EMAIL=<linkedin email>
LI_PASSWORD=<linkedin password>

# Gmail (App Password — not main password)
GMAIL_USER=shaalucbe@gmail.com
GMAIL_APP_PASSWORD=<16-char app password>

# Trigger server
TRIGGER_PORT=3001
TRIGGER_SECRET=uaeit_trigger_2026

# Proxy (optional — comma-separated http://user:pass@host:port)
PROXIES=

# Scraper behaviour
MAX_PAGES=3
LI_MAX_DETAIL=50
HEADED=false
```

## Adding a new env var
1. Add to VPS `.env` directly (SSH in and `nano /opt/apps/uaeitjobs/.env`)
2. Redeploy backend if it's a backend var
3. Restart `scraper-trigger` if it's a scraper var: `pm2 restart scraper-trigger`
4. Update this file and `ENVIRONMENT_VARIABLES.md`
