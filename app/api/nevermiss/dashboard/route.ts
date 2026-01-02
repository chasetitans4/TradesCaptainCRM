// =====================================================
// NEVERMISS DASHBOARD API
// GET /api/nevermiss/dashboard
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import {
  getNevermissDashboardSummary,
  getSmsUsageOverview,
} from '@/lib/admin/nevermiss-dashboard';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') as 'this_month' | 'last_month') || 'this_month';

    const [summary, usageOverview] = await Promise.all([
      getNevermissDashboardSummary(admin.id, period),
      getSmsUsageOverview(admin.id),
    ]);

    return NextResponse.json({
      summary,
      usage_overview: usageOverview,
      period: {
        value: period,
        label: period === 'this_month' ? 'This Month' : 'Last Month',
      },
    });
  } catch (error: any) {
    console.error('NeverMiss dashboard error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
