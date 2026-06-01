# New Session Prompt Template

Use this when starting a new Claude session on UAEITJobs to get full context fast.

---

## Paste this at session start:

```
I'm continuing development on UAEITJobs. Please read these files in order to get full context:

1. C:\Users\inbox\uaeitjobs\uaeitjobs-fe\.claude\memory\00_bootstrap\SESSION_BOOTSTRAP.md
2. C:\Users\inbox\uaeitjobs\uaeitjobs-fe\.claude\memory\01_core\CURRENT_STATE.md
3. C:\Users\inbox\uaeitjobs\uaeitjobs-fe\.claude\memory\01_core\NON_NEGOTIABLES.md
4. C:\Users\inbox\uaeitjobs\uaeitjobs-fe\.claude\memory\01_core\ARCHITECTURE.md

For scraper work also read:
5. C:\Users\inbox\uaeitjobs\uaeitjobs-fe\.claude\memory\04_scraper\SCRAPER_CONTEXT.md

For backend work also read:
6. C:\Users\inbox\uaeitjobs\uaeitjobs-fe\.claude\memory\02_backend\BACKEND_OVERVIEW.md

Confirm once read, then I'll tell you what we're working on today.
```

---

## Quick-task prompt (skip full read)

```
UAEITJobs project. Backend: C:\Users\inbox\uaeitjobs\uaeitjobs-be (Spring Boot, Java 17).
Frontend+Scraper: C:\Users\inbox\uaeitjobs\uaeitjobs-fe (React/TS + Node scraper at scraper/).
VPS: root@82.25.110.205 key ~/.ssh/new-vps-key. DB: uaeitjobs_db on qten-db container.
Never enter passwords in chat. mvn clean compile -q before backend commits.
Today's task: [DESCRIBE TASK HERE]
```
