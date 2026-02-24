'use client'

/**
 * Auto Website Creator
 * Look up a lead from lindy_business_research by email or website,
 * edit fields (summary, pain points, site issues), then build & deploy
 * via Cursor Cloud Agent → GitHub branch → Vercel.
 */

import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sidebar } from '@/components/layout/Sidebar'
import { Search, Loader2, Save, Rocket, ExternalLink, CheckCircle, XCircle } from 'lucide-react'

type Lead = {
  id: string
  account_name: string | null
  account_website: string | null
  contact_email: string | null
  contact_name: string | null
  business_summary: string | null
  pain_points: string | null
  site_issues: string | null
  industry: string | null
  google_rating: string | null
}

type BuildStatus = 'idle' | 'pending' | 'building' | 'deployed' | 'failed'

export default function AutoWebsiteCreatorPage() {
  const [lookupInput, setLookupInput] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)

  const [lead, setLead] = useState<Lead | null>(null)
  const [form, setForm] = useState<Partial<Lead>>({})
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const [buildLoading, setBuildLoading] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [buildStatus, setBuildStatus] = useState<BuildStatus>('idle')
  const [buildError, setBuildError] = useState<string | null>(null)
  const [branchName, setBranchName] = useState<string | null>(null)
  const [repoUrl, setRepoUrl] = useState<string | null>(null)
  const [vercelUrl, setVercelUrl] = useState<string | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

  const handleLookup = async () => {
    const q = lookupInput.trim()
    if (!q) return
    setLookupLoading(true)
    setLookupError(null)
    try {
      const param = isEmail(q) ? `email=${encodeURIComponent(q)}` : `website=${encodeURIComponent(q)}`
      const res = await fetch(`/api/leads/lookup?${param}`)
      const data = await res.json()
      if (!res.ok) {
        setLookupError(data.error || 'Lookup failed')
        setLead(null)
        return
      }
      setLead(data)
      setForm({
        id: data.id,
        account_name: data.account_name,
        account_website: data.account_website,
        contact_email: data.contact_email,
        contact_name: data.contact_name,
        business_summary: data.business_summary,
        pain_points: data.pain_points,
        site_issues: data.site_issues,
        industry: data.industry,
        google_rating: data.google_rating,
      })
    } catch {
      setLookupError('Network error')
      setLead(null)
    } finally {
      setLookupLoading(false)
    }
  }

  const handleSave = async () => {
    if (!lead?.id) return
    setSaveLoading(true)
    setSaveMessage(null)
    try {
      const res = await fetch('/api/leads/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          business_summary: form.business_summary ?? undefined,
          pain_points: form.pain_points ?? undefined,
          site_issues: form.site_issues ?? undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSaveMessage('Saved.')
      } else {
        setSaveMessage(data.error || 'Save failed')
      }
    } catch {
      setSaveMessage('Network error')
    } finally {
      setSaveLoading(false)
    }
  }

  const handleBuild = async () => {
    if (!lead?.id) return
    setBuildLoading(true)
    setBuildError(null)
    setBuildStatus('idle')
    setJobId(null)
    try {
      const res = await fetch('/api/website-builder/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          business_summary: form.business_summary ?? undefined,
          pain_points: form.pain_points ?? undefined,
          site_issues: form.site_issues ?? undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setBuildError(data.error || 'Build failed')
        setBuildLoading(false)
        return
      }
      setJobId(data.jobId)
      setBranchName(data.branchName ?? null)
      setRepoUrl(data.repoUrl ?? null)
      setBuildStatus('pending')
    } catch {
      setBuildError('Network error')
    } finally {
      setBuildLoading(false)
    }
  }

  useEffect(() => {
    if (!jobId) return
    const poll = async () => {
      try {
        const res = await fetch(`/api/website-builder/status?jobId=${encodeURIComponent(jobId)}`)
        const data = await res.json()
        if (!res.ok) return
        setBuildStatus(
          data.status === 'deployed' ? 'deployed'
          : data.status === 'failed' ? 'failed'
          : data.status === 'building' ? 'building'
          : 'pending'
        )
        setVercelUrl(data.vercelUrl ?? null)
        setBuildError(data.errorMessage ?? null)
        if (data.status === 'deployed' || data.status === 'failed') {
          if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
          }
        }
      } catch {
        // ignore
      }
    }
    poll()
    pollRef.current = setInterval(poll, 4000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [jobId])

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar />

      <main className="lg:ml-64 p-4 lg:p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Auto Website Creator</h1>
          <p className="text-slate-400">
            Look up a lead, then build and deploy their site with Cursor Cloud Agent
          </p>
        </div>

        <Card className="bg-slate-900 border-slate-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">Look up lead</h2>
          <p className="text-slate-400 text-sm mb-3">
            Enter the lead&apos;s email or business website to load from lindy_business_research.
          </p>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="email@example.com or https://example.com"
              value={lookupInput}
              onChange={(e) => setLookupInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              className="max-w-md bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
            <Button
              onClick={handleLookup}
              disabled={lookupLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {lookupLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-1" />
              )}
              Look up
            </Button>
          </div>
          {lookupError && (
            <p className="text-red-400 text-sm mt-2">{lookupError}</p>
          )}
        </Card>

        {lead && (
          <Card className="bg-slate-900 border-slate-800 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Lead details</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={saveLoading}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save
              </Button>
            </div>
            {saveMessage && (
              <p className={`text-sm mb-3 ${saveMessage === 'Saved.' ? 'text-green-400' : 'text-red-400'}`}>
                {saveMessage}
              </p>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-300">Business name</Label>
                <Input
                  value={form.account_name ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value }))}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Business website</Label>
                <Input
                  value={form.account_website ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, account_website: e.target.value }))}
                  placeholder="https://"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Contact email</Label>
                <Input
                  value={form.contact_email ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Contact name</Label>
                <Input
                  value={form.contact_name ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label className="text-slate-300">Summary of the business</Label>
              <Textarea
                value={form.business_summary ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, business_summary: e.target.value }))}
                rows={3}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="mt-4 space-y-2">
              <Label className="text-slate-300">Pain points</Label>
              <Textarea
                value={form.pain_points ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, pain_points: e.target.value }))}
                rows={2}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="mt-4 space-y-2">
              <Label className="text-slate-300">Current site issues</Label>
              <Textarea
                value={form.site_issues ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, site_issues: e.target.value }))}
                rows={2}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700">
              <Button
                onClick={handleBuild}
                disabled={buildLoading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {buildLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Rocket className="h-4 w-4 mr-2" />
                )}
                Build & Deploy website
              </Button>

              {buildError && buildStatus === 'failed' && (
                <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                  <XCircle className="h-4 w-4 shrink-0" /> {buildError}
                </p>
              )}

              {(buildStatus === 'pending' || buildStatus === 'building') && (
                <p className="text-slate-400 text-sm mt-2 flex items-center gap-1">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  Cursor agent is building the site…
                </p>
              )}

              {buildStatus === 'deployed' && (
                <p className="text-green-400 text-sm mt-2 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 shrink-0" /> Build complete.
                </p>
              )}

              {branchName && repoUrl && (
                <p className="text-slate-400 text-sm mt-2">
                  Branch:{' '}
                  <a
                    href={`${repoUrl.replace(/\.git$/, '')}/tree/${branchName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    {branchName} <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              )}
              {vercelUrl && (
                <p className="text-slate-400 text-sm mt-1">
                  Live site:{' '}
                  <a
                    href={vercelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    {vercelUrl} <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              )}
            </div>
          </Card>
        )}

        {!lead && !lookupLoading && (
          <Card className="bg-slate-900 border-slate-800 p-8 text-center">
            <p className="text-slate-400">
              Enter an email or website above to load a lead from lindy_business_research, then build and deploy their site with one click.
            </p>
          </Card>
        )}
      </main>
    </div>
  )
}
