# Authentication

## JWT flow
- Login → returns `accessToken` (short-lived) + `refreshToken` (may be null in some paths — frontend handles null)
- `JwtAuthenticationFilter` reads Bearer token, sets SecurityContext
- `POST /auth/refresh` exchanges refresh token for new access token
- `POST /auth/logout` revokes refresh token

## Email verification
- Register → sends verification email with token link
- `GET /auth/verify-email?token=` marks user as `verified=true`
- Login blocked until `verified=true` — returns 401 if unverified
- `POST /auth/resend-verification` re-sends the email

## Rate limiting
- `RateLimitingInterceptor` applied to auth endpoints
- **10 requests/minute per IP** (updated from 5)
- Error response: `{ "error": "Rate limit exceeded. Please try again shortly." }`
- Tests assert exactly this string and loop count of 10

## Login attempt logging
```java
// In AuthService — CRITICAL: must use REQUIRES_NEW
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void logAttempt(String email, String ip, boolean success, String reason) { ... }
```
Why REQUIRES_NEW: failed login rolls back outer tx. Without it, the attempt record is never written, breaking friction signals and rate limiting analytics.

## Password reset
- `POST /auth/forgot-password` sends email with reset token
- `POST /auth/reset-password?token=` validates token, updates password

## Security config
- `SecurityConfig` defines which paths are public vs protected
- Role hierarchy: ADMIN > HR > JOB_SEEKER
- `CustomUserDetailsService` loads user by email
- `JwtAuthenticationEntryPoint` returns 401 for missing/invalid tokens
- `CustomAccessDeniedHandler` returns 403 for insufficient roles

## SSRF protection (URL import)
`UrlJobScraperService.validateNoSsrf()` and `LinkedInScraperService.validateNoSsrf()`:
- Only HTTPS URLs accepted
- Loopback, site-local, link-local, multicast addresses rejected
- LinkedIn scraper additionally only allows `linkedin.com` and `www.linkedin.com`
