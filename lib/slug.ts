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
 * Clean Vercel alias (subdomain): {slug}.vercel.app (business name only)
 */
export function cleanVercelAlias(accountName: string | null | undefined): string {
  const slug = sanitizeSlug(accountName)
  return `${slug}.vercel.app`
}
