-- =====================================================================
-- Website Build Jobs Table (Supabase SQL)
-- =====================================================================
-- Purpose: Track Cursor Cloud Agent website builds (status, branch, Vercel URL).
-- Apply in Supabase Dashboard → SQL Editor.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.website_build_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.lindy_business_research(new_primary_key) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'building' | 'deployed' | 'failed'
  cursor_agent_id TEXT,
  branch_name TEXT,
  repo_url TEXT,
  vercel_url TEXT,
  error_message TEXT,
  log_entries JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_website_build_jobs_lead_id ON public.website_build_jobs (lead_id);
CREATE INDEX IF NOT EXISTS idx_website_build_jobs_status ON public.website_build_jobs (status);
CREATE INDEX IF NOT EXISTS idx_website_build_jobs_created_at ON public.website_build_jobs (created_at DESC);

COMMENT ON TABLE public.website_build_jobs IS 'Tracks Auto Website Builder jobs (Cursor Cloud Agent + GitHub + Vercel).';
