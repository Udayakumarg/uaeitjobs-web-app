import { expect, test, type Page } from '@playwright/test'

const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

const job = (id: number, overrides: Record<string, unknown> = {}) => ({
  id,
  title: `Engineer ${id}`,
  companyName: `Company ${id}`,
  description: 'Build reliable systems.',
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: 'AED',
  jobType: 'full_time',
  experienceLevel: 'senior_5_plus',
  locationUae: 'Abu Dhabi, Abu Dhabi Emirate, AE',
  skills: 'Java,Spring',
  source: 'linkedin',
  postedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  active: true,
  ...overrides,
})

async function mockLandingApi(page: Page) {
  await page.route('**/api/v1/stats', (route) =>
    route.fulfill({ json: { totalJobs: 4030, companies: 124, countriesRepresented: 3 } }),
  )
  await page.route(/\/api\/v1\/jobs\?/, (route) =>
    route.fulfill({
      json: { content: [job(1), job(2, { locationUae: 'Remote (UAE-friendly)' })], totalPages: 1, totalElements: 2, number: 0, size: 6 },
    }),
  )
  await page.route('**/api/v1/jobs/publishers**', (route) =>
    route.fulfill({
      json: [
        { key: 'linkedin', label: 'LinkedIn', count: 3000 },
        { key: 'naukrigulf', label: 'NaukriGulf', count: 466 },
      ],
    }),
  )
}

test.describe('Landing page', () => {
  test('shows real numbers and none of the old invented claims', async ({ page }) => {
    await mockLandingApi(page)
    await page.goto(baseUrl)
    await expect(page.getByText('Where the roles come from')).toBeVisible()

    // numbers come from the API
    await expect(page.getByText('4,030').first()).toBeVisible()
    await expect(page.getByText('124').first()).toBeVisible()
    await expect(page.getByText('LinkedIn').first()).toBeVisible()

    // numbers that were typed into the page, with nothing behind them
    for (const invented of ['2.3× faster than peers', '4.8 days', 'Application funnel', '10× faster', 'Candidate reach']) {
      await expect(page.getByText(invented)).toHaveCount(0)
    }
  })

  test('does not invent stats when the API has none', async ({ page }) => {
    await page.route('**/api/v1/stats', (route) => route.fulfill({ status: 500, json: {} }))
    await page.route(/\/api\/v1\/jobs\?/, (route) =>
      route.fulfill({ json: { content: [], totalPages: 0, totalElements: 0, number: 0, size: 6 } }),
    )
    await page.route('**/api/v1/jobs/publishers**', (route) => route.fulfill({ status: 500, json: {} }))
    await page.goto(baseUrl)
    await expect(page.getByText('Active roles')).toBeVisible()
    await expect(page.getByText('20+')).toHaveCount(0)
    await expect(page.getByText('40+')).toHaveCount(0)
  })

  test('open-roles rows hide an empty salary and show a tidy location', async ({ page }) => {
    await mockLandingApi(page)
    await page.goto(baseUrl)
    const rows = page.getByRole('link', { name: /Engineer 1/ })
    await expect(rows.first()).toBeVisible()
    await expect(page.getByText('Salary undisclosed')).toHaveCount(0)
    await expect(page.getByText('Abu Dhabi Emirate')).toHaveCount(0)
    await expect(page.getByText('Remote · UAE-friendly').first()).toBeVisible()
  })

  test('the sample card in the hero is labelled as an example', async ({ page }) => {
    await mockLandingApi(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(baseUrl)
    await expect(page.getByText('Example', { exact: true })).toBeVisible()
    await expect(page.getByText('Featured', { exact: true })).toHaveCount(0)
  })
})
