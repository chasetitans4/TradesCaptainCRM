// =====================================================
// TEAM LEADERBOARD API
// GET /api/admin/reports/leaderboard - Get team rankings
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrHigher } from '@/lib/admin/auth';
import { getTeamLeaderboard } from '@/lib/admin/reports';

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
  } catch (error: any) {
    console.error('Get leaderboard error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
