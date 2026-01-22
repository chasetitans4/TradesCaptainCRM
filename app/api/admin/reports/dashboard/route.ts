// =====================================================
// ADMIN DASHBOARD STATS API
// GET /api/admin/reports/dashboard - Get dashboard statistics
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getDashboardStats, getActivityLog } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const admin = await requireAdmin(['super_admin', 'admin', 'agent', 'support']);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawStats = await getDashboardStats();

    // Get additional stats needed by dashboard
    const supabase = createAdminClient();
    let allAccounts: { plan_status: string; is_trial?: boolean }[] = [];
    try {
      const { data: accounts } = await supabase
        .from('crm_accounts')
        .select('plan_status, is_trial');
      allAccounts = accounts || [];
    } catch {
      // Table might not exist
    }
    const trialAccounts = allAccounts.filter(a => a.is_trial || a.plan_status === 'trial').length;
    const cancelledAccounts = allAccounts.filter(a => a.plan_status === 'cancelled').length;

    // Map to the format expected by the dashboard page
    const stats = {
      totalAccounts: rawStats.totalAccounts,
      activeAccounts: rawStats.activePaying,
      trialAccounts,
      cancelledAccounts,
      trialConversionRate: rawStats.trialConversionRate,
      monthlyRevenue: rawStats.mrr,
      pendingSubmissions: rawStats.pendingSubmissions,
    };

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
