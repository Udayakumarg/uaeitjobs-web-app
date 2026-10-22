#!/usr/bin/env node
/**
 * Builds today's LinkedIn post for the UAEITJOBS company page from LIVE job data.
 *
 *   node marketing/linkedin/daily_post.mjs                 # today's post -> out/<date>/ and out/latest/
 *   node marketing/linkedin/daily_post.mjs --date 2026-11-02 --no-image
 *   node marketing/linkedin/daily_post.mjs --plan 14       # evergreen-only drafts for LinkedIn's own scheduler
 *
 * Rules the generator follows so the page never says something untrue:
 *   - every number comes from the API at generation time, never typed in
 *   - only IT-relevant roles with a real description are featured
 *   - if there is too little fresh data, it falls back to an evergreen tip instead of guessing
 *   - --plan produces evergreen posts only (a "new roles today" post scheduled two weeks ahead would be false)
 *
 * No credentials are used or needed: it only reads the public API and writes files.
 */
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderCard } from './card.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const API = process.env.UAEITJOBS_API ?? 'https://www.uaeitjobs.com/api/v1'
const SITE = 'https://www.uaeitjobs.com'
const FEED_BASE =
  process.env.FEED_BASE_URL ??
  `https://raw.githubusercontent.com/${process.env.GITHUB_REPOSITORY ?? 'Udayakumarg/uaeitjobs-web-app'}/social-feed/`

// ── args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const outRoot = path.resolve(opt('out', path.join(here, 'out')))

/** Calendar date in the UAE (UTC+4), so "Monday" means Monday in Dubai. */
function uaeDate(offsetDays = 0) {
  const now = new Date(Date.now() + 4 * 3600e3 + offsetDays * 86400e3)
  return now.toISOString().slice(0, 10)
}
const dateStr = opt('date', uaeDate())
const weekday = new Date(`${dateStr}T12:00:00Z`).getUTCDay() // 0 = Sunday

// ── API ──────────────────────────────────────────────────────────────────────
async function api(pathAndQuery) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(`${API}${pathAndQuery}`, { headers: { 'User-Agent': 'uaeitjobs-social/1.0', Accept: 'application/json' } })
      if (res.ok) return await res.json()
      if (res.status !== 429 && res.status < 500) throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      if (attempt === 2) throw err
    }
    await new Promise((r) => setTimeout(r, 6000)) // the API allows ~10 requests/minute
  }
  throw new Error('unreachable')
}

// ── relevance + quality ──────────────────────────────────────────────────────
const IT_TITLE = /\b(engineer|developer|devops|sre|data|software|cloud|security|cyber|qa|test|analyst|architect|network|system|sysadmin|infrastructure|full.?stack|back.?end|front.?end|mobile|machine learning|ml|ai|ux|ui|database|dba|scrum|technical|programmer|it)\b/i
const NOT_IT = /\b(crane|operator|driver|chef|cook|nurse|waiter|cashier|warehouse|mechanic|electrician|plumber|carpenter|welder|cleaner|guard|receptionist|barista|bartender|sales)\b/i
const isTestCompany = (name) => /^test|test_/i.test(name ?? '')

const plainLength = (job) => {
  const text = (job.descriptionHtml || '').trim() ? job.descriptionHtml.replace(/<[^>]+>/g, ' ') : job.description ?? ''
  return text.replace(/\s+/g, ' ').trim().length
}
const isRelevant = (job) => !isTestCompany(job.companyName) && IT_TITLE.test(job.title ?? '') && !NOT_IT.test(job.title ?? '')
const isQuality = (job) => isRelevant(job) && plainLength(job) >= 300
const postedAt = (job) => new Date(job.postedAt || job.createdAt)

/** "Abu Dhabi, Abu Dhabi Emirate, AE" -> "Abu Dhabi"; same rules as the site (src/utils/format.ts). */
function locationLabel(raw) {
  if (!raw) return ''
  let s = raw.replace(/\s+/g, ' ').trim()
  const remote = /^remote\s*(?:in\s+)?(?:\((.*?)\)|(.*))$/i.exec(s)
  if (remote) {
    const where = locationLabel((remote[1] ?? remote[2] ?? '').trim())
    return where ? `Remote · ${where}` : 'Remote'
  }
  s = s
    .replace(/\s*-\s*United Arab Emirates(?:\s*\(UAE\))?$/i, '')
    .replace(/,\s*AE$/i, '')
    .replace(/,\s*(?:Abu Dhabi|Dubai|Sharjah|Ajman|Ras Al[ -]?Khaimah|Fujairah|Umm Al[ -]?Quwain)\s+Emirate$/i, '')
    .replace(/\s+Emirate$/i, '')
    .replace(/^United Arab Emirates$/i, 'UAE')
    .trim()
  const parts = s.split(/\s*,\s*/).filter(Boolean)
  return parts.length > 2 ? `${parts.slice(0, 2).join(', ')} +${parts.length - 2}` : parts.join(', ')
}

