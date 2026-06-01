# TODO

## Immediate
- [ ] Rotate JSearch RapidAPI key (security — was exposed in conversation)
- [ ] Wire `puppeteer-extra-plugin-recaptcha` into LinkedIn login flow
- [ ] Set up `pm2 startup` on VPS so trigger server survives reboots
- [ ] Schedule VPS system restart (pending since Jun 2026)

## LinkedIn scraper
- [ ] Add residential proxy (Bright Data / Smartproxy / Oxylabs) to `PROXIES` env var
- [ ] Handle 999 status gracefully (retry with backoff instead of crash)
- [ ] Cookie refresh: detect when cookies are >7 days old and force re-login proactively

## Ingest
- [ ] Add `site:linkedin.com,bayt.com` to `APP_INGEST_JSEARCH_SITE_RESTRICT` to pull LinkedIn jobs via JSearch API (more reliable than direct scraping)
- [ ] Make Bayt location selector more specific (`.t-mute` is too generic — may match dates)
- [ ] GulfTalent: switch from positional `p.eq(n)` to data attributes or structured selectors

## Backend
- [ ] Add `avatarUrl` to JobResponse (currently 31 fields — test must update too)
- [ ] Consider adding webhook endpoint so scraper can push completion events to backend in real-time

## Frontend
- [ ] Ingest Dashboard: add LinkedIn to the Playwright Scrapers section health cards (currently only bayt/naukrigulf/gulftalent shown)

## Ops
- [ ] Set up monitoring alerts for scraper trigger server going offline
- [ ] Add cron job for regular scraper runs (currently manual trigger only for Playwright sources)
