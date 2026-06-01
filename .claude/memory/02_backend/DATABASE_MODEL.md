# Database Model

DB: `uaeitjobs_db` on `qten-db` container · Migrations: Flyway V1-V3

## Key entities

### `jobs`
| Column | Type | Notes |
|--------|------|-------|
| id | BIGSERIAL PK | |
| slug | VARCHAR UNIQUE | SEO URL key |
| title | VARCHAR | display title (normalized) |
| raw_title | VARCHAR | original scraped title |
| normalized_title | VARCHAR | for dedup |
| company_name | VARCHAR | display |
| normalized_company_name | VARCHAR | for dedup |
| description | TEXT | plain text |
| description_sections | JSONB | `[{heading, items[]}]` |
| description_html | TEXT | sanitised HTML for UI |
| requirements | TEXT | |
| location_uae | VARCHAR | free text e.g. "Dubai, AE" |
| city | VARCHAR | normalized city |
| emirate | VARCHAR | lowercase enum: dubai, abu_dhabi, sharjah… |
| country | VARCHAR | "AE" |
| salary_min / salary_max | INTEGER | |
| salary_currency | VARCHAR | "AED" default |
| job_type | VARCHAR | full_time/part_time/contract/internship |
| experience_level | VARCHAR | |
| seniority | VARCHAR | junior/mid/senior/lead/architect |
| work_mode | VARCHAR | onsite/hybrid/remote |
| job_category | VARCHAR | from JobCategoryClassifier |
| skills | JSONB | array of skill strings |
| source | VARCHAR | jsearch/adzuna/bayt/linkedin… |
| external_source | VARCHAR | same as source |
| external_job_id | VARCHAR | source-stable ID |
| dedup_hash | VARCHAR | md5 of company+title+city |
| relevance_score | INTEGER | 0-100 |
| relevance_reasons | JSONB | scoring breakdown |
| apply_url | TEXT | |
| linkedin_url | TEXT | |
| publisher | VARCHAR | e.g. "Bayt", "LinkedIn" |
| company_domain | VARCHAR | for logo resolution |
| company_logo_url | TEXT | |
| remote_uae | BOOLEAN | |
| featured | BOOLEAN | |
| active | BOOLEAN | |
| immediate_joiner | BOOLEAN | |
| visa_type | VARCHAR | |
| view_count | BIGINT | |
| duplicate_source_count | INTEGER | L2/L3 dedup merge count |
| posted_at | TIMESTAMPTZ | original post date |
| expires_at | TIMESTAMPTZ | default +30 days |
| last_seen_at | TIMESTAMPTZ | updated on each ingest pass |
| created_at / updated_at | TIMESTAMPTZ | |
| posted_by | FK users.id | null for scraped jobs |

### `users`
email, password_hash, user_type (ADMIN/HR/JOB_SEEKER), verified, last_login, avatar_url, display_name, phone, country, created_at, updated_at

### `login_attempts`
user_id (nullable), email, ip_address, success, failure_reason, created_at

### `applications`
id, job_id, user_id, status (APPLIED/REVIEWED/SHORTLISTED/REJECTED), created_at, updated_at

### `saved_jobs`
user_id, job_id, created_at

### `ingest_run_log`
id, source, keyword, started_at, finished_at, fetched, inserted, rejected_hard, rejected_score, duplicates_l1, duplicates_l2, duplicates_l3, error

### `keyword_search_strategies`
keyword, tier (1-4), total_runs, total_returned, total_inserted, total_duplicates, last_run_at, last_error

### `email_verification_tokens`
token, user_id, expires_at, used

### `refresh_tokens`
token, user_id, expires_at, revoked

### `hr_profiles`
user_id, company_name, company_size, industry, website, description

### `hr_subscriptions`
user_id, tier, started_at, expires_at

## Emirate enum values (stored as-is in DB)
`dubai`, `abu_dhabi`, `sharjah`, `ajman`, `ras_al_khaimah`, `fujairah`, `umm_al_quwain`

## JobDTO field count
`JobResponse` has **31 fields** — `JobDTOTest` asserts this. Update test when adding fields.
