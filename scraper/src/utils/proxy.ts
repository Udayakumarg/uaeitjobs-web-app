/**
 * Proxy rotation utilities.
 *
 * Configure proxies via the PROXIES env var as a comma-separated list:
 *   PROXIES=http://user:pass@host1:port,http://user:pass@host2:port
 *
 * Supports http, https, and socks5 proxy URLs.
 * Falls back to a direct connection if PROXIES is unset or empty.
 */

export interface ProxyConfig {
  server: string
  username?: string
  password?: string
}

/**
 * Parse a proxy URL string into the shape Playwright's `proxy` option expects.
 * Input:  "http://username:password@proxy.example.com:8080"
 * Output: { server: "http://proxy.example.com:8080", username: "username", password: "password" }
 */
export function parseProxy(raw: string): ProxyConfig {
  const parsed = new URL(raw.trim())
  return {
    server: `${parsed.protocol}//${parsed.host}`,
    username: parsed.username || undefined,
    password: parsed.password || undefined,
  }
}

/**
 * Pick a random proxy from the PROXIES environment variable.
 * Returns undefined (= direct connection) when no proxies are configured.
 */
export function pickProxy(): ProxyConfig | undefined {
  const list = process.env.PROXIES
    ?.split(',')
    .map(p => p.trim())
    .filter(Boolean) ?? []

  if (list.length === 0) return undefined

  const chosen = list[Math.floor(Math.random() * list.length)]
  try {
    return parseProxy(chosen)
  } catch (err) {
    console.warn(`⚠  Invalid proxy URL ignored: "${chosen}" — ${(err as Error).message}`)
    return undefined
  }
}
