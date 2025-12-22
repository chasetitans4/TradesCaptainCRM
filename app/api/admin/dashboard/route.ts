// =====================================================
// ADMIN DASHBOARD STATS API
// GET /api/admin/dashboard
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDashboardStats, getAgentDashboardStats } from '@/lib/admin/accounts';
import { verifyAdminAuth } from '@/lib/admin/auth';

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
  } catch (error: any) {
    console.error('Get dashboard stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get dashboard stats' },
      { status: 500 }
    );
  }
}
