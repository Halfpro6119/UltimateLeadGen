/**
 * API Route: Get Active or Latest Scraper Run
 *
 * Used when the user lands on the Auto Business Finder page (e.g. after navigating
 * away and back) so they can see the current run or the most recent run's state.
 *
 * GET /api/scraper-progress/active
 * Response: { runKey: string | null, progress: object | null, events: array }
 * - First looks for a row with status 'initializing' or 'running' (active run).
 * - If none, returns the most recent row by updated_at (last run, any status).
 * - If no rows, returns runKey: null, progress: null, events: [].
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase server credentials not configured' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1) Prefer an active run (initializing or running)
    const { data: activeRows } = await supabase
      .from('scraper_progress')
      .select('*')
      .in('status', ['initializing', 'running'])
      .order('updated_at', { ascending: false })
      .limit(1)

    const progressRow = activeRows?.[0]

    // 2) If no active run, use the latest run by updated_at (any status)
    if (!progressRow) {
      const { data: latestRows } = await supabase
        .from('scraper_progress')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)

      if (!latestRows?.[0]) {
        return NextResponse.json({
          runKey: null,
          progress: null,
          events: [],
          updatedAt: new Date().toISOString(),
        })
      }

      const row = latestRows[0]
      const runKey = row.run_key as string

      const { data: events } = await supabase
        .from('scraper_events')
        .select('*')
        .eq('run_key', runKey)
        .order('created_at', { ascending: false })
        .limit(50)

      return NextResponse.json({
        runKey,
        progress: row,
        events: events || [],
        updatedAt: new Date().toISOString(),
      })
    }

    const runKey = progressRow.run_key as string

    const { data: events } = await supabase
      .from('scraper_events')
      .select('*')
      .eq('run_key', runKey)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({
      runKey,
      progress: progressRow,
      events: events || [],
      updatedAt: new Date().toISOString(),
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
