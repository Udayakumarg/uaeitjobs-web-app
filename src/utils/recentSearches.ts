/**
 * Recent searches — stored in localStorage so unauthenticated visitors
 * still get a personalised recall experience. Keeps the last N unique
 * non-empty queries, most recent first.
 */
const KEY = 'uaeitjobs.recentSearches.v1'
const MAX_ITEMS = 6

export function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : []
  } catch {
    return []
  }
}

export function addRecentSearch(query: string) {
  if (typeof window === 'undefined') return
  const trimmed = query.trim()
  if (!trimmed) return
  const existing = getRecentSearches().filter(
    (value) => value.toLowerCase() !== trimmed.toLowerCase(),
  )
  const next = [trimmed, ...existing].slice(0, MAX_ITEMS)
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage full / disabled — ignore */
  }
}

export function removeRecentSearch(query: string) {
  if (typeof window === 'undefined') return
  const next = getRecentSearches().filter(
    (value) => value.toLowerCase() !== query.trim().toLowerCase(),
  )
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

export function clearRecentSearches() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
