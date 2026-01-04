// =====================================================
// PERFORMANCE API
// GET /api/commissions/performance
// Get performance metrics, goals, and trends
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getPerformanceData } from '@/lib/admin/commission-tracker';
import { apiLogger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const performanceData = await getPerformanceData(admin.id);

    return NextResponse.json(performanceData);
  } catch (error) {
    apiLogger.error({ error, context: 'Error in GET /api/commissions/performance' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get performance data' },
      { status: 500 }
    );
  }
}
