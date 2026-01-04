// =====================================================
// COMMISSION DASHBOARD API
// GET /api/commissions/dashboard
// Get commission summary and breakdown for period
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getCommissionDashboard } from '@/lib/admin/commission-tracker';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'this_month';

    const dashboard = await getCommissionDashboard(admin.id, period);

    return NextResponse.json(dashboard);
  } catch (error) {
    apiLogger.error({ error, context: 'Error in GET /api/commissions/dashboard' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get commission dashboard' },
      { status: 500 }
    );
  }
}
