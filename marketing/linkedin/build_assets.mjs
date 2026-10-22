#!/usr/bin/env node
/**
 * Builds the one-off LinkedIn page graphics into marketing/linkedin/assets/:
 *   cover-4200x700.png   page cover (6:1). Centre-weighted: LinkedIn overlays the logo at the
 *                        lower left on desktop and crops the sides on mobile.
 *   logo-400.png         400x400 square page logo
 *   launch-card.png      1200x627 "we're live" announcement image
 *
 *   node marketing/linkedin/build_assets.mjs
 *
 * Re-run any time the brand text changes. The logo files in /public are small rasters, so for the
 * crispest result upload your original high-resolution logo to LinkedIn instead of logo-400.png.
 */
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { renderCard } from './card.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(here, 'assets')
await mkdir(out, { recursive: true })
const b64 = async (rel) => (await readFile(path.join(here, '..', '..', 'public', rel))).toString('base64')

let browser
try {
  browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' })
} catch {
  browser = await chromium.launch()
}

// ── cover: 2100x350 CSS px at 2x = 4200x700 ─────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 2100, height: 350 }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  const logo = await b64('logo-horizontal.png')
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0}
    body{width:2100px;height:350px;overflow:hidden;font-family:Inter,"Segoe UI",Roboto,Arial,sans-serif;color:#fff;position:relative;
      background:radial-gradient(1100px 420px at 78% -30%,rgba(190,24,93,.45),transparent 62%),radial-gradient(800px 300px at 12% 130%,rgba(79,70,229,.25),transparent 60%),linear-gradient(120deg,#050a18,#0b1020 55%,#0d0b2a)}
    .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:56px 56px;
      -webkit-mask-image:radial-gradient(900px 300px at 55% 50%,#000,transparent 75%);mask-image:radial-gradient(900px 300px at 55% 50%,#000,transparent 75%)}
    .content{position:absolute;left:520px;right:260px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center}
    .eyebrow{font-size:20px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#f472b6}
    h1{margin-top:14px;font-size:68px;line-height:1.05;font-weight:700;letter-spacing:-.02em}
    h1 span{color:#f9a8d4}
    p{margin-top:16px;font-size:26px;color:#cbd5e1}
    .badge{position:absolute;right:120px;top:50%;transform:translateY(-50%);background:#be185d;padding:16px 34px;border-radius:999px;font-size:28px;font-weight:700;box-shadow:0 10px 30px rgba(190,24,93,.45)}
    .stripe{position:absolute;left:0;right:0;bottom:0;height:6px;display:flex}.stripe i{flex:1}
  </style></head><body>
    <div class="grid"></div>
    <div class="content">
      <div class="eyebrow">UAE tech hiring</div>
      <h1>Every UAE tech role. <span>One place.</span></h1>
      <p>Software &middot; Cloud &middot; Data &middot; Security &middot; QA &middot; Product &nbsp;|&nbsp; Dubai &middot; Abu Dhabi &middot; Sharjah &middot; Remote</p>
    </div>
    <div class="badge">uaeitjobs.com</div>
    <div class="stripe"><i style="background:#00732f"></i><i style="background:#fff"></i><i style="background:#ce1126"></i><i style="background:#000"></i></div>
  </body></html>`, { waitUntil: 'load' })
  await page.screenshot({ path: path.join(out, 'cover-4200x700.png') })
  await ctx.close()
  void logo
}

// ── logo: 400x400 square (LinkedIn shows it in a circle on some surfaces, so keep padding) ──
{
  const ctx = await browser.newContext({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  const mark = await b64('logo-mark.png')
  await page.setContent(`<!doctype html><html><body style="margin:0;width:400px;height:400px;background:#fff;display:flex;align-items:center;justify-content:center">
    <img src="data:image/png;base64,${mark}" style="width:272px;height:auto;image-rendering:auto"></body></html>`, { waitUntil: 'load' })
  await page.screenshot({ path: path.join(out, 'logo-400.png') })
  await ctx.close()
}
await browser.close()

// ── launch announcement image ────────────────────────────────────────────────
await renderCard(
  {
    kicker: 'Now live',
    title: 'UAE IT jobs, all in one place',
    sub: 'Software, cloud, data, security and more across Dubai, Abu Dhabi, Sharjah and remote UAE, with full details and a direct apply link.',
    rows: [],
    footer: 'Free for job seekers',
  },
  path.join(out, 'launch-card.png'),
)
console.log(`Wrote cover-4200x700.png, logo-400.png and launch-card.png to ${out}`)
