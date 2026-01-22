// =====================================================
// CALL STATS API ROUTE
// GET /api/calls/stats - Get call statistics
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/permissions/check-permission';
import { getCallStats, getTodayCallSummary } from '@/lib/calls';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Determine business ID
    let businessId = session.user.businessId;
    const queryBusinessId = searchParams.get('businessId');
    
    if ((session.user.role === 'admin' || session.user.role === 'super_admin') && queryBusinessId) {
      businessId = queryBusinessId;
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID not found' }, { status: 404 });
    }

    const period = searchParams.get('period'); // 'today', 'week', 'month', 'custom'
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Handle today's summary specially
    if (period === 'today') {
      const summary = await getTodayCallSummary(businessId);
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

    const stats = await getCallStats(businessId, start, end);

    return NextResponse.json(stats);
  } catch (error) {
    apiLogger.error({ error, context: 'Error in GET /api/calls/stats' });
    return NextResponse.json(
      { error: 'Failed to fetch call stats' },
      { status: 500 }
    );
  }
}
