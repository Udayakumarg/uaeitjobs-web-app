# Admin Dashboard

## Activity page (`src/pages/Admin/Activity/`)

### Files
- `index.tsx` — page shell, data fetching, 60s refresh, section layout
- `LoginHealthSummary.tsx` — 4 metric cards (attempts, successes, failures, success rate)
- `LoginFailureBreakdown.tsx` — horizontal bar chart by failure reason (only shown when failures > 0)
- `FrictionSignals.tsx` — table with action buttons

### Layout (4 sections with SectionLabel)
1. **User base**: 5 hero stat cards + `EngagementStrip` (single card with 5 mini-stats)
2. **Login health — today**: LoginHealthSummary + LoginFailureBreakdown
3. **Friction signals**: FrictionSignals table (amber count badge on section header)
4. **User lists**: recent signups + flagged users

### EngagementStrip
Replaces what was 5 separate stat cards (active today/7d/30d, new 7d/30d). Single card with 5 columns — condensed to reduce card count from 10 → 6.

### 60s auto-refresh
- Countdown chip shows seconds remaining
- Spinner visible during fetch
- `useEffect` with `setInterval(load, 60_000)`

### Color thresholds
- Success rate: green ≥80%, amber ≥60%, red below
- Failure rate: green <20%, amber <40%, red above

### Action buttons (FrictionSignals)
```typescript
case 'RESEND_VERIFICATION': adminApi.resendVerification(signal.userId)
case 'RESET_PASSWORD':      authApi.forgotPassword(signal.email)
case 'SEND_WELCOME':        adminApi.sendWelcome(signal.userId)
```

---

## Ingest Monitor (`src/pages/Admin/IngestDashboard.tsx`)

### Layout
1. **Header**: title + Refresh button (Run Now moved to ManualTriggerPanel)
2. **ManualTriggerPanel**: Playwright scraper buttons + API source run button
3. **Summary cards**: 4 stat cards (fetched, saved, dupes, rejected)
4. **Pipeline efficiency bar**: stacked bar (saved/dupes/rejected)
5. **Playwright Scrapers**: 3 health cards (bayt/naukrigulf/gulftalent)
6. **Tabs**: Recent Runs | API Keywords

### ManualTriggerPanel
- **Playwright section**: 4 buttons (LinkedIn/Bayt/NaukriGulf/GulfTalent)
  - Shows "server online" / "trigger server offline" status
  - Button shows "running…" (pulsing amber) while active
  - Calls `adminApi.triggerScraper(source)` → backend → trigger server
  - 409 = already running → info toast
- **API section**: source badges + "Run all API sources" button (calls `adminApi.runIngest()`)

### Playwright Scrapers health cards (bayt/naukrigulf/gulftalent)
- `computeSourceHealth(runs, source)` — derives from IngestRunLog
- Shows: last run time-ago, status (OK/Error/Running/Never ran), saved today, fetched today, insert rate mini-bar
- `timeAgo(dateStr)` — "just now" / "5m ago" / "2h ago" / "3d ago"

### Source badge colors
```
jsearch=violet  adzuna=sky   remoteok=emerald  himalayas=amber
bayt=rose  naukrigulf=orange  gulftalent=teal
```
(LinkedIn = blue, only in ManualTriggerPanel buttons, not in SOURCE_COLORS map)

### 8s auto-refresh
`setInterval(load, 8000)` — faster than Activity page because ingest runs show up quickly

### API Keywords tab
Shows JSearch keyword performance only (source !== 'jsearch' filtered out). Tab renamed from "Keyword Performance" to "API Keywords".
