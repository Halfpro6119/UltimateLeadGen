/**
 * PATCH /api/leads/update
 * Update website-builder fields on lindy_business_research.
 * Body: { leadId: string, business_summary?: string, pain_points?: string, site_issues?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { updateLeadWebsiteBuilder } from '@/lib/supabase'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const leadId = body.leadId as string | undefined
    if (!leadId) {
      return NextResponse.json(
        { error: 'Missing leadId in request body' },
        { status: 400 }
      )
    }

    const result = await updateLeadWebsiteBuilder(leadId, {
      business_summary: body.business_summary,
      pain_points: body.pain_points,
      site_issues: body.site_issues,
    })

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in leads/update:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
