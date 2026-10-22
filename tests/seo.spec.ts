import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

test.describe('SEO signals in the page head', () => {
  test('the job browser keeps one canonical URL regardless of filters', async ({ page }) => {
    await page.route('**/api/v1/jobs/**', (route) => route.fulfill({ json: { content: [], totalPages: 0, totalElements: 0, number: 0, size: 80 } }))
    await page.goto(`${baseUrl}/jobs?publisher=linkedin&emirate=dubai`)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.uaeitjobs.com/jobs')
  })

  test('the static shell no longer claims every URL is the homepage', async ({ page }) => {
    await page.goto(`${baseUrl}/login`)
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
  })
})

test.describe('Brand links', () => {
  test('the footer links to the LinkedIn company page', async ({ page }) => {
    await page.goto(`${baseUrl}/login`)
    await expect(page.getByRole('contentinfo').getByRole('link', { name: 'LinkedIn', exact: true })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/company/uaeitjobs/',
    )
  })

  test('the site declares the LinkedIn page as the same organisation', async () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf-8')
    expect(html).toContain('"sameAs": ["https://www.linkedin.com/company/uaeitjobs/"]')
  })
})

test.describe('nginx crawler rule', () => {
  const conf = readFileSync(new URL('../nginx.conf', import.meta.url), 'utf-8')

  test('the bot user-agent pattern has no capturing group', () => {
    const match = /\$http_user_agent ~\* "([^"]+)"/.exec(conf)
    expect(match, 'bot user-agent rule not found').not.toBeNull()
    const pattern = match![1]
    expect(new RegExp(`^${pattern}$`).exec('Googlebot')!.length, 'extra capture groups would overwrite $1').toBe(1)
    for (const bot of ['Googlebot', 'bingbot', 'LinkedInBot', 'WhatsApp', 'Twitterbot']) {
      expect(new RegExp(pattern, 'i').test(`Mozilla/5.0 (compatible; ${bot}/2.1)`)).toBe(true)
    }
    expect(new RegExp(pattern, 'i').test('Mozilla/5.0 (Windows NT 10.0) Chrome/126 Safari/537.36')).toBe(false)
  })

  test('the redirect target uses the NAMED capture, because nginx resets $1 on any later regex match', () => {
    expect(conf).toContain('location ~* ^/jobs/(?<job_id>')
    expect(conf).toContain('return 302 https://www.uaeitjobs.com/api/v1/seo/job/$job_id;')
    expect(conf, 'a numbered capture is clobbered by the user-agent `if` and yields an empty id').not.toContain('/seo/job/$1')
  })
})
