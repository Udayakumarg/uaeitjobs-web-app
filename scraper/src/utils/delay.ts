import type { Page } from 'playwright'

/**
 * Human-like delay with ±1 s of random jitter.
 *
 * Also triggers a small smooth scroll during the wait to simulate a person
 * reading down the page — this changes the timing *shape* seen by bot detectors
 * that monitor JS event patterns, not just inter-request gaps.
 *
 * @param page     Playwright Page
 * @param baseMs   Center of the delay window (default 3 000 ms)
 */
export async function delayWithJitter(page: Page, baseMs = 3_000): Promise<void> {
  const jitter     = Math.floor(Math.random() * 2_000) - 1_000  // –1 000 … +1 000 ms
  const totalDelay = Math.max(1_000, baseMs + jitter)

  // Micro-scroll: simulate the user naturally reading down while waiting.
  // Wrapped in catch — some pages block scrollBy during navigation.
  await page
    .evaluate(() => {
      const amount = Math.floor(Math.random() * 220) + 80  // 80–300 px
      window.scrollBy({ top: amount, behavior: 'smooth' })
    })
    .catch(() => {})

  await page.waitForTimeout(totalDelay)
}
