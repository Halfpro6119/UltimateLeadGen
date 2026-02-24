-- Add build log entries to website_build_jobs for persistence across sessions.
-- Apply in Supabase Dashboard → SQL Editor.

ALTER TABLE public.website_build_jobs
ADD COLUMN IF NOT EXISTS log_entries JSONB NOT NULL DEFAULT '[]';

COMMENT ON COLUMN public.website_build_jobs.log_entries IS 'Array of log lines (strings) for build progress display.';
