# UAEITJOBS Web App

React 18 + Vite + TypeScript frontend for the UAEITJOBS job marketplace.

## Stack

- React 18 with Vite
- TypeScript
- Tailwind CSS
- React Router v6
- Zustand auth store
- Axios with JWT and refresh-token interceptors
- React Hook Form + Zod

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Set the backend URL in `.env`:

```bash
VITE_API_URL=http://localhost:8080
```

Production example:

```bash
VITE_API_URL=https://api.uaeitjobs.com
```

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Feature Coverage

- Public landing page, job browse, search/filter, and job detail
- Login, registration, email verification, logout, persisted JWT session
- Job seeker dashboard, profile/CV upload, applications, and saved jobs
- HR dashboard, job posting/editing, LinkedIn import, applicant management
- Protected routes by role, API error handling, loading states, empty states, toasts

## Deployment

Build output is generated in `dist/`.

```bash
npm run build
```

For Vercel, configure `VITE_API_URL` in the project environment variables and deploy the repository connected to the main branch. The included `vercel.json` routes all app paths back to `index.html`, so deep links like `/jobs/12` and `/hr` work after refresh.

## Pull Request Validation

GitHub Actions runs on pushes and pull requests:

```bash
npm ci
npm run lint
npm run build
```
