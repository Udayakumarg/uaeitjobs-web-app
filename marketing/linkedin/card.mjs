import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

/** Renders a 1200x627 LinkedIn post image (the size LinkedIn shows without cropping). */
export async function renderCard(card, file) {
  const { chromium } = await import('@playwright/test')
  const logo = (await readFile(path.join(here, '..', '..', 'public', 'logo-horizontal.png'))).toString('base64')
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  const rows = (card.rows ?? [])
    .map((r) => `<div class="row"><span class="l">${esc(r.left)}</span><span class="r">${esc(r.right)}</span></div>`)
    .join('')
  const long = card.title.length > 60
  const compact = (card.rows ?? []).length >= 4 // 4-5 rows must still leave room for the footer
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0}
    body{width:1200px;height:627px;font-family:Inter,"Segoe UI",Roboto,Arial,sans-serif;color:#fff;
      background:radial-gradient(900px 500px at 85% -10%,rgba(190,24,93,.35),transparent 60%),linear-gradient(135deg,#050a18,#0b1020 55%,#0d0b2a);
      padding:56px 64px;display:flex;flex-direction:column}
    .top{display:flex;justify-content:space-between;align-items:center}
    .logo{background:#fff;border-radius:12px;padding:8px 16px;display:flex}.logo img{height:44px}
    .kicker{font-size:22px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#f472b6}
    h1{margin-top:${compact ? 24 : 36}px;font-size:${compact ? 44 : long ? 46 : 58}px;line-height:1.12;font-weight:700;letter-spacing:-.01em;max-width:1040px}
    .sub{margin-top:24px;font-size:30px;line-height:1.4;color:#cbd5e1;max-width:1000px}
    .rows{margin-top:${compact ? 20 : 28}px;display:grid;gap:${compact ? 8 : 12}px;max-width:1040px}
    .row{display:flex;justify-content:space-between;gap:24px;font-size:${compact ? 24 : 28}px;padding:${compact ? '9px 20px' : '14px 22px'};background:rgba(255,255,255,.07);
      border:1px solid rgba(255,255,255,.12);border-radius:12px}
    .row .l{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.row .r{color:#cbd5e1;white-space:nowrap}
    .foot{margin-top:auto;display:flex;justify-content:space-between;align-items:center;font-size:24px;color:#cbd5e1}
    .pill{background:#be185d;color:#fff;font-weight:700;padding:10px 22px;border-radius:999px}
  </style></head><body>
    <div class="top"><div class="logo"><img src="data:image/png;base64,${logo}"></div><div class="kicker">${esc(card.kicker)}</div></div>
    <h1>${esc(card.title)}</h1>
    ${card.sub ? `<p class="sub">${esc(card.sub)}</p>` : ''}
    <div class="rows">${rows}</div>
    <div class="foot"><span>${esc(card.footer ?? '')}</span><span class="pill">uaeitjobs.com</span></div>
  </body></html>`
  let browser
  try {
    browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' })
  } catch {
    browser = await chromium.launch()
  }
  const page = await browser.newPage({ viewport: { width: 1200, height: 627 } })
  await page.setContent(html, { waitUntil: 'load' })
  await page.screenshot({ path: file })
  await browser.close()
}

