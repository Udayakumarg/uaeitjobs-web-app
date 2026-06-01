# Frontend File Ownership

## Single source of truth files — never duplicate
| File | What it owns | Rule |
|------|-------------|------|
| `src/services/api.ts` | ALL API calls | Never define API calls inline in components |
| `src/types/index.ts` | ALL TypeScript interfaces | Never define types in component files |
| `src/components/ui/` | ALL UI primitives | Never use raw `<button>`, `<input>`, `<select>` directly |

## Page ownership
| File | Owns |
|------|------|
| `src/pages/Admin/Activity/index.tsx` | Activity page shell, data fetch, layout, EngagementStrip, SectionLabel, 60s refresh |
| `src/pages/Admin/Activity/LoginHealthSummary.tsx` | 4 login health metric cards |
| `src/pages/Admin/Activity/LoginFailureBreakdown.tsx` | Horizontal bar chart by failure reason |
| `src/pages/Admin/Activity/FrictionSignals.tsx` | Friction signals table + action buttons |
| `src/pages/Admin/IngestDashboard.tsx` | Ingest monitor, ManualTriggerPanel, Playwright health cards, run log table |
| `src/pages/HR/LinkedInImport.tsx` | ALL URL imports (LinkedIn AND generic) — routes via importPreview |
| `src/App.tsx` | React Router setup, lazy imports, auth guards |

## Types that must stay in sync with backend DTOs
| Frontend type | Backend DTO | Risk on mismatch |
|--------------|-------------|-----------------|
| `UserActivityStats` | `AdminDTO.UserActivityResponse` | Activity page shows wrong data |
| `LoginHealthToday` | `AdminDTO.LoginHealthToday` | Login health cards break |
| `FrictionSignal` | `AdminDTO.FrictionSignal` | Friction signals table breaks |
| `IngestRunLog` | Entity fields via status endpoint | Run log table breaks |
| `Job` | `JobDTO.JobResponse` (31 fields) | Job cards/detail breaks |

## Critical: Activity page import path
```typescript
// App.tsx — must be folder import, not file import
const AdminActivity = lazy(() => import('./pages/Admin/Activity'))
// NOT: import('./pages/Admin/AdminActivity')
```
