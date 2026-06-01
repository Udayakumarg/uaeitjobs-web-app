# API Map

Base: `/api/v1` · Auth: Bearer JWT in `Authorization` header

## Auth (`AuthController`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Register (sends verification email) |
| POST | `/auth/login` | — | Login (returns accessToken; email must be verified) |
| POST | `/auth/refresh` | — | Refresh access token |
| POST | `/auth/logout` | ✓ | Invalidate refresh token |
| GET | `/auth/verify-email?token=` | — | Verify email from link |
| POST | `/auth/resend-verification` | — | Resend verification email |
| POST | `/auth/forgot-password` | — | Send reset email |
| POST | `/auth/reset-password?token=` | — | Reset password |
| POST | `/user/change-password` | ✓ | Change password (authenticated) |

## Jobs (public, `JobController`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/jobs` | — | Browse jobs (filters: q, emirate, category, type, salary, remote, exp, page, size) |
| GET | `/jobs/:slug` | — | Job detail (apply URL masked for guests) |

## HR (`HRController`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/jobs` | HR | Create job |
| PATCH | `/jobs/:id` | HR | Update job |
| DELETE | `/jobs/:id` | HR | Delete job |
| GET | `/hr/jobs` | HR | List my jobs |
| GET | `/hr/jobs/:id/applicants` | HR | Applicants for job |
| PATCH | `/applications/:id` | HR | Update application status |
| POST | `/hr/jobs/import-preview` | HR | Preview URL/LinkedIn import |
| POST | `/linkedin-import` | HR | Import LinkedIn job (legacy, saves directly) |
| GET/POST | `/hr/profile` | HR | Get/upsert HR profile |
| GET | `/subscriptions/current` | HR | Current subscription |
| POST | `/subscriptions/upgrade` | HR | Upgrade subscription |

## Job seeker (`JobSeekerController`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/applications` | JS | Apply to job |
| GET | `/applications` | JS | My applications |
| GET | `/saved-jobs` | JS | Saved jobs |
| POST | `/saved-jobs/:jobId` | JS | Save job |
| DELETE | `/saved-jobs/:jobId` | JS | Unsave job |
| GET | `/user/profile` | ✓ | Get profile |
| PATCH | `/user/profile` | ✓ | Update profile (name, phone, country, avatarUrl) |

## Admin (`AdminController`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/stats` | ADMIN | Platform stats |
| GET | `/admin/users` | ADMIN | User list (search, page, size) |
| POST | `/admin/users` | ADMIN | Create user |
| DELETE | `/admin/users/:id` | ADMIN | Delete user |
| POST | `/admin/users/:id/resend-verification` | ADMIN | Resend verification |
| GET | `/admin/users/activity` | ADMIN | UserActivityResponse with LoginHealthToday |
| GET | `/admin/users/friction-signals` | ADMIN | List FrictionSignal |
| POST | `/admin/users/:id/send-welcome` | ADMIN | Send welcome email (204) |
| GET | `/admin/jobs` | ADMIN | All jobs (q, active filter) |
| PATCH | `/admin/jobs/:id/approve` | ADMIN | Set job active/inactive |
| POST | `/admin/ingest/external` | ADMIN | Receive Playwright scraper batch |
| POST | `/admin/ingest/run` | ADMIN | Trigger API ingest (async) |
| GET | `/admin/ingest/status?limit=100` | ADMIN | IngestStatus (recent runs + running flag) |
| POST | `/admin/scraper/trigger/:source` | ADMIN | Trigger Playwright scraper via trigger server |
| GET | `/admin/scraper/status` | ADMIN | Per-source idle/running status |
| POST | `/admin/purge-expired` | ADMIN | Purge expired jobs |
| POST | `/admin/seed-demo` | ADMIN | Seed demo jobs |

## SEO (`SeoController`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/sitemap.xml` | — | Sitemap |
| GET | `/robots.txt` | — | Robots |
