/**
 * HTTP transport for LinkedIn's guest endpoints.
 *
 * These endpoints serve server-rendered HTML to anonymous clients, so this is
 * plain axios — no browser, no cookies, no proxy. That is the whole point of
 * the guest API: it removes the session, OTP and residential-IP dependencies
 * that made the authenticated scraper unrunnable.
 *
 * Responsibilities kept here so the orchestrator stays readable:
 *   - retry with exponential backoff + full jitter on transient failures
 *   - Retry-After support when LinkedIn asks us to slow down
 *   - a distinction between "transient" and "exhausted" so pagination can stop
 *   - bounded concurrency
 */
import axios, { AxiosError, AxiosInstance } from 'axios'

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
]

const MAX_ATTEMPTS = intEnv('LI_MAX_ATTEMPTS', 6)
const BASE_BACKOFF_MS = intEnv('LI_BACKOFF_MS', 1_000)
const TIMEOUT_MS = intEnv('LI_TIMEOUT_MS', 20_000)

/**
 * Throttling gets its own, much longer backoff.
 *
 * Observed in a full sweep: LinkedIn tolerates short bursts happily but starts
 * returning 429 under sustained load, and a 1s-based backoff exhausts its
 * retries long before the throttle lifts. Since exhausting retries abandons
 * the rest of that query's pages, an under-sized backoff turns a temporary
 * slowdown into permanent missing coverage.
 */
const RATE_LIMIT_BACKOFF_MS = intEnv('LI_RATE_LIMIT_BACKOFF_MS', 8_000)

/**
 * Signals the caller asked for a page past the end of the result set.
 * LinkedIn answers those with 400, which is terminal, not transient.
 */
export class ExhaustedError extends Error {}

const http: AxiosInstance = axios.create({
  timeout: TIMEOUT_MS,
  // 4xx must reach our own handler rather than being thrown by axios, so the
  // 400-means-exhausted case can be told apart from a real failure.
  validateStatus: () => true,
  headers: {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-AE,en-US;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
  },
})

/**
 * GET a guest-API URL, retrying transient failures.
 *
 * @throws ExhaustedError when the endpoint reports the page is out of range.
 * @throws Error when every attempt fails.
 */
export async function fetchHtml(url: string): Promise<string> {
  let lastError = 'unknown error'

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await http.get<string>(url, {
        headers: { 'User-Agent': pick(USER_AGENTS) },
      })
      const { status, data } = response

      if (status === 200) return data

      // Out of range — the caller has paginated past the last result.
      if (status === 400 || status === 404) {
        throw new ExhaustedError(`HTTP ${status}`)
      }

      // 429 = explicit throttle, 999 = LinkedIn's bot challenge, 5xx = flaky.
      if (status === 429 || status === 999 || status >= 500) {
        lastError = `HTTP ${status}`
        const throttled = status === 429 || status === 999
        const retryAfter = Number(response.headers['retry-after'])
        await sleep(
          Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1_000
            : backoff(attempt, throttled ? RATE_LIMIT_BACKOFF_MS : BASE_BACKOFF_MS),
        )
        continue
      }

      // Anything else is unexpected and not worth hammering.
      throw new Error(`HTTP ${status}`)
    } catch (err) {
      if (err instanceof ExhaustedError) throw err

      // A non-axios error is ours (e.g. the explicit throw above) — surface it.
      if (!axios.isAxiosError(err)) throw err

      lastError = describe(err)
      if (attempt < MAX_ATTEMPTS) await sleep(backoff(attempt))
    }
  }

  throw new Error(`${MAX_ATTEMPTS} attempts failed — last: ${lastError}`)
}

// ─── Concurrency ──────────────────────────────────────────────────────────────

/**
 * Run `worker` over `items` with at most `limit` in flight.
 *
 * Results keep input order. A worker that throws yields `undefined` in its
 * slot rather than rejecting the batch — partial progress is always preferable
 * to losing a whole run to one bad item.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<(R | undefined)[]> {
  const results = new Array<R | undefined>(items.length)
  let cursor = 0

  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const index = cursor++
      if (index >= items.length) return
      try {
        results[index] = await worker(items[index], index)
      } catch {
        results[index] = undefined
      }
    }
  })

  await Promise.all(runners)
  return results
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Exponential backoff with full jitter — spreads retries instead of syncing them. */
function backoff(attempt: number, base: number = BASE_BACKOFF_MS): number {
  const ceiling = base * 2 ** (attempt - 1)
  return Math.floor(Math.random() * ceiling) + base / 2
}

function describe(err: AxiosError): string {
  if (err.code === 'ECONNABORTED') return 'timeout'
  return err.code ?? err.message
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

export function intEnv(name: string, fallback: number): number {
  const parsed = parseInt(process.env[name] ?? '', 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}