const EMIRATE_OF = (job) => {
  const t = `${job.emirate ?? ''} ${job.locationUae ?? ''}`.toLowerCase()
  if (/abu.?dhabi/.test(t)) return 'Abu Dhabi'
  if (/dubai/.test(t)) return 'Dubai'
  if (/sharjah/.test(t)) return 'Sharjah'
  return null
}

const TECH = [
  'Java', 'Python', 'JavaScript', 'TypeScript', 'React', 'Angular', 'Node.js', '.NET', 'C#', 'Go', 'Kubernetes', 'Docker',
  'AWS', 'Azure', 'GCP', 'Terraform', 'Linux', 'SQL', 'PostgreSQL', 'Kafka', 'Spark', 'Power BI', 'Tableau', 'Salesforce',
  'SAP', 'ServiceNow', 'CI/CD', 'Jenkins', 'Ansible', 'Snowflake', 'Databricks',
]
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
const techRegex = (t) => new RegExp(`(?<![A-Za-z0-9])${escapeRe(t)}(?![A-Za-z0-9])`, t === 'Go' ? '' : 'i')

// ── content library ──────────────────────────────────────────────────────────
async function loadJson(file) {
  return JSON.parse(await readFile(path.join(here, 'content', file), 'utf-8'))
}
const dayNumber = (d) => Math.floor(new Date(`${d}T00:00:00Z`).getTime() / 86400e3)

const BASE_TAGS = ['#UAEJobs', '#ITJobs', '#TechJobs']
const EXTRA_TAGS = ['#DubaiJobs', '#AbuDhabiJobs', '#Hiring', '#SoftwareEngineering', '#DevOps', '#DataEngineering', '#Cybersecurity', '#CareerAdvice']
const tags = (...extra) => [...new Set([...BASE_TAGS, ...extra])].slice(0, 5).join(' ')

// ── post builders ────────────────────────────────────────────────────────────
const bullets = (lines) => lines.map((l) => `• ${l}`).join('\n')
/** Tag a link so LinkedIn traffic shows up per post type in analytics (utm_source=linkedin). */
const tagged = (url, campaign) => `${url}${url.includes('?') ? '&' : '?'}utm_source=linkedin&utm_medium=social&utm_campaign=${campaign}`
const jobLink = (job, campaign) => tagged(`${SITE}/jobs/${job.id}`, campaign)
const clean = (t) => (t ?? '').replace(/\s+/g, ' ').trim()
const shortTitle = (t, max = 64) => (clean(t).length > max ? `${clean(t).slice(0, max - 1).trimEnd()}…` : clean(t))

/** First `n` jobs, at most `perCompany` from the same employer, so a list is not one company repeated. */
function diverse(jobs, n, perCompany = 1) {
  const seen = new Map()
  const out = []
  for (const j of jobs) {
    const count = seen.get(j.companyName) ?? 0
    if (count >= perCompany) continue
    seen.set(j.companyName, count + 1)
    out.push(j)
    if (out.length === n) break
  }
  return out
}

async function evergreen(kind) {
  if (kind === 'question') {
    const list = await loadJson('questions.json')
    const q = list[dayNumber(dateStr) % list.length]
    return {
      type: 'question',
      card: { kicker: 'Let’s talk', title: q.question, sub: q.context, rows: [], footer: 'Tell us in the comments' },
      text: `${q.question}\n\n${q.context}\n\nTell us in the comments — we read every one.\n\n${tags(...q.tags)}`,
      firstComment: `Browse UAE tech roles: ${tagged(`${SITE}/jobs`, 'question')}`,
    }
  }
  const tips = await loadJson('tips.json')
  const tip = tips[dayNumber(dateStr) % tips.length]
  return {
    type: 'tip',
    card: {
      kicker: 'Career tip',
      title: tip.title,
      // first paragraph of the tip, flattened, so the image carries the advice and not just a headline
      sub: shortTitle(tip.body.split('\n\n')[0].replace(/\n?•\s*/g, ' · ').replace(/\n/g, ' '), 190),
      rows: [],
      footer: 'Daily tips for UAE tech careers',
    },
    text: `${tip.title}\n\n${tip.body}\n\nFind UAE tech roles worth applying to, all in one place.\n\n${tags(...tip.tags, '#CareerAdvice')}`,
    firstComment: `Browse UAE tech roles: ${tagged(`${SITE}/jobs`, 'tip')}`,
  }
}

