# Frontend Overview

**Stack**: React 18, TypeScript, Vite, Tailwind CSS, React Router v6, Lucide icons, Axios  
**Repo**: `github.com/Udayakumarg/uaeitjobs-web-app` · **Local**: `C:\Users\inbox\uaeitjobs\uaeitjobs-fe`

## src/ structure
```
src/
  App.tsx                     — router, lazy-loaded pages, auth guards
  main.tsx                    — entry point
  pages/
    Jobs/                     — public browse + detail
    Dashboard/                — job seeker portal
    HR/
      LinkedInImport.tsx      — URL/LinkedIn import (ALL URL imports go here)
      JobForm.tsx
      HRDashboard.tsx
    Admin/
      Activity/
        index.tsx             — shell + 60s refresh + EngagementStrip
        LoginHealthSummary.tsx
        LoginFailureBreakdown.tsx
        FrictionSignals.tsx
      IngestDashboard.tsx     — ManualTriggerPanel + Playwright health cards + run log
      AdminUsers.tsx
      AdminJobs.tsx
    Auth/                     — login, register, verify, reset
  components/
    ui/                       — Button, Card, Field, Input, Select, Textarea, Badge
    Toast.tsx                 — useToastStore (Zustand)
    Header.tsx
    Footer.tsx
  services/
    api.ts                    — ALL API calls: authApi, jobApi, hrApi, adminApi
  types/
    index.ts                  — ALL shared TypeScript types
  hooks/                      — useAuth, useSavedJobs, etc.
```

## Key patterns

### API calls — always through api.ts
```typescript
import { adminApi, hrApi, authApi, jobApi, errorMessage } from '../services/api'
const { data } = await adminApi.frictionSignals()
```

### Toast notifications
```typescript
const { add: toast } = useToastStore()
toast({ type: 'success'|'error'|'info', title: '...', message: '...' })
```

### Lazy loading
All admin/hr/dashboard pages are `React.lazy()` in `App.tsx`. When moving a page to a new path, update the lazy import in App.tsx.

### Auth guards
Routes check auth state from `useAuth()` hook. Admin routes check `user.userType === 'admin'`.

## All API calls defined in
`src/services/api.ts` — one file for all. Adding a new endpoint = add it here.

## All TypeScript types defined in
`src/types/index.ts` — one file for all. Never define types inline in components.
