import type { BrowserContext } from 'playwright'

/**
 * Manual addInitScript patches applied at the BrowserContext level.
 *
 * These run *before* any page JavaScript and are inherited by every new page
 * (including popups) opened from this context — no per-page wiring needed.
 *
 * These complement the puppeteer-extra-plugin-stealth patches wired into the
 * browser via playwright-extra. Together they form a two-layer defence:
 *   Layer 1 (this file) — context-level: WebGL, chrome object, permissions API
 *   Layer 2 (index.ts)  — browser-level: navigator.webdriver, plugins, iframes
 *
 * Sources / rationale for each patch:
 *   https://bot.sannysoft.com/   — real-time fingerprint test page
 *   https://arh.antoinevastel.com/bots/areyouheadless
 */
export async function applyContextStealth(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {

    // ── 1. WebGL vendor — headless reports "Google Inc." / "Google SwiftShader"
    //        Real Intel iGPU: "Intel Inc." / "Intel Iris OpenGL Engine"
    const origGetParameter = WebGLRenderingContext.prototype.getParameter
    WebGLRenderingContext.prototype.getParameter = function (parameter: number) {
      if (parameter === 37445) return 'Intel Inc.'                 // UNMASKED_VENDOR_WEBGL
      if (parameter === 37446) return 'Intel Iris OpenGL Engine'   // UNMASKED_RENDERER_WEBGL
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return origGetParameter.call(this, parameter as any)
    }

    // ── 2. window.chrome — absent in stock Chromium; all real Chrome installs have it
    // @ts-expect-error intentional global mutation in init-script
    if (!window.chrome) window.chrome = { runtime: {} }

    // ── 3. Permissions API — headless Chromium returns 'denied' for notifications;
    //        real Chrome returns the actual notification permission state
    const origQuery = navigator.permissions.query.bind(navigator.permissions)
    navigator.permissions.query = (desc: PermissionDescriptor) =>
      desc.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
        : origQuery(desc)

    // ── 4. Language list matching the context locale (en-AE for UAE portals)
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-AE', 'en-US', 'en'],
    })
  })
}
