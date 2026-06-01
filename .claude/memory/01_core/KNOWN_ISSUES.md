# Known Issues (June 2026)

## Security
- **JSearch RapidAPI key** — exposed in conversation history. Rotate at RapidAPI dashboard. Key is in `APP_INGEST_JSEARCH_RAPIDAPI_KEY` on VPS backend .env.

## LinkedIn scraper
- Runs on datacenter IP (VPS) — LinkedIn blocks these intermittently with 999 errors
- No residential proxies configured (`PROXIES=` empty)
- `puppeteer-extra-plugin-recaptcha` installed in scraper but NOT wired into the flow
- Login sometimes requires force-fill (`{ force: true }`) due to LinkedIn's CSS animation timing
- Session cookies saved to `.linkedin-cookies.json` — if this file is deleted or cookies expire, next run triggers full re-login + Gmail OTP

## Scraper trigger server
- pm2 must be running for admin UI trigger buttons to work
- If pm2 crashes or VPS restarts without `pm2 startup`, trigger server goes offline
- Admin dashboard shows "trigger server offline" banner — check with `pm2 status` on VPS

## System
- VPS has a pending system restart (`*** System restart required ***`) — non-critical but should be done during a maintenance window

## Ingest
- NaukriGulf and Bayt CSS selectors may drift as sites update their DOM — location selectors are fragile (`.t-mute` on Bayt is very generic)
- GulfTalent positional `p` selectors (`ps.eq(0)` = company, `ps.eq(1)` = location) break if HTML structure changes
