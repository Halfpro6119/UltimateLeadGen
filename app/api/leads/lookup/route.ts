/**
 * GET /api/leads/lookup?email=... | ?website=...
 * Look up a lead from lindy_business_research by contact_email or account_website.
 * Returns the lead row or 404.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getLeadByEmail, getLeadByWebsite } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')?.trim() || null
    const website = searchParams.get('website')?.trim() || null

    if (email && website) {
      return NextResponse.json(
        { error: 'Provide either email or website, not both' },
        { status: 400 }
      )
    }
    if (!email && !website) {
      return NextResponse.json(
        { error: 'Provide email or website query parameter' },
        { status: 400 }
      )
    }

    const lead = email
      ? await getLeadByEmail(email)
      : await getLeadByWebsite(website!)

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: lead.new_primary_key,
      account_name: lead.account_name,
      account_website: lead.account_website,
      contact_email: lead.contact_email,
      contact_name: lead.contact_name,
      business_summary: lead.business_summary,
      pain_points: lead.pain_points,
      site_issues: lead.site_issues,
      industry: lead.industry,
      google_rating: lead.google_rating,
    })
  } catch (error) {
    console.error('Error in leads/lookup:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
