/**
 * POST /api/website-builder/send-edit
 * Sends a follow-up message to the Cursor agent for the given job so the user can request edits.
 * Body: { jobId: string, message: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getWebsiteBuildJob } from '@/lib/supabase'

const CURSOR_API_BASE = 'https://api.cursor.com/v0'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const jobId = body.jobId as string | undefined
    const message = typeof body.message === 'string' ? body.message.trim() : ''

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing jobId in request body' },
        { status: 400 }
      )
    }
    if (!message) {
      return NextResponse.json(
        { error: 'Missing or empty message in request body' },
        { status: 400 }
      )
    }

    const job = await getWebsiteBuildJob(jobId)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    if (!job.cursor_agent_id) {
      return NextResponse.json(
        { error: 'No Cursor agent linked to this job; cannot send edit.' },
        { status: 400 }
      )
    }

    const cursorApiKey = process.env.CURSOR_API_KEY
    if (!cursorApiKey) {
      return NextResponse.json(
        { error: 'Cursor API key not configured (CURSOR_API_KEY)' },
        { status: 500 }
      )
    }

    const followRes = await fetch(
      `${CURSOR_API_BASE}/agents/${job.cursor_agent_id}/followup`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cursorApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: { text: message } }),
      }
    )

    if (!followRes.ok) {
      const errText = await followRes.text()
      console.error('Cursor followup error:', followRes.status, errText)
      return NextResponse.json(
        { error: 'Failed to send message to agent', details: errText },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Edit request sent. The agent will apply changes and push to the branch.',
    })
  } catch (error) {
    console.error('Error in website-builder/send-edit:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
