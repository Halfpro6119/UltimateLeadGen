/**
 * GET /api/website-builder/jobs?limit=20
 * Returns a list of past website build jobs with account name for display.
 */

import { NextRequest, NextResponse } from 'next/server'
import { listWebsiteBuildJobs } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 100)

    const jobs = await listWebsiteBuildJobs(limit)
    if (jobs.length === 0) {
      return NextResponse.json({ jobs: [] })
    }

    const leadIds = [...new Set(jobs.map((j) => j.lead_id))]
    const { data: leads } = await supabase
      .from('lindy_business_research')
      .select('new_primary_key, account_name')
      .in('new_primary_key', leadIds)

    const nameByLeadId = new Map<string, string | null>()
    for (const row of leads ?? []) {
      const r = row as { new_primary_key: string; account_name: string | null }
      nameByLeadId.set(r.new_primary_key, r.account_name)
    }

    const jobsWithNames = jobs.map((j) => ({
      id: j.id,
      leadId: j.lead_id,
      status: j.status,
      vercelUrl: j.vercel_url,
      branchName: j.branch_name,
      repoUrl: j.repo_url,
      createdAt: j.created_at,
      accountName: nameByLeadId.get(j.lead_id) ?? null,
    }))

    return NextResponse.json({ jobs: jobsWithNames })
  } catch (error) {
    console.error('Error in website-builder/jobs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
