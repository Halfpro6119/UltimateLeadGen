/**
 * Vercel API helpers for website builder: find deployment by branch, assign clean alias.
 */

const VERCEL_API = 'https://api.vercel.com'

export type VercelDeployment = {
  uid: string
  state?: string
  readyState?: string
  url?: string | null
  target?: string
}

type ListDeploymentsResponse = {
  deployments?: VercelDeployment[]
}

/**
 * Find the most recent READY deployment for the given project and branch.
 * Returns deployment id (uid) or null.
 */
export async function findReadyDeploymentByBranch(
  token: string,
  projectId: string,
  branchName: string,
  teamId?: string
): Promise<{ uid: string; url: string } | null> {
  const params = new URLSearchParams({
    projectId,
    target: 'preview',
    state: 'READY',
    branch: branchName,
    limit: '1',
  })
  if (teamId) params.set('teamId', teamId)

  const res = await fetch(`${VERCEL_API}/v6/deployments?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) return null

  const data = (await res.json()) as ListDeploymentsResponse
  const deployment = data.deployments?.[0]
  if (!deployment?.uid || deployment.readyState !== 'READY') return null

  const url = deployment.url ? `https://${deployment.url}` : null
  if (!url) return null

  return { uid: deployment.uid, url }
}

/**
 * Assign a vercel.app alias to a deployment (e.g. acme-roofing-abc123.vercel.app).
 */
export async function assignAlias(
  token: string,
  deploymentId: string,
  alias: string,
  teamId?: string
): Promise<{ alias: string; error?: string }> {
  const q = teamId ? `?teamId=${encodeURIComponent(teamId)}` : ''
  const res = await fetch(`${VERCEL_API}/v2/deployments/${deploymentId}/aliases${q}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ alias }),
  })

  if (!res.ok) {
    const text = await res.text()
    return { alias, error: `${res.status} ${text}` }
  }

  const data = (await res.json()) as { alias?: string }
  return { alias: data.alias ?? alias }
}
