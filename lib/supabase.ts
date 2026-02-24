/**
 * Supabase Client Module
 * Handles database operations and authentication
 */

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Check which searches already exist in the database
 * Batches requests in chunks of 100 to respect Supabase limits
 * @param searches - Array of search strings to check
 * @returns Set of existing search strings
 */
export async function checkExistingSearches(searches: string[]): Promise<Set<string>> {
  const existing = new Set<string>()

  // Batch in chunks of 100 (Supabase limit)
  for (let i = 0; i < searches.length; i += 100) {
    const chunk = searches.slice(i, i + 100)
    const { data, error } = await supabase
      .from('Google_Maps Searches')
      .select('Searches')
      .in('Searches', chunk)

    if (error) {
      console.error('Error checking existing searches:', error)
      throw error
    }

    // Add all existing searches to the set
    data?.forEach((row: { Searches: string }) => existing.add(row.Searches))
  }

  return existing
}

/**
 * Insert new searches into Supabase
 * Uses upsert to handle duplicates gracefully
 * @param searches - Array of search strings to insert
 * @returns Object with insert statistics
 */
export async function insertSearches(searches: string[]): Promise<{
  inserted: number
  skipped: number
  errors: string[]
}> {
  if (searches.length === 0) {
    return { inserted: 0, skipped: 0, errors: [] }
  }

  // Prepare rows for insertion
  const rows = searches.map((search) => ({
    Searches: search,
    searchUSED: false,
  }))

  // Use upsert to handle conflicts (duplicate searches)
  const { error, data } = await supabase
    .from('Google_Maps Searches')
    .upsert(rows, { onConflict: 'Searches' })
    .select()

  if (error) {
    console.error('Error inserting searches:', error)
    return {
      inserted: 0,
      skipped: searches.length,
      errors: [error.message],
    }
  }

  return {
    inserted: data?.length || searches.length,
    skipped: 0,
    errors: [],
  }
}

/**
 * Get total count of searches in database
 * @returns Total number of searches
 */
export async function getTotalSearchesCount(): Promise<number> {
  const { count, error } = await supabase
    .from('Google_Maps Searches')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error('Error getting search count:', error)
    return 0
  }

  return count || 0
}

/**
 * Get count of unused searches (searchUSED = false)
 * @returns Number of unused searches
 */
export async function getUnusedSearchesCount(): Promise<number> {
  const { count, error } = await supabase
    .from('Google_Maps Searches')
    .select('*', { count: 'exact', head: true })
    .eq('searchUSED', false)

  if (error) {
    console.error('Error getting unused search count:', error)
    return 0
  }

  return count || 0
}

// ---------------------------------------------------------------------------
// lindy_business_research (Auto Website Builder lead source)
// ---------------------------------------------------------------------------

export type LindyLeadRow = {
  new_primary_key: string
  account_name: string | null
  account_website: string | null
  business_summary: string | null
  pain_points: string | null
  site_issues: string | null
  contact_email: string | null
  contact_name: string | null
  industry: string | null
  google_rating: string | null
  [key: string]: unknown
}

/** Normalize URL for lookup: trim, lowercase, ensure scheme for host extraction */
function normalizeWebsiteForLookup(input: string): string {
  let s = input.trim().toLowerCase()
  if (!s) return s
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s
  try {
    const u = new URL(s)
    return (u.origin + u.pathname).replace(/\/$/, '') || u.origin
  } catch {
    return input.trim().toLowerCase()
  }
}

/**
 * Get a lead from lindy_business_research by primary key.
 */
export async function getLeadById(leadId: string): Promise<LindyLeadRow | null> {
  const { data, error } = await supabase
    .from('lindy_business_research')
    .select('*')
    .eq('new_primary_key', leadId)
    .maybeSingle()
  if (error) {
    console.error('Error getLeadById:', error)
    return null
  }
  return data as LindyLeadRow | null
}

/**
 * Get a lead from lindy_business_research by contact email (case-insensitive trim).
 */
