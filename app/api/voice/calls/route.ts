/**
 * VOICE CALLS API
 * GET /api/voice/calls
 *
 * Retrieve voice call events and history.
 * Delta 5: All calls include initiation evidence.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

const callsLogger = apiLogger.child({ context: 'api.voice.calls' });

// GET /api/voice/calls - Get call history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    // Filters
    const locationId = searchParams.get('location_id');
    const emergencyOnly = searchParams.get('emergency') === 'true';
    const aiAnsweredOnly = searchParams.get('ai_answered') === 'true';
    const missedOnly = searchParams.get('missed') === 'true';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Build query
    let query = supabase
      .from('voice_call_events')
      .select(`
        *,
        customers (
          id,
          first_name,
          last_name,
          phone
        )
      `, { count: 'exact' })
      .eq('business_id', userData.business_id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (locationId) {
      query = query.eq('location_id', locationId);
    }
    if (emergencyOnly) {
      query = query.eq('is_emergency', true);
    }
    if (aiAnsweredOnly) {
      query = query.eq('was_ai_answered', true);
    }
    if (missedOnly) {
      query = query.eq('was_missed', true);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: calls, error, count } = await query;

    if (error) {
      callsLogger.error({
        msg: 'Error fetching voice calls',
        error: error.message,
      });
      throw new Error('Failed to fetch voice calls');
    }

    // Get summary stats
    const { data: stats } = await supabase
      .from('voice_call_events')
      .select('is_emergency, was_ai_answered, was_missed')
      .eq('business_id', userData.business_id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const summary = {
      totalCalls: stats?.length || 0,
      emergencyCalls: stats?.filter((c) => c.is_emergency).length || 0,
      aiHandledCalls: stats?.filter((c) => c.was_ai_answered).length || 0,
      missedCalls: stats?.filter((c) => c.was_missed).length || 0,
    };

    return NextResponse.json({
      calls,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      summary,
    });
  } catch (error) {
    callsLogger.error({
      msg: 'Error fetching voice calls',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to fetch voice calls' },
      { status: 500 }
    );
  }
}
