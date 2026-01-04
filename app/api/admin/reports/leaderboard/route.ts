// =====================================================
// TEAM LEADERBOARD API
// GET /api/admin/reports/leaderboard - Get team rankings
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrHigher } from '@/lib/admin/auth';
import { getTeamLeaderboard } from '@/lib/admin/reports';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminOrHigher();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'this_month';

    const leaderboard = await getTeamLeaderboard(period);

    return NextResponse.json(leaderboard);
  } catch (error) {
    apiLogger.error({
      msg: 'Get leaderboard error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
