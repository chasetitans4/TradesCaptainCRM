// =====================================================
// ADMIN DASHBOARD STATS API
// GET /api/admin/reports/dashboard - Get dashboard statistics
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getDashboardStats, getActivityLog } from '@/lib/admin';

export async function GET(request: NextRequest) {
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
  } catch (error: any) {
    console.error('Error in GET /api/admin/reports/dashboard:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get dashboard stats' },
      { status: 500 }
    );
  }
}
