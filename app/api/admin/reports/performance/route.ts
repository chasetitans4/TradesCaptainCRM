// =====================================================
// PERFORMANCE REPORT API
// GET /api/admin/reports/performance - Get agent performance
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getPerformanceReport } from '@/lib/admin/reports';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'this_month') as
      | 'this_month'
      | 'last_month'
      | 'this_quarter'
      | 'this_year';

    const report = await getPerformanceReport(admin.id, period);

    return NextResponse.json(report);
  } catch (error) {
    apiLogger.error({
      msg: 'Get performance report error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch performance report' },
      { status: 500 }
    );
  }
}
