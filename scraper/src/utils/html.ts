/**
 * Converts an HTML fragment into flat text with block-level boundaries
 * preserved as newlines, instead of squashing headings directly against
 * the text that follows them.
 *
 * The description-formatter pipeline downstream (LlmDescriptionFormatter)
 * expects flat text with section headers on their own line-ish boundary —
 * its own system prompt describes the failure mode this avoids: "section
 * headers... jammed inline against the previous sentence" is exactly what
 * a naive tag-strip produces. Same fix already applied on the backend side
 * in HimalayasSource.sanitize() for the same reason.
 */
export function blockHtmlToText(html: string | null | undefined): string {
  if (!html) return ''
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|div|h[1-6])>/gi, '\n')
  const withoutTags = withBreaks.replace(/<[^>]+>/g, '')
  const decoded = withoutTags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
  return decoded
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
