// =====================================================
// ADMIN DASHBOARD STATS API
// GET /api/admin/dashboard
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDashboardStats, getAgentDashboardStats } from '@/lib/admin/accounts';
import { verifyAdminAuth } from '@/lib/admin/auth';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.valid || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return different stats based on role
    if (['super_admin', 'admin', 'finance'].includes(auth.user.role)) {
      const stats = await getAdminDashboardStats();
      return NextResponse.json({ stats, role: 'admin' });
    }

    // Agent dashboard
    const stats = await getAgentDashboardStats(auth.user.id);
    return NextResponse.json({ stats, role: 'agent' });
  } catch (error) {
    apiLogger.error({
      msg: 'Get dashboard stats error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get dashboard stats' },
      { status: 500 }
    );
  }
}
