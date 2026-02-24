/**
 * POST /api/website-builder/build
 * Creates a GitHub branch for the lead, launches a Cursor Cloud Agent to build the site,
 * and records the job in website_build_jobs.
 * Body: { leadId: string } (optional overrides for prompt: business_summary?, pain_points?, site_issues?)
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getLeadById,
  createWebsiteBuildJob,
  updateWebsiteBuildJob,
} from '@/lib/supabase'
import { cleanBranchName } from '@/lib/slug'

const CURSOR_API_BASE = 'https://api.cursor.com/v0'

function buildPrompt(lead: {
  account_name: string | null
  account_website: string | null
  business_summary: string | null
  pain_points: string | null
  site_issues: string | null
  industry: string | null
  contact_name: string | null
}): string {
  const name = lead.account_name || 'Unknown business'
  const summary = lead.business_summary || '(No summary provided)'
  const painPoints = lead.pain_points || '(None specified)'
  const siteIssues = lead.site_issues || '(None specified)'
  const industry = lead.industry ? `Industry: ${lead.industry}.` : ''
  const website = lead.account_website ? `Current website: ${lead.account_website}.` : ''

  return `Build a small, production-ready business website for the following client.

Business name: ${name}
${website}
${industry}

Summary of the business:
${summary}

Pain points to address:
${painPoints}

Current site issues (fix or avoid these):
${siteIssues}

Requirements:
- Use the existing project structure in this repository. If the repo is empty or has a template, create a clean static site or simple framework (e.g. Next.js, Vite, or plain HTML/CSS/JS).
- Find and add the business's actual logo: look on their current website or their social media profiles (e.g. Facebook, LinkedIn) and use the real logo, not a placeholder.
- Find and use their real reviews: pull genuine testimonials or star ratings from their website, Google, or social profiles—do not invent reviews.
- Find and use their real images for the gallery: source actual photos from their website or social media (team, work, premises, services) for any gallery or image sections—no stock placeholders.
- Make the site professional, fast, and mobile-friendly.
- Address the pain points and site issues above where relevant.
- Ensure the site is production-ready: valid markup, optimized assets, no broken links or placeholder content, and ready to go live.
- Commit all changes to this branch. Do not create a new branch.`
}

/**
 * Create a new branch from the default branch using GitHub API.
 */
async function createBranch(
  githubToken: string,
  repo: string,
  newBranchName: string
): Promise<{ error?: string }> {
  const [owner, repoName] = repo.split('/').filter(Boolean)
  if (!owner || !repoName) {
    return { error: 'Invalid WEBSITE_BUILDER_REPO format; use owner/repo' }
  }

  const repoUrl = `https://api.github.com/repos/${owner}/${repoName}`

  const repoRes = await fetch(repoUrl, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  })
  if (!repoRes.ok) {
    const t = await repoRes.text()
    return { error: `GitHub repo fetch failed: ${repoRes.status} ${t}` }
  }
  const repoData = (await repoRes.json()) as { default_branch: string }
  const defaultBranch = repoData.default_branch || 'main'

  const refRes = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/git/ref/heads/${defaultBranch}`,
    {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  )
  if (!refRes.ok) {
    const t = await refRes.text()
    return { error: `GitHub ref fetch failed: ${refRes.status} ${t}` }
  }
  const refData = (await refRes.json()) as { object: { sha: string } }
  const sha = refData.object.sha

  const createRefRes = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/git/refs`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: `refs/heads/${newBranchName}`,
        sha,
      }),
    }
  )
  if (!createRefRes.ok) {
    const t = await createRefRes.text()
    return { error: `GitHub create branch failed: ${createRefRes.status} ${t}` }
  }
  return {}
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const leadId = body.leadId as string | undefined
    if (!leadId) {
      return NextResponse.json(
        { error: 'Missing leadId in request body' },
        { status: 400 }
      )
    }

    const githubToken = process.env.GH_TOKEN
    const cursorApiKey = process.env.CURSOR_API_KEY
    const repo = process.env.WEBSITE_BUILDER_REPO

    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token not configured (GH_TOKEN)' },
        { status: 500 }
      )
    }
    if (!cursorApiKey) {
      return NextResponse.json(
        { error: 'Cursor API key not configured (CURSOR_API_KEY)' },
        { status: 500 }
      )
    }
    if (!repo) {
      return NextResponse.json(
        { error: 'Website builder repo not configured (WEBSITE_BUILDER_REPO)' },
        { status: 500 }
      )
    }

    const lead = await getLeadById(leadId)
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const branchName = cleanBranchName(lead.account_name)
    const repoFullUrl = repo.includes('github.com')
      ? repo
      : `https://github.com/${repo}`

    const createJobResult = await createWebsiteBuildJob(leadId, branchName, repoFullUrl)
    if ('error' in createJobResult) {
      return NextResponse.json(
        { error: 'Failed to create build job: ' + createJobResult.error },
        { status: 500 }
      )
    }
    const jobId = createJobResult.id

    const branchErr = await createBranch(githubToken, repo, branchName)
    if (branchErr.error) {
      await updateWebsiteBuildJob(jobId, {
        status: 'failed',
        error_message: branchErr.error,
      })
      return NextResponse.json(
        { error: branchErr.error },
        { status: 502 }
      )
    }

    const promptOverrides = {
      business_summary: body.business_summary as string | undefined,
      pain_points: body.pain_points as string | undefined,
      site_issues: body.site_issues as string | undefined,
    }
    const promptLead = {
      ...lead,
      ...(promptOverrides.business_summary !== undefined && {
        business_summary: promptOverrides.business_summary,
      }),
      ...(promptOverrides.pain_points !== undefined && {
        pain_points: promptOverrides.pain_points,
      }),
      ...(promptOverrides.site_issues !== undefined && {
        site_issues: promptOverrides.site_issues,
      }),
    }
    const promptText = buildPrompt(promptLead)

    const cursorRes = await fetch(`${CURSOR_API_BASE}/agents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cursorApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: { text: promptText },
        source: {
          repository: repoFullUrl,
          ref: branchName,
        },
      }),
    })

    if (!cursorRes.ok) {
      const errText = await cursorRes.text()
      await updateWebsiteBuildJob(jobId, {
        status: 'failed',
        error_message: `Cursor API error: ${cursorRes.status} ${errText}`,
      })
      return NextResponse.json(
        { error: 'Failed to launch Cursor agent', details: errText },
        { status: 502 }
      )
    }

    const cursorData = (await cursorRes.json()) as { id?: string; agent_id?: string }
    const agentId = cursorData.id ?? cursorData.agent_id ?? null
    if (agentId) {
      await updateWebsiteBuildJob(jobId, {
        cursor_agent_id: agentId,
        status: 'building',
      })
    }

    return NextResponse.json({
      success: true,
      jobId,
      branchName,
      repoUrl: repoFullUrl,
      cursorAgentId: agentId,
      message: 'Build started. Cursor agent is generating the website.',
    })
  } catch (error) {
    console.error('Error in website-builder/build:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
