// =====================================================
// CALL STATS API ROUTE
// GET /api/calls/stats - Get call statistics
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCallStats, getTodayCallSummary } from '@/lib/calls';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business
    const { data: profile } = await supabase
      .from('users')
      .select('business_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period'); // 'today', 'week', 'month', 'custom'
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Handle today's summary specially
    if (period === 'today') {
      const summary = await getTodayCallSummary(profile.business_id);
      return NextResponse.json(summary);
    }

    // Calculate date range based on period
    let start: Date | undefined;
    let end: Date | undefined;

    const now = new Date();

    switch (period) {
      case 'week':
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'custom':
        if (startDate) start = new Date(startDate);
        if (endDate) end = new Date(endDate);
        break;
      default:
        // No date filter - all time
        break;
    }

    const stats = await getCallStats(profile.business_id, start, end);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in GET /api/calls/stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch call stats' },
      { status: 500 }
    );
  }
}