async function dataPost(kind, data) {
  const { quality, relevantRecent, remoteTotal, remoteQuality } = data

  if (kind === 'hiring') {
    if (relevantRecent.length < 8) return null
    const byCompany = new Map()
    for (const j of relevantRecent) byCompany.set(j.companyName, (byCompany.get(j.companyName) ?? 0) + 1)
    const top = [...byCompany].sort((a, b) => b[1] - a[1]).slice(0, 5)
    const emirates = { Dubai: 0, 'Abu Dhabi': 0, Sharjah: 0 }
    let remote = 0
    for (const j of relevantRecent) {
      const e = EMIRATE_OF(j)
      if (e) emirates[e]++
      if (j.remoteUae) remote++
    }
    const where = Object.entries(emirates).filter(([, n]) => n > 0).map(([k, n]) => `${k} ${n}`)
    if (remote) where.push(`Remote ${remote}`)
    return {
      type: 'hiring',
      card: {
        kicker: 'Fresh this week',
        title: `${relevantRecent.length} new tech roles in the UAE`,
        rows: top.map(([name, n]) => ({ left: name, right: `${n} role${n > 1 ? 's' : ''}` })),
        footer: where.join('  ·  '),
      },
      text:
        `${relevantRecent.length} new tech roles were added in the UAE over the last day or two.\n\n` +
        `Who's hiring most:\n${bullets(top.map(([name, n]) => `${name} — ${n} role${n > 1 ? 's' : ''}`))}\n\n` +
        `Where: ${where.join(' · ')}\n\nSave this post and apply early — fresh listings get the most attention.\n\n${tags('#Hiring')}`,
      firstComment: `All open roles: ${tagged(`${SITE}/jobs`, 'hiring')}`,
    }
  }

  if (kind === 'skills') {
    const pool = quality.slice(0, 60)
    if (pool.length < 15) return null
    const counts = TECH.map((t) => {
      const re = techRegex(t)
      const n = pool.filter((j) => re.test(`${j.title} ${(j.descriptionHtml || j.description || '').replace(/<[^>]+>/g, ' ')}`)).length
      return [t, n]
    }).filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 5)
    if (counts.length < 3) return null
    return {
      type: 'skills',
      card: {
        kicker: 'In demand now',
        title: 'Most requested skills in recent UAE tech roles',
        rows: counts.map(([t, n]) => ({ left: t, right: `${n} of ${pool.length} roles` })),
        footer: 'Based on recent listings on uaeitjobs.com',
      },
      text:
        `What are UAE tech employers asking for right now?\n\nWe scanned ${pool.length} recent listings. Most mentioned:\n` +
        `${bullets(counts.map(([t, n]) => `${t} — ${n} of ${pool.length} roles`))}\n\n` +
        `Which of these is on your CV? Which one are you learning next?\n\n${tags('#Skills', '#SoftwareEngineering')}`,
      firstComment: `Browse the roles behind this: ${tagged(`${SITE}/jobs`, 'skills')}`,
    }
  }

  if (kind === 'remote') {
    const picks = diverse(remoteQuality, 3)
    if (!remoteTotal || picks.length < 3) return null
    return {
      type: 'remote',
      card: {
        kicker: 'Remote · UAE-friendly',
        title: `${remoteTotal.toLocaleString()} remote roles tagged “UAE-friendly”`,
        rows: picks.map((j) => ({ left: shortTitle(j.title, 40), right: j.companyName })),
        footer: 'Check each role’s location rules before applying',
      },
      text:
        `${remoteTotal.toLocaleString()} remote roles on UAEITJOBS are tagged “UAE-friendly”.\n\nA few fresh tech ones:\n` +
        `${bullets(picks.map((j) => `${shortTitle(j.title)} — ${j.companyName}`))}\n\n` +
        `Before you apply to any remote role: read its location rules (some hire only from certain countries), check the time-zone overlap, and ask which entity would employ you.\n\n${tags('#RemoteWork', '#Hiring')}`,
      firstComment: `Remote roles: ${tagged(`${SITE}/jobs?remote=1`, 'remote')}\n${picks.map((j) => `${shortTitle(j.title)}: ${jobLink(j, 'remote')}`).join('\n')}`,
    }
  }

  if (kind === 'spotlight' || kind === 'roundup') {
    const picks = diverse(quality, 5)
    if (picks.length < 5) return null
    const title = kind === 'spotlight' ? 'Five tech roles to look at today' : 'Fresh tech roles this weekend'
    return {
      type: kind,
      card: {
        kicker: kind === 'spotlight' ? 'Hiring spotlight' : 'Weekend roundup',
        title,
        rows: picks.map((j) => ({ left: shortTitle(j.title, 44), right: `${j.companyName}` })),
        footer: 'Full descriptions and apply links on uaeitjobs.com',
      },
      text:
        `${title}:\n\n${bullets(picks.map((j) => `${shortTitle(j.title)} — ${j.companyName}${locationLabel(j.locationUae) ? ` (${locationLabel(j.locationUae)})` : ''}`))}\n\n` +
        `Links to each role are in the first comment.\n\n${tags('#Hiring')}`,
      firstComment: picks.map((j) => `${shortTitle(j.title)} — ${j.companyName}: ${jobLink(j, kind)}`).join('\n'),
    }
  }
  return null
}