export async function getLeadByEmail(email: string): Promise<LindyLeadRow | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null
  const { data, error } = await supabase
    .from('lindy_business_research')
    .select('*')
    .ilike('contact_email', normalized)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error getLeadByEmail:', error)
    return null
  }
  return data as LindyLeadRow | null
}

/**
 * Get a lead from lindy_business_research by account website (normalized URL).
 */
export async function getLeadByWebsite(website: string): Promise<LindyLeadRow | null> {
  const normalized = normalizeWebsiteForLookup(website)
  if (!normalized) return null

  const { data, error } = await supabase
    .from('lindy_business_research')
    .select('*')
    .not('account_website', 'is', null)

  if (error) {
    console.error('Error getLeadByWebsite:', error)
    return null
  }

  const row = (data as { account_website: string | null }[] | null)?.find((r) => {
    if (!r.account_website) return false
    return normalizeWebsiteForLookup(r.account_website) === normalized
  })
  return (row as LindyLeadRow) ?? null
}

/**
 * Update website-builder fields on lindy_business_research (optional save from form).
 */
export async function updateLeadWebsiteBuilder(
  leadId: string,
  updates: { business_summary?: string; pain_points?: string; site_issues?: string }
): Promise<{ error: string | null }> {
  const payload: Record<string, string> = {}
  if (updates.business_summary !== undefined) payload.business_summary = updates.business_summary
  if (updates.pain_points !== undefined) payload.pain_points = updates.pain_points
  if (updates.site_issues !== undefined) payload.site_issues = updates.site_issues
  if (Object.keys(payload).length === 0) return { error: null }

  const { error } = await supabase
    .from('lindy_business_research')
    .update(payload)
    .eq('new_primary_key', leadId)

  if (error) {
    console.error('Error updateLeadWebsiteBuilder:', error)
    return { error: error.message }
  }
  return { error: null }
}

// ---------------------------------------------------------------------------
// website_build_jobs (Cursor agent build status)
// ---------------------------------------------------------------------------

export type WebsiteBuildJobRow = {
  id: string
  lead_id: string
  status: 'pending' | 'building' | 'deployed' | 'failed'
  cursor_agent_id: string | null
  branch_name: string | null
  repo_url: string | null
  vercel_url: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

/**
 * Create a website build job and return its id.
 */
export async function createWebsiteBuildJob(leadId: string, branchName: string, repoUrl: string): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase
    .from('website_build_jobs')
    .insert({
      lead_id: leadId,
      status: 'pending',
      branch_name: branchName,
      repo_url: repoUrl,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error createWebsiteBuildJob:', error)
    return { error: error.message }
  }
  return { id: (data as { id: string }).id }
}

/**
 * Update build job with Cursor agent id and/or status.
 */
export async function updateWebsiteBuildJob(
  jobId: string,
  updates: {
    cursor_agent_id?: string
    status?: WebsiteBuildJobRow['status']
    vercel_url?: string | null
    error_message?: string | null
  }
): Promise<{ error: string | null }> {
  const payload: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() }
  const { error } = await supabase.from('website_build_jobs').update(payload).eq('id', jobId)
  if (error) {
    console.error('Error updateWebsiteBuildJob:', error)
    return { error: error.message }
  }
  return { error: null }
}

/**
 * Get a website build job by id.
 */
export async function getWebsiteBuildJob(jobId: string): Promise<WebsiteBuildJobRow | null> {
  const { data, error } = await supabase
    .from('website_build_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle()
  if (error) {
    console.error('Error getWebsiteBuildJob:', error)
    return null
  }
  return data as WebsiteBuildJobRow | null
}

/**
 * List website build jobs, most recent first.
 */
export async function listWebsiteBuildJobs(limit = 50): Promise<WebsiteBuildJobRow[]> {
  const { data, error } = await supabase
    .from('website_build_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('Error listWebsiteBuildJobs:', error)
    return []
  }
  return (data as WebsiteBuildJobRow[]) ?? []
}
