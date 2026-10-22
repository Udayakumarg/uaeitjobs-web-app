import { expect, test, type Page } from '@playwright/test'

const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()

const longDescription =
  '<h3>About the role</h3>' +
  '<p>Own services end to end, mentor teammates and keep production healthy.</p>'.repeat(40)

function makeJob(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title: `Engineer ${id}`,
    companyName: `Company ${id}`,
    description: 'Build reliable systems.',
    descriptionHtml: longDescription,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: 'AED',
    jobType: 'full_time',
    experienceLevel: 'senior',
    locationUae: 'Dubai',
    skills: 'Java,Spring',
    source: 'linkedin',
    postedAt: hoursAgo(2 + id * 30),
    createdAt: hoursAgo(2 + id * 30),
    active: true,
    visaType: 'free_visa',
    emirate: 'dubai',
    applyUrl: 'https://example.com/apply',
    linkedinEasyApply: false,
    ...overrides,
  }
}

const JOBS = [
  makeJob(1),
  makeJob(2, { salaryMin: 18000, salaryMax: 30000 }),
  makeJob(3, { remoteUae: true }),
]

/** Mocks the jobs API; records the query string of every /jobs/filter call. */
async function mockJobsApi(page: Page) {
  const filterCalls: URLSearchParams[] = []
  await page.route('**/api/v1/jobs/publishers**', (route) =>
    route.fulfill({ json: [{ key: 'linkedin', label: 'LinkedIn', count: 3 }] }),
  )
  await page.route('**/api/v1/jobs/filter**', (route) => {
    const params = new URL(route.request().url()).searchParams
    filterCalls.push(params)
    const content = params.get('remoteUae') === 'true' ? JOBS.filter((j) => j.remoteUae) : JOBS
    return route.fulfill({
      json: { content, totalPages: 1, totalElements: content.length, number: 0, size: 80 },
    })
  })
  await page.route(/\/api\/v1\/jobs\/\d+$/, (route) => {
    const id = Number(route.request().url().split('/').pop())
    return route.fulfill({ json: JOBS.find((j) => j.id === id) ?? JOBS[0] })
  })
  return filterCalls
}

const left = async (page: Page, selector: string) =>
  Math.round((await page.locator(selector).first().boundingBox())!.x)

