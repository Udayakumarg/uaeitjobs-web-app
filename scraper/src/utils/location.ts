/**
 * Map free-text location onto the backend's emirate enum.
 *
 * Hyphens are normalised first because some sources write the multi-word
 * emirates as "Ras al-Khaimah" — matching against spaced names alone
 * silently fails. The multi-word names are tested before the single-word
 * ones so that "Umm Al Quwain" cannot be short-circuited by a substring
 * match on a shorter name.
 *
 * Previously duplicated (without the hyphen fix) in bayt.ts, naukrigulf.ts,
 * gulftalent.ts, and indeed.ts — each carried its own copy that silently
 * dropped hyphenated emirate names from every non-LinkedIn source.
 */
export function inferEmirate(text: string): string | undefined {
  const t = (text ?? '').toLowerCase().replace(/-/g, ' ')
  if (t.includes('abu dhabi')) return 'abu_dhabi'
  if (t.includes('ras al khaimah')) return 'ras_al_khaimah'
  if (t.includes('umm al quwain')) return 'umm_al_quwain'
  if (t.includes('dubai')) return 'dubai'
  if (t.includes('sharjah')) return 'sharjah'
  if (t.includes('ajman')) return 'ajman'
  if (t.includes('fujairah')) return 'fujairah'
  if (t.includes('al ain')) return 'abu_dhabi'
  return undefined
}