const SCHEDULE = ['question', 'hiring', 'skills', 'remote', 'spotlight', 'tip', 'roundup'] // Sun..Sat

// ── main ─────────────────────────────────────────────────────────────────────
async function buildToday() {
  const kind = opt('type', SCHEDULE[weekday])
  let post = null
  if (kind !== 'tip' && kind !== 'question') {
    const [recent, remote] = await Promise.all([api('/jobs/filter?page=0&size=80'), api('/jobs/filter?page=0&size=40&remoteUae=true')])
    const now = Date.now()
    const relevantAll = recent.content.filter(isRelevant)
    const relevantRecent = relevantAll.filter((j) => now - postedAt(j).getTime() < 48 * 3600e3)
    const data = {
      quality: recent.content.filter(isQuality),
      relevantRecent,
      remoteTotal: remote.totalElements,
      remoteQuality: remote.content.filter(isQuality),
    }
    post = await dataPost(kind, data)
    if (!post) console.log(`Not enough fresh data for "${kind}" - falling back to an evergreen tip.`)
  }
  return post ?? (await evergreen(kind === 'question' ? 'question' : 'tip'))
}

async function writeOut(post, dir) {
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, 'post.txt'), post.text + '\n')
  await writeFile(path.join(dir, 'first_comment.txt'), (post.firstComment ?? '') + '\n')
  if (!flag('no-image')) await renderCard(post.card, path.join(dir, 'card.png'))
  const meta = {
    date: dateStr,
    type: post.type,
    text: post.text,
    firstComment: post.firstComment ?? '',
    imageUrl: flag('no-image') ? null : `${FEED_BASE}card.png`,
    generatedAt: new Date().toISOString(),
  }
  await writeFile(path.join(dir, 'post.json'), JSON.stringify(meta, null, 2) + '\n')
}

async function plan(days) {
  const tips = await loadJson('tips.json')
  const questions = await loadJson('questions.json')
  const lines = ['date,weekday,type,text,first_comment']
  const md = ['# Evergreen drafts for LinkedIn’s own scheduler', '']
  for (let i = 1; i <= days; i++) {
    const d = uaeDate(i)
    const n = dayNumber(d)
    const wd = new Date(`${d}T12:00:00Z`).getUTCDay()
    const isQ = wd === 0
    const item = isQ ? questions[n % questions.length] : tips[n % tips.length]
    const text = isQ
      ? `${item.question}\n\n${item.context}\n\nTell us in the comments — we read every one.\n\n${tags(...item.tags)}`
      : `${item.title}\n\n${item.body}\n\nFind UAE tech roles worth applying to, all in one place.\n\n${tags(...item.tags, '#CareerAdvice')}`
    const fc = `Browse UAE tech roles: ${tagged(`${SITE}/jobs`, isQ ? 'question' : 'tip')}`
    lines.push([d, ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][wd], isQ ? 'question' : 'tip', JSON.stringify(text), JSON.stringify(fc)].join(','))
    md.push(`## ${d}  (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][wd]})`, '', text, '', `First comment: ${fc}`, '')
  }
  await mkdir(outRoot, { recursive: true })
  await writeFile(path.join(outRoot, 'plan.csv'), lines.join('\n') + '\n')
  await writeFile(path.join(outRoot, 'plan.md'), md.join('\n'))
  console.log(`Wrote ${days} evergreen drafts to ${path.join(outRoot, 'plan.md')} and plan.csv`)
}

if (opt('plan')) {
  await plan(Number(opt('plan', '14')))
} else {
  const post = await buildToday()
  const dir = path.join(outRoot, dateStr)
  await writeOut(post, dir)
  const latest = path.join(outRoot, 'latest')
  await mkdir(latest, { recursive: true })
  for (const f of ['post.txt', 'first_comment.txt', 'post.json', ...(flag('no-image') ? [] : ['card.png'])]) {
    await copyFile(path.join(dir, f), path.join(latest, f))
  }
  console.log(`\n=== ${dateStr} (${post.type}) ===\n${post.text}\n\n--- first comment ---\n${post.firstComment}\n\nWritten to ${dir}`)
}
