// =====================================================
// PERFORMANCE API
// GET /api/commissions/performance
// Get performance metrics, goals, and trends
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getPerformanceData } from '@/lib/admin/commission-tracker';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const performanceData = await getPerformanceData(admin.id);

    return NextResponse.json(performanceData);
  } catch (error: any) {
    console.error('Error in GET /api/commissions/performance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get performance data' },
      { status: 500 }
    );
  }
}
