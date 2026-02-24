/**
 * GET /api/website-builder/status?jobId=...
 * Returns the current status of a website build job.
 * When status is 'building', attempts to find the Vercel deployment by branch,
 * assign a clean alias ({slug}-{shortId}.vercel.app), and update the job to 'deployed'.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getWebsiteBuildJob, getLeadById, updateWebsiteBuildJob } from '@/lib/supabase'
import { cleanVercelAlias } from '@/lib/slug'
import {
  findReadyDeploymentByBranch,
  findLatestReadyDeployment,
  assignAlias,
} from '@/lib/vercel'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing jobId query parameter' },
        { status: 400 }
      )
    }

    let job = await getWebsiteBuildJob(jobId)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const vercelToken = process.env.VERCEL_TOKEN
    const projectId = process.env.VERCEL_PROJECT_ID
    const teamId = process.env.VERCEL_TEAM_ID

    if (
      job.status === 'building' &&
      !job.vercel_url &&
      vercelToken &&
      projectId
    ) {
      let deployment = null
      if (job.branch_name) {
        deployment = await findReadyDeploymentByBranch(
          vercelToken,
          projectId,
          job.branch_name,
          teamId
        )
      }
      if (!deployment) {
        const jobCreatedMs = job.created_at ? new Date(job.created_at).getTime() : undefined
        deployment = await findLatestReadyDeployment(
          vercelToken,
          projectId,
          teamId,
          jobCreatedMs
        )
      }
      if (deployment) {
        const lead = await getLeadById(job.lead_id)
        const alias = cleanVercelAlias(lead?.account_name ?? null)
        const result = await assignAlias(
          vercelToken,
          deployment.uid,
          alias,
          teamId
        )
        const vercelUrl = result.error ? deployment.url : `https://${alias}`
        await updateWebsiteBuildJob(jobId, {
          status: result.error ? job.status : 'deployed',
          vercel_url: vercelUrl,
          ...(result.error && { error_message: result.error }),
        })
        job = await getWebsiteBuildJob(jobId) ?? job
      }
    }

    return NextResponse.json({
      jobId: job.id,
      leadId: job.lead_id,
      status: job.status,
      branchName: job.branch_name,
      repoUrl: job.repo_url,
      vercelUrl: job.vercel_url,
      errorMessage: job.error_message,
      cursorAgentId: job.cursor_agent_id,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
    })
  } catch (error) {
    console.error('Error in website-builder/status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
