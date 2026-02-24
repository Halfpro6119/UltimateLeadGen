/**
 * POST /api/webhooks/cursor-agent
 * Receives Cursor Cloud Agent status change events (e.g. FINISHED, ERROR).
 * Updates website_build_jobs by matching cursor_agent_id from the payload.
 * Optional: set CURSOR_WEBHOOK_SECRET and pass it when registering the webhook for HMAC verification.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

type CursorWebhookPayload = {
  event?: string
  agent_id?: string
  status?: string
  repository?: string
  branch?: string
  summary?: string
  vercel_url?: string | null
  deployment_url?: string | null
  error_message?: string | null
  [key: string]: unknown
}

/**
 * Find job by cursor_agent_id and update status.
 */
async function updateJobByAgentId(
  agentId: string,
  status: 'deployed' | 'failed',
  errorMessage: string | null,
  vercelUrl: string | null
) {
  const { data: jobs } = await supabase
    .from('website_build_jobs')
    .select('id')
    .eq('cursor_agent_id', agentId)
    .limit(1)

  if (!jobs?.length) return
  const jobId = (jobs[0] as { id: string }).id

  await supabase
    .from('website_build_jobs')
    .update({
      status,
      error_message: errorMessage,
      vercel_url: vercelUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-webhook-signature') ?? request.headers.get('X-Webhook-Signature')
    const secret = process.env.CURSOR_WEBHOOK_SECRET

    if (secret && signature) {
      const crypto = await import('crypto')
      const expectedHex = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex')
      const provided = signature.replace(/^v1=/, '').trim()
      if (provided.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(provided)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
      const expectedBuf = Buffer.from(expectedHex, 'hex')
      const providedBuf = Buffer.from(provided, 'hex')
      if (expectedBuf.length !== 32 || providedBuf.length !== 32 || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload = JSON.parse(rawBody) as CursorWebhookPayload
    const event = payload.event ?? payload.event_type
    if (event !== 'statusChange') {
      return NextResponse.json({ received: true })
    }

    const agentIdRaw = payload.agent_id ?? payload.agentId
    const agentId = typeof agentIdRaw === 'string' ? agentIdRaw : null
    const status = payload.status

    if (!agentId) {
      return NextResponse.json({ received: true })
    }

    const isFinished = status === 'FINISHED' || status === 'finished'
    const isError = status === 'ERROR' || status === 'error' || status === 'failed'
    const rawError = payload.summary ?? payload.error_message ?? 'Agent failed'
    const errorMessage: string | null = isError ? (typeof rawError === 'string' ? rawError : JSON.stringify(rawError)) : null
    let vercelUrl: string | null = null
    if (typeof payload.vercel_url === 'string') vercelUrl = payload.vercel_url
    else if (typeof payload.deployment_url === 'string') vercelUrl = payload.deployment_url

    if (isFinished) {
      await updateJobByAgentId(agentId, 'deployed', null, vercelUrl)
    } else if (isError) {
      await updateJobByAgentId(agentId, 'failed', errorMessage, vercelUrl)
    }

    return NextResponse.json({ received: true })
  } catch (e) {
    console.error('Cursor webhook error:', e)
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}