test.describe('Browse jobs page', () => {
  test('header, filters, chips and panels share the same edges on a wide screen', async ({ page }) => {
    await mockJobsApi(page)
    await page.setViewportSize({ width: 1920, height: 1000 })
    await page.goto(`${baseUrl}/jobs?publisher=linkedin`)
    await expect(page.getByText('3 roles')).toBeVisible()

    const header = page.locator('header .max-w-7xl').first()
    const searchRow = page.getByPlaceholder('Search roles, skills, companies…').locator('xpath=ancestor::div[contains(@class,"max-w-7xl")][1]')
    const chipsRow = page.getByRole('button', { name: 'Remove filter: LinkedIn' }).locator('xpath=ancestor::div[contains(@class,"max-w-7xl")][1]')
    const panels = page.locator('aside').locator('xpath=..')

    const edges = await Promise.all([header, searchRow, chipsRow, panels].map(async (l) => {
      const box = (await l.boundingBox())!
      return [Math.round(box.x), Math.round(box.x + box.width)]
    }))
    for (const e of edges) expect(e).toEqual(edges[0])
    expect(edges[0][0]).toBeGreaterThan(100) // centred, not flush left
    expect(1920 - edges[0][1]).toBe(edges[0][0]) // equal space on both sides
  })

  test('has a single heading and no duplicate result count', async ({ page }) => {
    await mockJobsApi(page)
    await page.goto(`${baseUrl}/jobs?publisher=linkedin`)
    await expect(page.getByRole('heading', { name: 'Browse UAE IT roles' })).toHaveCount(1)
    await expect(page.getByText('3 roles')).toHaveCount(1)
  })

  test('quick filters send the right API params, update the URL and show chips', async ({ page }) => {
    const calls = await mockJobsApi(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${baseUrl}/jobs`)
    await expect(page.getByText('3 roles')).toBeVisible()

    await page.getByRole('button', { name: 'Remote', exact: true }).click()
    await expect(page.locator('aside [aria-live]')).toContainText('1 role')
    await page.getByRole('button', { name: 'Visa provided' }).click()
    await page.getByRole('button', { name: 'Immediate joiner' }).click()

    await expect(page).toHaveURL(/remote=1/)
    await expect(page).toHaveURL(/visa=free/)
    await expect(page).toHaveURL(/immediate=1/)
    await expect(page.getByRole('button', { name: 'Remove filter: Remote UAE' })).toBeVisible()

    const last = calls.at(-1)!
    expect(last.get('remoteUae')).toBe('true')
    expect(last.get('visaType')).toBe('free_visa')
    expect(last.get('immediateJoiner')).toBe('true')

    await page.getByRole('button', { name: 'Clear', exact: true }).click()
    await expect(page.getByText('3 roles')).toBeVisible()
    await expect(page).not.toHaveURL(/remote=1/)
  })

  test('shows a New badge for fresh roles and never prints "Salary undisclosed"', async ({ page }) => {
    await mockJobsApi(page)
    await page.goto(`${baseUrl}/jobs`)
    await expect(page.getByText('3 roles')).toBeVisible()
    await expect(page.locator('aside').getByText('New', { exact: true })).toHaveCount(1)
    await expect(page.getByText('Salary undisclosed')).toHaveCount(0)
    await expect(page.getByText('Salary not listed by employer')).toBeVisible()
  })

  test('list items are keyboard accessible without nesting buttons', async ({ page }) => {
    await mockJobsApi(page)
    await page.goto(`${baseUrl}/jobs`)
    await expect(page.getByText('3 roles')).toBeVisible()
    const items = page.locator('aside [role="button"]')
    await expect(items).toHaveCount(3)
    await expect(page.locator('aside button button')).toHaveCount(0)
    await items.nth(1).focus()
    await page.keyboard.press('Enter')
    await expect(items.nth(1)).toHaveAttribute('aria-current', 'true')
  })

  test('Apply stays reachable: a pinned bar appears when the header scrolls away', async ({ page }) => {
    await mockJobsApi(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${baseUrl}/jobs`)
    await expect(page.getByRole('heading', { name: 'Engineer 1', level: 1 })).toBeVisible()
    const pinned = page.locator('main main .sticky.bottom-0')
    await expect(pinned).toHaveCount(0)
    await page.locator('main main').evaluate((el) => el.scrollTo(0, 1500))
    await expect(pinned).toBeVisible()
    await expect(pinned.getByRole('link', { name: /Apply Now/ })).toBeVisible()
    await page.locator('main main').evaluate((el) => el.scrollTo(0, 0))
    await expect(pinned).toHaveCount(0)
  })

  test('filter row wraps instead of overflowing at tablet width', async ({ page }) => {
    await mockJobsApi(page)
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto(`${baseUrl}/jobs`)
    await expect(page.getByText('3 roles')).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow).toBe(false)
    expect(await left(page, 'button[aria-pressed]')).toBeGreaterThanOrEqual(0)
  })

  test('mobile: no horizontal scroll and the filter sheet offers quick filters', async ({ page }) => {
    await mockJobsApi(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${baseUrl}/jobs`)
    await expect(page.getByText('3 roles')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
    await page.getByRole('button', { name: /^Filters/ }).click()
    await expect(page.getByRole('button', { name: 'Immediate joiner' }).last()).toBeVisible()
    await page.getByRole('button', { name: 'Remote UAE' }).click()
    await expect(page).toHaveURL(/remote=1/)
  })
})

test.describe('Theme', () => {
  test('dark theme and accent apply, persist across reloads, and keep the layout intact', async ({ page }) => {
    await mockJobsApi(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${baseUrl}/jobs`)
    await page.getByRole('button', { name: 'Theme and colour' }).click()
    await page.getByRole('menuitemradio', { name: 'Dark' }).click()
    await page.getByRole('menuitemradio', { name: 'Teal' }).click()

    const root = page.locator('html')
    await expect(root).toHaveAttribute('data-theme', 'dark')
    await expect(root).toHaveAttribute('data-accent', 'teal')

    await page.reload()
    await expect(root).toHaveAttribute('data-theme', 'dark')
    await expect(root).toHaveAttribute('data-accent', 'teal')
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(bg).toBe('rgb(11, 18, 32)')
  })

  test('light theme can be forced regardless of the system setting', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.addInitScript(() => localStorage.setItem('uaeitjobs.theme', 'light'))
    await mockJobsApi(page)
    await page.goto(`${baseUrl}/jobs`)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })
})
