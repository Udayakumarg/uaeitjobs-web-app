# UAEITJOBS Frontend MVP

## Summary

- Scaffolded React 18 + Vite + TypeScript frontend for UAEITJOBS.
- Added public landing, job browse/search/filter, and job detail pages.
- Added auth flows for register, login, email verification, persisted JWT sessions, and role-based protected routes.
- Added job seeker dashboard for profile/CV upload, applications, and saved jobs.
- Added HR dashboard for posting/editing jobs, LinkedIn import, and applicant status management.
- Added Axios API client with bearer-token injection and refresh-token retry handling.
- Added Vercel SPA routing config and GitHub Actions CI for lint/build validation.

## Validation

```bash
npm run lint
npm run build
```

Both commands pass locally.

## Manual Checks

- Opened the local app at `http://127.0.0.1:5173`.
- Verified landing, jobs, and login routes render.
- Job/API pages show loading and error states when the backend is unavailable.

## Environment

Create `.env` from `.env.example`:

```bash
VITE_API_URL=http://localhost:8080
```

For production, set `VITE_API_URL=https://api.uaeitjobs.com` in Vercel.
