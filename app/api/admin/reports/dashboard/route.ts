// =====================================================
// ADMIN DASHBOARD STATS API
// GET /api/admin/reports/dashboard - Get dashboard statistics
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getDashboardStats, getActivityLog } from '@/lib/admin';
import { apiLogger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await getDashboardStats();

    // Get recent activity
    const { activities } = await getActivityLog({}, 1, 10);

    return NextResponse.json({
      stats,
      recentActivity: activities,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Get dashboard stats error',
      path: '/api/admin/reports/dashboard',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get dashboard stats' },
      { status: 500 }
    );
  }
}
