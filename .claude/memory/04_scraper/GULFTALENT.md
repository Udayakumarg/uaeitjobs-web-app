# GulfTalent

`scrapers/gulftalent.ts` — plain `axios` + `cheerio`, no headless browser. GulfTalent
serves real SSR HTML to regular HTTP clients; this is the only Playwright-source
that doesn't need a browser.

## Anti-bot posture

**Not** a Cloudflare/WAF block the way Bayt is. Isolated by testing one header at a
time (2026-08): a Chrome-spoofing `User-Agent` triggers a 403 by itself, regardless
of any other header. Dropping the UA override entirely (an honest non-browser
identity) passes — 302 to a `/mobile/` path, then 200. The WAF here specifically
flags "browser UA arriving over a simple HTTP client" as the suspicious pattern,
not "non-browser client" itself. `http` client in the file has no UA override — on
purpose, not an oversight.

The `/mobile/` redirect also changed the card markup (title/company/location/date
moved to different classes, no heading tags) — that independently explained why an
older version of this scraper found nothing even on runs that got past the 403.

## Search

12 title slugs (`SEARCH_SLUGS`) against `/uae/jobs/title/{slug}` (page 1) and
`/uae/jobs/title/{slug}/{pageNum}` (page 2+), up to `MAX_PAGES` (default 3) each.
Slugs were re-verified against GulfTalent's live taxonomy 2026-08 — several
original slugs (`devops-engineer`, `data-engineer`, `frontend-developer`,
`cybersecurity`) now 404; replaced with the slugs the site currently serves for
the same specialisms.

Card selector: `a[href*="/uae/jobs/"]` matching `/uae/jobs/[a-z].*-\d+` (must end
in a numeric ID). Job ID comes from `data-ga-label` on the anchor, falling back to
parsing the trailing digits out of the href.

## Description — fixed 2026-08

**Previous behavior**: never visited a job's own detail page. `description` was a
fabricated string: `"{title} at {company} in {location}"`. This was the single
biggest reason GulfTalent's average description length sat at 65 characters (96%
of active GulfTalent jobs were ≤100 chars).

**Current behavior**: after collecting a page's cards, fetches each *new* job's own
detail page (`applyUrl`, same plain-HTTP no-UA-override technique as the search
page — verified live 2026-08 that the detail page is NOT blocked, real 200 with a
rich `.job-description` block covering role details, responsibilities,
requirements, and position details). Extracted via the shared `blockHtmlToText()`
util (`utils/html.ts`), which preserves heading/paragraph boundaries as newlines
instead of squashing everything onto one line. Falls back to the old synthesized
placeholder if the detail fetch fails for any reason — a job is never dropped over
this.

One extra HTTP request per **new** (not duplicate) job found, with a 400ms delay
between them — dedup happens before the detail fetch, not after, so re-scraping
jobs already seen this run costs nothing extra.

## Known limitations

- `requirements` is not captured as a separate field — the detail page's
  "Requirements" section is present in the extracted text but folded into
  `description`, not split out. See SOURCES.md.
- Date parsing (`parseDate`) trusts `new Date(text)` on GulfTalent's plain-text
  date format ("9 Jun 2026") — no explicit format validation.
