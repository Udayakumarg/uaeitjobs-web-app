---
name: non-negotiables
description: "Hard rules that must never be broken — security, credentials, deployment safety"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 6dbfd671-d5b7-4590-95f5-28c17451db19
---

# UAEITJobs — Non-Negotiables

## Credentials — NEVER in chat
- Never ask user to paste passwords, API keys, or tokens into the conversation
- Never enter passwords into any form or file via tool calls
- Guide users to type credentials directly in their own terminal
- If a credential appears in chat by accident: immediately flag it, tell user to change it, do not use it

## VPS SSH — always use key
```bash
ssh -i ~/.ssh/new-vps-key root@82.25.110.205
```
Never attempt password auth. Never change SSH config.

## Backend redeploy — exact sequence
```bash
cd /opt/apps/uaeitjobs && \
docker compose pull uaeitjobs-backend && \
docker stop uaeitjobs-backend && \
docker rm uaeitjobs-backend && \
docker compose up -d --no-deps uaeitjobs-backend
```
Never use `docker compose down` (stops ALL services including DB). Never force-push to main.

## Git — never destructive on main
- No `git push --force` to main
- No `git reset --hard` without explicit user instruction
- Always commit with `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
- Never `--no-verify` hooks unless user explicitly requests

## Code changes — no scope creep
- Bug fix → fix only the bug, no cleanup
- Feature → only what was asked, no extra abstractions
- No comments explaining WHAT the code does (names do that)
- Only add comments for non-obvious WHY (hidden constraints, workarounds)
- No error handling for impossible scenarios

## Scraper — never use playwright-stealth
`playwright-stealth` on npm is a stub at 0.0.1. Always use:
- `playwright-extra` + `puppeteer-extra-plugin-stealth`

## Backend compile check before commit
Always run `mvn clean compile -q` before committing backend changes. No output = success.

## Frontend TypeScript check before commit
Always run `npx tsc --noEmit` in `uaeitjobs-fe/scraper` before committing scraper changes.

## DB — never drop tables
Never run `DROP TABLE`, `TRUNCATE`, or destructive Flyway migrations without explicit instruction. Schema changes go through versioned migration files only.

## Docker — backend only
The Playwright scraper must NOT be containerised. It runs on the host via pm2. This is intentional — see DECISIONS.md.

## Responses — terse and direct
- One sentence update per tool call group
- No trailing summaries ("Here's what I did...")
- No emoji unless user requests
- Short answers for simple questions — no headers/sections for conversational replies
