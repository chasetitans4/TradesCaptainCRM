// =====================================================
// LEADS CAPTAIN DASHBOARD API
// GET /api/leads-captain/dashboard
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, getServerSession } from '@/lib/permissions/check-permission';
import {
  getLeadsCaptainDashboardSummary,
  getSmsUsageOverview,
} from '@/lib/admin/leads-captain-dashboard';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    await checkPermission('view_leads_captain');
    const session = await getServerSession();
    const userId = session!.user.id;

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') as 'this_month' | 'last_month') || 'this_month';

    const [summary, usageOverview] = await Promise.all([
      getLeadsCaptainDashboardSummary(userId, period),
      getSmsUsageOverview(userId),
    ]);

    return NextResponse.json({
      summary,
      usage_overview: usageOverview,
      period: {
        value: period,
        label: period === 'this_month' ? 'This Month' : 'Last Month',
      },
    });
  } catch (error) {
    apiLogger.error({
      message: 'Leads Captain dashboard error',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
