// =====================================================
// COMMISSION DASHBOARD API
// GET /api/commissions/dashboard
// Get commission summary and breakdown for period
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getCommissionDashboard } from '@/lib/admin/commission-tracker';

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
  } catch (error: any) {
    console.error('Error in GET /api/commissions/dashboard:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get commission dashboard' },
      { status: 500 }
    );
  }
}
