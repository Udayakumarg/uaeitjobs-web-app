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

export function relativeTime(value?: string | null) {
  if (!value) return ''
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return ''
  const diff = (Date.now() - then) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`
  return `${Math.floor(diff / 2592000)}mo ago`
}

export function initials(name?: string | null) {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Compresses an image file to a square JPEG thumbnail suitable for avatars.
 * Output is a base64 data-URL string (data:image/jpeg;base64,...).
 *
 * Algorithm:
 *  1. Draw the image onto an offscreen canvas at SIZE × SIZE px (center-cropped).
 *  2. Export as JPEG at QUALITY (0–1). Typical output: 2–6 KB for an 80×80 face.
 */
export async function compressAvatar(file: File, size = 80, quality = 0.65): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas 2D context unavailable')

        // Center-crop: take the largest centered square from the source image
        const srcMin = Math.min(img.naturalWidth, img.naturalHeight)
        const sx = (img.naturalWidth - srcMin) / 2
        const sy = (img.naturalHeight - srcMin) / 2

        ctx.drawImage(img, sx, sy, srcMin, srcMin, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch (err) {
        reject(err)
      } finally {
        URL.revokeObjectURL(objectUrl)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Image could not be loaded'))
    }

    img.src = objectUrl
  })
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

/** Below this many characters of readable text, a description is a title/one-liner rather than a real posting. */
const THIN_DESCRIPTION_CHARS = 300

export function isThinDescription(job: { descriptionHtml?: string | null; description?: string | null }) {
  const source = job.descriptionHtml?.trim() ? job.descriptionHtml.replace(/<[^>]+>/g, ' ') : (job.description ?? '')
  return source.replace(/\s+/g, ' ').trim().length < THIN_DESCRIPTION_CHARS
}

const EXPERIENCE_LABELS: Record<string, string> = {
  fresher: 'Entry level',
  junior_1_2_yrs: 'Junior · 1–2 yrs',
  mid_3_5_yrs: 'Mid-level · 3–5 yrs',
  senior_5_plus: 'Senior · 5+ yrs',
}

/** "mid_3_5_yrs" -> "Mid-level · 3–5 yrs" (falls back to a tidy version of unknown codes). */
export function experienceLabel(level?: string | null) {
  if (!level) return ''
  return EXPERIENCE_LABELS[level] ?? labelize(level)
}

/**
 * Cleans the location strings job sources send, e.g.
 *   "Abu Dhabi, Abu Dhabi Emirate, AE"            -> "Abu Dhabi"
 *   "Dubai - United Arab Emirates (UAE)"          -> "Dubai"
 *   "United Arab Emirates, AE"                    -> "UAE"
 *   "Remote (UAE-friendly)"                       -> "Remote · UAE-friendly"
 *   "Abu Dhabi , Ajman , Al Ain - United Arab …"  -> "Abu Dhabi, Ajman +1"
 */
export function locationLabel(raw?: string | null): string {
  if (!raw) return ''
  let s = raw.replace(/\s+/g, ' ').trim()

  const remote = /^remote\s*(?:in\s+)?(?:\((.*?)\)|(.*))$/i.exec(s)
  if (remote) {
    const where = locationLabel((remote[1] ?? remote[2] ?? '').trim())
    return where ? `Remote · ${where}` : 'Remote'
  }

  s = s
    .replace(/\s*-\s*United Arab Emirates(?:\s*\(UAE\))?$/i, '')
    .replace(/,\s*AE$/i, '')
    .replace(/,\s*(?:Abu Dhabi|Dubai|Sharjah|Ajman|Ras Al[ -]?Khaimah|Fujairah|Umm Al[ -]?Quwain)\s+Emirate$/i, '')
    .replace(/\s+Emirate$/i, '')
    .replace(/^United Arab Emirates$/i, 'UAE')
    .trim()

  const parts = s.split(/\s*,\s*/).filter(Boolean)
  if (parts.length > 2) return `${parts.slice(0, 2).join(', ')} +${parts.length - 2}`
  return parts.join(', ')
}
