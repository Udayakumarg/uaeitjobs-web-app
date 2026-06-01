# Frontend Routes

## Public
| Path | Component | Description |
|------|-----------|-------------|
| `/` | Home / redirect | |
| `/jobs` | `Jobs/JobList` | Browse with filters |
| `/jobs/:slug` | `Jobs/JobDetail` | Job detail page |
| `/login` | `Auth/Login` | |
| `/register` | `Auth/Register` | |
| `/verify-email` | `Auth/VerifyEmail` | Token from email link |
| `/forgot-password` | `Auth/ForgotPassword` | |
| `/reset-password` | `Auth/ResetPassword` | Token from email link |

## Job seeker (requires auth + JOB_SEEKER role)
| Path | Component | Description |
|------|-----------|-------------|
| `/dashboard` | `Dashboard/Overview` | |
| `/dashboard/applications` | `Dashboard/Applications` | My applications |
| `/dashboard/saved` | `Dashboard/SavedJobs` | Saved jobs |
| `/dashboard/profile` | `Dashboard/Profile` | Edit profile |

## HR (requires auth + HR role)
| Path | Component | Description |
|------|-----------|-------------|
| `/hr` | `HR/HRDashboard` | My jobs overview |
| `/hr/jobs/new` | `HR/JobForm` | Create job |
| `/hr/jobs/:id/edit` | `HR/JobForm` | Edit job |
| `/hr/jobs/:id/applicants` | `HR/Applicants` | View applicants |
| `/hr/linkedin-import` | `HR/LinkedInImport` | URL/LinkedIn import (ALL URLs) |
| `/hr/subscription` | `HR/Subscription` | Manage plan |

## Admin (requires auth + ADMIN role)
| Path | Component | Description |
|------|-----------|-------------|
| `/admin` | `Admin/AdminDashboard` | Overview |
| `/admin/activity` | `Admin/Activity/index` | Login health + friction signals |
| `/admin/ingest` | `Admin/IngestDashboard` | Ingest monitor + manual trigger |
| `/admin/users` | `Admin/AdminUsers` | User management |
| `/admin/jobs` | `Admin/AdminJobs` | All jobs |

## Important note on LinkedInImport
`/hr/linkedin-import` handles ALL URL imports — not just LinkedIn. It detects the URL type and routes appropriately. The page title says "Import job from URL".

## App.tsx lazy imports (update when moving pages)
```typescript
const AdminActivity = lazy(() => import('./pages/Admin/Activity'))    // Note: Activity/ folder, not AdminActivity.tsx
const IngestDashboard = lazy(() => import('./pages/Admin/IngestDashboard'))
```
