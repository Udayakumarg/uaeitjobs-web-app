# Component Patterns & Styling

## UI components (`src/components/ui/`)
All UI primitives live here. Always use these — never raw HTML elements for interactive controls.

```typescript
import { Button, Card, Field, Input, Select, Textarea } from '../../components/ui'
```

- **Button**: `variant="primary"|"secondary"` · `size="sm"|"md"` · `disabled`
- **Card**: white rounded card with shadow — `className` for extras e.g. `p-4`, `overflow-hidden`
- **Field**: label wrapper — `<Field label="Email *"><Input .../></Field>`
- **Input**: text input · `value`, `onChange`, `placeholder`, `disabled`, `onKeyDown`
- **Select**: dropdown — always include `<option value="">— select —</option>` as first option
- **Textarea**: multiline text · `rows={n}`

## Tailwind conventions

### Spacing
- Page container: `mx-auto max-w-6xl px-4 py-8 space-y-6`
- Card padding: `p-4` or `p-5`
- Section gaps: `space-y-4` or `gap-4`

### Text sizes
- Page title: `text-2xl font-bold text-slate-900`
- Card title: `text-sm font-bold text-slate-700`
- Label/meta: `text-xs text-slate-500`
- Section header: `text-[11px] font-bold uppercase tracking-widest text-slate-400`
- Tiny meta: `text-[10px] text-slate-400`

### Status colors (consistent across app)
- Success/inserted: `text-emerald-600` / `bg-emerald-100`
- Warning/amber: `text-amber-600` / `bg-amber-100`
- Error/red: `text-red-500` / `bg-red-100`
- Info/slate: `text-slate-500` / `bg-slate-100`
- Running/pulse: `text-amber-500 animate-pulse`

### Badges (source, severity, signal type)
```typescript
// Source badge pattern
<span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${SOURCE_COLORS[source]}`}>
  {source}
</span>

// Severity badge pattern
// HIGH=rose  MEDIUM=amber  LOW=sky
```

## SectionLabel component
Used in Activity page and IngestDashboard for named sections:
```typescript
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
      {children}
    </p>
  )
}
```

## StatCard component (admin pages)
```typescript
<StatCard
  label="Label text"
  value={number}
  sub="sub text"          // optional
  icon={<Icon size={18} />}
  color="text-violet-600"
  bg="bg-violet-50"
/>
```

## Toast pattern
```typescript
const { add: toast } = useToastStore()
toast({ type: 'success' | 'error' | 'info', title: 'Title', message: 'Detail' })
```

## Auto-refresh pattern
```typescript
const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
useEffect(() => {
  load()
  intervalRef.current = setInterval(load, 8000)
  return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
}, [])
```

## No emoji in code
Unless explicitly requested — not in button labels, card titles, or status text.
