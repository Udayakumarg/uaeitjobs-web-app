import { expect, test } from '@playwright/test'

const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

test('login submits to the backend and shows an auth error', async ({ page }) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Invalid email or password' }),
    })
  })

  await page.goto(`${baseUrl}/login`)
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible()

  await page.getByPlaceholder('you@example.com').fill('hr-smoke-test@uaeitjobs.com')
  await page.getByPlaceholder('Enter your password').fill('WrongPassword123')
  const loginRequest = page.waitForRequest((request) => request.url().includes('/api/v1/auth/login'))
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click()
  const request = await loginRequest

  expect(request.method()).toBe('POST')
  expect(request.postDataJSON()).toEqual({
    email: 'hr-smoke-test@uaeitjobs.com',
    password: 'WrongPassword123',
  })
  await expect(page.getByText('Invalid email or password. Please check your details and try again.')).toBeVisible()
})

test('mobile navigation reaches the job browser', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(baseUrl)

  await expect(page.getByRole('button', { name: 'Toggle navigation' })).toBeVisible()
  await page.getByRole('button', { name: 'Toggle navigation' }).click()
  const mobileNav = page.locator('#mobile-navigation')
  await expect(mobileNav.getByRole('link', { name: 'Browse jobs' })).toBeVisible()
  await mobileNav.getByRole('link', { name: 'Browse jobs' }).click()

  await expect(page.getByRole('heading', { name: 'Browse UAE IT roles' })).toBeVisible({ timeout: 15_000 })
})
