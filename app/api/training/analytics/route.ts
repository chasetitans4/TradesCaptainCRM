import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/training/analytics
 * Batch insert training analytics events
 * Called on module complete and page unload
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Get user's business if authenticated
    let businessId: string | null = null;
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user.id)
        .single();
      businessId = userData?.business_id || null;
    }

    // Parse request body
    let events: Array<{
      business_id?: string;
      user_id?: string;
      module_id: string;
      event_type: string;
      step_index?: number;
      duration_seconds?: number;
      metadata?: Record<string, unknown>;
      timestamp?: number;
    }>;

    try {
      events = await request.json();
    } catch {
      // Handle sendBeacon which sends as text
      const text = await request.text();
      events = JSON.parse(text);
    }

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0 });
    }

    // Prepare events for batch insert
    const preparedEvents = events.map((event) => ({
      business_id: event.business_id || businessId,
      user_id: event.user_id || user?.id,
      module_id: event.module_id,
      event_type: event.event_type,
      step_index: event.step_index,
      duration_seconds: event.duration_seconds,
      metadata: event.metadata,
      created_at: event.timestamp
        ? new Date(event.timestamp).toISOString()
        : new Date().toISOString(),
    })).filter((event) => event.business_id && event.user_id);

    if (preparedEvents.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0, reason: 'no_valid_events' });
    }

    // Batch insert
    const { error } = await supabase
      .from('training_analytics')
      .insert(preparedEvents);

    if (error) {
      console.error('[Training Analytics] Insert error:', error);
      // Return success anyway - analytics are best-effort
      return NextResponse.json({ ok: true, inserted: 0, error: 'insert_failed' });
    }

    return NextResponse.json({ ok: true, inserted: preparedEvents.length });
  } catch (error) {
    console.error('[Training Analytics] Error:', error);
    // Return success anyway - analytics are best-effort
    return NextResponse.json({ ok: true, inserted: 0, error: 'unexpected_error' });
  }
}

/**
 * GET /api/training/analytics
 * Get training analytics summary for a business
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    // Only owners and admins can view analytics
    if (!['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30', 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get analytics summary
    const { data: events, error } = await supabase
      .from('training_analytics')
      .select('event_type, module_id, duration_seconds, created_at')
      .eq('business_id', userData.business_id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Training Analytics] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }

    // Calculate summary
    const summary = {
      period_days: days,
      total_events: events?.length || 0,
      modules_started: events?.filter((e) => e.event_type === 'module_started').length || 0,
      modules_completed: events?.filter((e) => e.event_type === 'module_completed').length || 0,
      modules_skipped: events?.filter((e) => e.event_type === 'module_skipped').length || 0,
      avg_duration_seconds: calculateAvgDuration(events || []),
      completion_rate: calculateCompletionRate(events || []),
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('[Training Analytics] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateAvgDuration(events: Array<{ duration_seconds?: number | null }>): number {
  const withDuration = events.filter((e) => e.duration_seconds && e.duration_seconds > 0);
  if (withDuration.length === 0) return 0;
  const total = withDuration.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
  return Math.round(total / withDuration.length);
}

function calculateCompletionRate(events: Array<{ event_type: string }>): number {
  const started = events.filter((e) => e.event_type === 'module_started').length;
  const completed = events.filter((e) => e.event_type === 'module_completed').length;
  if (started === 0) return 0;
  return Math.round((completed / started) * 100);
}
