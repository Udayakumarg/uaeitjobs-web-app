export function money(min?: number | null, max?: number | null, currency = 'AED') {
  if (!min && !max) return 'Salary undisclosed'
  const format = (value: number) => `${currency} ${value.toLocaleString()}`
  if (min && max) return `${format(min)} - ${format(max)}`
  return min ? `From ${format(min)}` : `Up to ${format(max as number)}`
}

export function labelize(value?: string | null) {
  if (!value) return 'Not specified'
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function dateLabel(value?: string | null) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

export function parseSkills(value?: string | string[] | null): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }
}
