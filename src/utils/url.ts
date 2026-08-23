/**
 * True only for http/https URLs. Scraped and HR-supplied URLs (applyUrl,
 * careersUrl, websiteUrl) render straight into `href` attributes elsewhere
 * in the app — `new URL()` happily parses a `javascript:` URL as "valid",
 * and React only warns (doesn't block) rendering one into href, so anything
 * accepted here needs to be checked before it reaches an anchor tag.
 */
export function isSafeUrl(url: string | null | undefined): url is string {
  if (!url) return false
  try {
    const protocol = new URL(url).protocol
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}
