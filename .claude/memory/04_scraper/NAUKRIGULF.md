# NaukriGulf

`scrapers/naukrigulf.ts` — Playwright, using the shared stealth-patched browser
page passed in from `index.ts` (same page instance other Playwright sources use
in the same run).

## Anti-bot posture

No block encountered on either the listing or detail page as of 2026-08, using the
project's standard stealth Playwright setup (playwright-extra + stealth plugin,
context-level fingerprint patches in `utils/stealth.ts`). Verified live 2026-08
specifically for the detail-page fetch below — a plain `curl`/axios request to a
detail URL stalls indefinitely at the TLS layer (25s timeout, zero bytes), which
looks like a block but isn't representative: the real stealth-Playwright session
the scraper already uses gets a clean 200 on the same URL. Don't conclude
"blocked" from a non-browser HTTP client's failure on this site — verify with the
actual browser session before assuming.

## Search

10 title slugs (`SEARCH_SLUGS`) against `/{slug}-jobs` (page 1) / `/{slug}-jobs-
{pageNum}` (page 2+), up to `MAX_PAGES` (default 3) each. The `?q=` and `?page=N`
query params are both inert traps (verified 2026-08 — return the same generic
feed regardless of value); the `-{slug}-jobs` / `-{pageNum}` suffix is what
actually changes the result set.

Listing is a client-rendered SPA — bare `<div id="root">` at `domcontentloaded`,
so the scraper waits for `.srp-tuple` (the card class) directly rather than a
fixed delay, treating a 12s timeout as "no results" rather than a hard failure
(a genuinely empty result set produces the same wait outcome as a slow one).

Card fields: `.designation-title` (title), `a.info-position` (link/job ID via the
`-jid-NNNNNN` URL marker), `.info-org` (company), `.info-loc` (location), `.time`
(relative post date, e.g. "6 hrs ago" — parsed by `parseRelativeTime`).

## Description — fixed 2026-08

**Previous behavior**: extracted only the `.description` snippet shown on the
search-results card itself — a real excerpt, but short (avg 171 chars site-wide,
never the full posting).

**Current behavior**: after collecting a page's cards (extraction from live
`ElementHandle`s has to happen before navigating anywhere else — the handles go
stale once the page navigates), visits each *new* job's own detail page in a
second pass using the same shared `page`. Verified live 2026-08 that the detail
page has multiple `.job-description` elements (site splits "Roles &
Responsibilities" and "Desired Candidate Profile" into separate blocks with the
same class) — all of them are joined, not just the first. 1.2s jitter delay
between detail-page visits via the existing `delayWithJitter()` helper. Falls back
to the original card-level snippet, then the bare title, if the detail fetch
fails — a job is never dropped over this.

## Known limitations

- `requirements` is not captured as a separate field — "Desired Candidate
  Profile" ends up folded into `description`, not split out. See SOURCES.md.
- The detail-page pass roughly doubles this scraper's page-navigation count per
  run (one extra `page.goto()` per new job found). Not currently rate-limited
  beyond the existing jitter; revisit if NaukriGulf's posture changes.
