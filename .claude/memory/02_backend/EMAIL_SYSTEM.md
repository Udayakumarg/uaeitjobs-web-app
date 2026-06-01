# Email System

## EmailService methods
- `sendVerificationEmail(email, token)` — sent on register and resend-verification
- `sendPasswordResetEmail(email, token)` — sent on forgot-password
- `sendWelcomeEmail(email, userType, name)` — sent by AdminService.sendWelcome(); different template for HR vs JOB_SEEKER
- `sendAdminNotification(...)` — admin alerts

## Configuration
Email provider configured via Spring Mail properties in backend env.  
Admin email injected via constructor arg — check `AdminService` for exact field name.

## Email triggers
| Trigger | Email sent |
|---------|-----------|
| Register | Verification link |
| Resend verification (user or admin) | Verification link |
| Forgot password | Password reset link |
| Admin clicks "Send Welcome" on user | Welcome email (role-specific template) |
| Friction signal action: SEND_WELCOME | Same as above |

## Frontend wiring (FrictionSignals.tsx)
```typescript
case 'RESEND_VERIFICATION': await adminApi.resendVerification(signal.userId)
case 'RESET_PASSWORD':      await authApi.forgotPassword(signal.email)
case 'SEND_WELCOME':        await adminApi.sendWelcome(signal.userId)
```
