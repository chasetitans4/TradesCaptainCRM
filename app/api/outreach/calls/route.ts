import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scheduleCall } from '@/lib/outreach/scheduling';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { apiLogger } from '@/lib/logger';

/**
 * GET /api/outreach/calls
 * Get scheduled calls with filters
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const agentId = searchParams.get('agent_id');
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '25');

    let query = supabase
      .from('scheduled_calls')
      .select(`
        *,
        contact:outreach_contacts(*),
        agent:admin_users(id, name, email)
      `, { count: 'exact' });

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      query = query
        .gte('scheduled_at', startOfDay.toISOString())
        .lte('scheduled_at', endOfDay.toISOString());
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query
      .order('scheduled_at', { ascending: true })
      .range(from, to);

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      page_size: pageSize,
      has_more: (count || 0) > page * pageSize,
    });
  } catch (error) {
    apiLogger.error({ message: 'Error getting calls', error });
    return NextResponse.json(
      { error: 'Failed to get calls' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/outreach/calls
 * Schedule a new call
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    const {
      contact_id,
      scheduled_at,
      agent_id,
      duration_minutes,
      call_type,
      meeting_link,
      is_weekend_request,
    } = body;

    if (!contact_id || !scheduled_at) {
      return NextResponse.json(
        { error: 'contact_id and scheduled_at are required' },
        { status: 400 }
      );
    }

    const result = await scheduleCall(
      contact_id,
      new Date(scheduled_at),
      agent_id,
      {
        duration_minutes,
        call_type,
        meeting_link,
        is_weekend_request,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          overflow: result.overflow,
          overflow_reason: result.overflow_reason,
        },
        { status: result.overflow ? 200 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      call: result.call,
      overflow: result.overflow,
      overflow_reason: result.overflow_reason,
    });
  } catch (error) {
    apiLogger.error({ message: 'Error scheduling call', error });
    return NextResponse.json(
      { error: 'Failed to schedule call' },
      { status: 500 }
    );
  }
}
