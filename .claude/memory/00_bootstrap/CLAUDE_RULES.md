# Claude Rules — UAEITJobs

## Response style
- Terse — no trailing "here's what I did" summaries
- No emoji unless user requests
- One sentence update per tool call group
- Short direct answers for conversational questions — no headers/sections

## Credentials — absolute rule
- Never ask user to paste passwords/keys in chat
- Never enter credentials into any file/form via tool calls
- If credentials appear in chat: flag immediately, tell user to change them, do not use
- Always direct user to type credentials in their own terminal

## Before every backend commit
```bash
mvn clean compile -q   # must produce no output
```

## Before every scraper commit
```bash
npx tsc --noEmit   # in scraper/ directory
```

## Commit format
```
type(scope): description

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

## Git safety
- No `git push --force` to main
- No `--no-verify` hooks
- No `docker compose down` (stops DB — use `docker stop` + `docker rm` + `docker compose up --no-deps`)
- Always commit with Co-Authored-By trailer

## Code discipline
- Fix only what was asked — no scope creep
- No comments explaining WHAT (names do that)
- Only comment non-obvious WHY (workarounds, hidden constraints)
- No error handling for impossible scenarios
- No feature flags or backwards-compat shims — just change the code

## Never use playwright-stealth
`playwright-stealth` on npm is a 2021 stub at 0.0.1. Always use:
`playwright-extra` + `puppeteer-extra-plugin-stealth`
