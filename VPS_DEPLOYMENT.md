# UAEITJOBS VPS Deployment

Target server:

- Ubuntu VPS with Docker installed
- Active stack directory: `/opt/qten`
- Compose command: `docker compose`
- Shared PostgreSQL service/container: `db` / `qten-db-1`
- Shared Nginx and Certbot from the existing qten stack

## 1. Clone Repositories

From `/opt/qten`:

```bash
git clone https://github.com/Udayakumarg/uaeitjobs-services.git
git clone https://github.com/Udayakumarg/uaeitjobs-web-app.git
```

If you prefer different folder names, keep the compose `build.context` paths in sync.

## 2. Create Database

Always connect to the `postgres` database when creating app databases/users.

```bash
docker exec -it qten-db-1 psql -U qten -d postgres -c "CREATE DATABASE uaeitjobs_db;"
docker exec -it qten-db-1 psql -U qten -d postgres -c "CREATE USER uaeitjobs_user WITH PASSWORD 'strongpassword';"
docker exec -it qten-db-1 psql -U qten -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE uaeitjobs_db TO uaeitjobs_user;"
docker exec -it qten-db-1 psql -U qten -d postgres -c "ALTER DATABASE uaeitjobs_db OWNER TO uaeitjobs_user;"
```

## 3. Add Environment Variables

Edit `/opt/qten/.env`:

```bash
UAEITJOBS_DB_PASSWORD=strongpassword
UAEITJOBS_JWT_SECRET=replace-with-at-least-64-random-characters
UAEITJOBS_SENDGRID_API_KEY=SG.xxxxx
```

## 4. Add Docker Compose Services

Add to `/opt/qten/docker-compose.yml`.

```yaml
# ── uaeitjobs.com ─────────────────────────────────────────────────────────────
uaeitjobs-backend:
  build:
    context: ./uaeitjobs-services
  restart: unless-stopped
  environment:
    DB_URL: jdbc:postgresql://db:5432/uaeitjobs_db
    DB_USERNAME: uaeitjobs_user
    DB_PASSWORD: ${UAEITJOBS_DB_PASSWORD}
    JWT_SECRET: ${UAEITJOBS_JWT_SECRET}
    SENDGRID_API_KEY: ${UAEITJOBS_SENDGRID_API_KEY}
    APP_FRONTEND_URL: https://uaeitjobs.com
    FRONTEND_DOMAIN: https://uaeitjobs.com
    EMAIL_VERIFICATION_URL: https://uaeitjobs.com/verify-email
    SPRING_PROFILES_ACTIVE: prod
    SERVER_PORT: 8080
  depends_on:
    db:
      condition: service_healthy
  healthcheck:
    test: ["CMD-SHELL", "wget -qO- http://localhost:8080/actuator/health || exit 1"]
    interval: 30s
    timeout: 10s
    retries: 5
    start_period: 60s
  networks:
    - internal

uaeitjobs-frontend:
  build:
    context: ./uaeitjobs-web-app
    args:
      VITE_API_URL: https://uaeitjobs.com
  restart: unless-stopped
  networks:
    - internal
```

Notes:

- Do not use `DATABASE_URL` for this Spring Boot app; it expects `DB_URL`.
- Do not use `DATABASE_USER`; it expects `DB_USERNAME`.
- Internal Docker ports do not conflict across containers, so the backend can stay on `8080`.
- The frontend Vite API URL is baked at image build time. Rebuild the frontend image if `VITE_API_URL` changes.

## 5. Add Nginx HTTP Block

Add this to the shared Nginx config before issuing the certificate:

```nginx
# ── uaeitjobs.com ─────────────────────────────────────────────────────────────
server {
    listen 80;
    server_name uaeitjobs.com www.uaeitjobs.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location /api/ {
        proxy_pass http://uaeitjobs-backend:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /actuator/health {
        proxy_pass http://uaeitjobs-backend:8080/actuator/health;
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://uaeitjobs-frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Reload Nginx:

```bash
cd /opt/qten
docker compose exec nginx nginx -s reload
```

If your service is named differently in compose, use that name instead of `nginx`.

## 6. Issue SSL Certificate

```bash
cd /opt/qten
docker compose run --rm certbot certonly --webroot \
  -w /var/www/certbot \
  -d uaeitjobs.com -d www.uaeitjobs.com
```

Then add the HTTPS server block using the generated certificate paths and reload Nginx.

## 7. Deploy

```bash
cd /opt/qten
docker compose up -d --build --no-deps uaeitjobs-backend uaeitjobs-frontend
docker compose ps uaeitjobs-backend uaeitjobs-frontend
docker compose logs -f uaeitjobs-backend
```

Smoke checks:

```bash
curl -I https://uaeitjobs.com
curl https://uaeitjobs.com/actuator/health
curl https://uaeitjobs.com/api/v1/jobs
```

## Common Mistakes

- Use `docker compose`, not `docker-compose`.
- Use `psql -U qten -d postgres` for admin database commands.
- Use backend health URL `/actuator/health`, not `/api/v1/actuator/health`.
- Use `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` for the backend.
- Rebuild the frontend when changing `VITE_API_URL`.
