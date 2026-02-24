/**
 * API Route: Cancel GitHub Actions Scraper Run
 *
 * POST /api/cancel-scraper
 * Body: { workflowId: string }  — GitHub Actions run id
 * Response: { success: boolean, message: string } or error
 */

import { NextRequest, NextResponse } from 'next/server'

const OWNER = 'rileywebboost-afk'
const REPO = 'UltimateLeadGen'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const workflowId = body?.workflowId ?? body?.runId

    if (!workflowId || typeof workflowId !== 'string') {
      return NextResponse.json(
        { error: 'workflowId is required' },
        { status: 400 }
      )
    }

    if (workflowId === 'unknown') {
      return NextResponse.json(
        { error: 'Run ID not available yet. Try again in a few seconds or refresh.' },
        { status: 400 }
      )
    }

    const githubToken = process.env.GH_TOKEN
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token not configured' },
        { status: 500 }
      )
    }

    const response = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/actions/runs/${workflowId}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error('GitHub cancel API error:', response.status, errText)
      return NextResponse.json(
        { error: 'Failed to cancel workflow' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Workflow run cancellation requested.',
    })
  } catch (error) {
    console.error('Error cancelling scraper:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
