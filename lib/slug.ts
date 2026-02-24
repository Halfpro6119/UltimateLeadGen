/**
 * Sanitize a business name into a clean slug for GitHub branch names and Vercel subdomains.
 * Used for: build/{slug} (branch) and {slug}.vercel.app (alias).
 */
const MAX_SLUG_LENGTH = 40

export function sanitizeSlug(name: string | null | undefined): string {
  if (name == null || String(name).trim() === '') return 'business'
  let s = String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (s.length > MAX_SLUG_LENGTH) s = s.slice(0, MAX_SLUG_LENGTH).replace(/-$/, '')
  return s || 'business'
}

/**
 * Clean branch name: build/{slug} (business name only)
 */
export function cleanBranchName(accountName: string | null | undefined): string {
  const slug = sanitizeSlug(accountName)
  return `build/${slug}`
}

/**
 * Slug for Vercel alias only: no hyphens (e.g. americanpestcontrol).
 * Subdomains are typically [a-z0-9]; we strip spaces and hyphens for a clean URL.
 */
const MAX_VERCEL_ALIAS_LENGTH = 40

export function vercelAliasSlug(name: string | null | undefined): string {
  if (name == null || String(name).trim() === '') return 'business'
  let s = String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  if (s.length > MAX_VERCEL_ALIAS_LENGTH) s = s.slice(0, MAX_VERCEL_ALIAS_LENGTH)
  return s || 'business'
}

/**
 * Clean Vercel alias (subdomain): {slug}.vercel.app (business name, no hyphens)
 */
export function cleanVercelAlias(accountName: string | null | undefined): string {
  const slug = vercelAliasSlug(accountName)
  return `${slug}.vercel.app`
}
