# Admin Services

## AdminService.userActivity() → UserActivityResponse

Aggregates:
- Total users (all types)
- Total job seekers, total HR, total verified
- Active today (lastLogin today)
- Active 7/30 days, new 7/30 days

Plus `LoginHealthToday`:
```java
OffsetDateTime todayMidnight = now.toLocalDate().atStartOfDay().atOffset(ZoneOffset.UTC);
long attempts  = loginAttemptRepository.countByCreatedAtAfter(todayMidnight);
long successes = loginAttemptRepository.countBySuccessAndCreatedAtAfter(true, todayMidnight);
long failures  = loginAttemptRepository.countBySuccessAndCreatedAtAfter(false, todayMidnight);
double successRate = attempts == 0 ? 0.0 : Math.round((double)successes/attempts*100*10)/10.0;
// failureBreakdown: query List<Object[]> grouped by failure_reason → Map<String,Long>
```

## AdminService.frictionSignals() → List<FrictionSignal>

Signal types (checked in order):
1. `REPEATED_FAILURES` (HIGH) — users with ≥3 failed login attempts in last 24h
   - Query: `usersWithRepeatedFailuresSince(oneDayAgo, 3L)`
2. `EMPLOYER_INACTIVE` (MEDIUM) — HR accounts, verified, never logged in, created >3 days ago
   - Query: `findByVerifiedTrueAndLastLoginIsNullAndCreatedAtBefore(threeDaysAgo)` where userType=HR
3. `VERIFIED_NEVER_LOGIN` (LOW) — job seekers, verified, never logged in, created >3 days ago
   - Same query, userType=JOB_SEEKER
4. `STUCK_PENDING_LONG` (LOW) — unverified accounts created >2 days ago
   - Query: `findByVerifiedFalseAndCreatedAtBefore(twoDaysAgo)`

Sorted: HIGH → MEDIUM → LOW, then by `daysSinceCreated` descending within each severity.

Each signal includes: userId, email, userType, signalType, severity, message, daysSinceCreated, failedLoginAttempts24h, suggestedAction (RESEND_VERIFICATION / RESET_PASSWORD / SEND_WELCOME)

## AdminService.sendWelcome(userId)
```java
@Transactional
public void sendWelcome(Long userId) {
  User user = userRepository.findById(userId).orElseThrow(...);
  String name = user.getDisplayName() != null ? user.getDisplayName() : user.getEmail();
  emailService.sendWelcomeEmail(user.getEmail(), user.getUserType(), name);
}
```

## PlaywrightTriggerService
Calls Node.js trigger server at `APP_SCRAPER_TRIGGER_URL` (default `http://localhost:3001`):
- `trigger(source)` → POST `/trigger/{source}` with `X-Trigger-Secret` header
  - Returns `TriggerResult(STARTED | ALREADY_RUNNING | UNAVAILABLE, message)`
- `status()` → GET `/status` → `Map<String, String>` (source → "idle"|"running")
  - Returns empty map if trigger server unreachable

## AdminController endpoints (summary)
- `POST /admin/scraper/trigger/{source}` → `{ status, message, source }`
- `GET /admin/scraper/status` → `{ serverReachable: bool, sources: {bayt: "idle", ...} }`
- `GET /admin/users/activity` → `UserActivityResponse`
- `GET /admin/users/friction-signals` → `FrictionSignal[]`
- `POST /admin/users/{id}/send-welcome` → 204
- `POST /admin/ingest/external` → `{ source, fetched, inserted, duplicates, rejected }`
