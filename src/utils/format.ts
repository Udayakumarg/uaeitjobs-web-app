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
