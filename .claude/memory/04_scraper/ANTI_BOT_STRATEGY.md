# Anti-Bot Strategy

## Layer 1 — Browser level (playwright-extra + stealth plugin)
`puppeteer-extra-plugin-stealth` patches ~18 browser APIs:
- `navigator.webdriver` → undefined
- `navigator.plugins` → realistic plugin list
- iframe contentWindow isolation
- Chrome DevTools Protocol indicators

**NEVER use `playwright-stealth`** — it's a 2021 npm stub at 0.0.1 that does nothing.

## Layer 2 — Context level (applyContextStealth)
Applied via `context.addInitScript()` — runs before any page JS, inherited by all pages/popups:

```typescript
// WebGL vendor (headless reports "Google SwiftShader")
WebGLRenderingContext.prototype.getParameter = function(p) {
  if (p === 37445) return 'Intel Inc.'                // UNMASKED_VENDOR_WEBGL
  if (p === 37446) return 'Intel Iris OpenGL Engine'  // UNMASKED_RENDERER_WEBGL
}
// window.chrome presence (absent in stock headless)
if (!window.chrome) window.chrome = { runtime: {} }
// Permissions API (headless returns 'denied', real Chrome returns actual state)
navigator.permissions.query = (desc) => desc.name === 'notifications'
  ? Promise.resolve({ state: Notification.permission }) : origQuery(desc)
// Language list
Object.defineProperty(navigator, 'languages', { get: () => ['en-AE', 'en-US', 'en'] })
```

## Layer 3 — Launch args
```
--no-sandbox
--disable-setuid-sandbox
--disable-blink-features=AutomationControlled   // hides at Blink level
--disable-infobars
--disable-dev-shm-usage
--disable-http2                                  // partially mitigates TLS fingerprinting
```

## Layer 4 — Context fingerprint
- User-Agent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36`
- Locale: `en-AE` · Timezone: `Asia/Dubai` · Viewport: 1366×768 · ColorScheme: light · DeviceScaleFactor: 1
- ExtraHTTPHeaders: `Accept-Language: en-AE,en-US;q=0.9,en;q=0.8`

## Layer 5 — Behavioral (delayWithJitter)
```typescript
// baseMs ± 1000ms, with smooth scroll simulation
const jitter = Math.floor(Math.random() * 2_000) - 1_000
const total = Math.max(1_000, baseMs + jitter)
await page.evaluate(() => window.scrollBy({ top: 80-300px, behavior: 'smooth' }))
await page.waitForTimeout(total)
```

## Layer 6 — Resource blocking
Blocks images/fonts/video (40% faster) and tracking/analytics (reduces fingerprinting):
```
**/*.{png,jpg,jpeg,gif,webp,svg,ico,woff,woff2,ttf,eot,mp4,...}
**/{google-analytics,googletagmanager,hotjar,clarity,doubleclick,...}**
```

## What's missing (gaps)
- **Residential proxies** — datacenter IPs blocked by LinkedIn (and increasingly Bayt)
- **TLS JA3 fingerprint** — Node.js TLS differs from Chrome; `--disable-http2` only partially helps
- **Mouse movement simulation** — behavioral analysis can detect zero mouse movement
- **CAPTCHA solving** — `puppeteer-extra-plugin-recaptcha` installed but NOT wired in

## Per-site detection resistance

| Site | Primary risk | Current status |
|------|-------------|----------------|
| Bayt | Moderate — CSS-based | Stealth stack sufficient so far |
| NaukriGulf | Low — standard | Works reliably |
| GulfTalent | None — SSR, uses axios | No browser = no detection |
| LinkedIn | High — Akamai Bot Manager | Datacenter IP blocks are real risk |
