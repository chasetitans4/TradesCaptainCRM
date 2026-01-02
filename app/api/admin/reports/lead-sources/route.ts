// =====================================================
// LEAD SOURCE REPORT API
// GET /api/admin/reports/lead-sources - Get lead source analysis
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getLeadSourceReport } from '@/lib/admin/reports';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'this_month';

    const report = await getLeadSourceReport(admin.id, period);

    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Get lead source report error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch lead source report' },
      { status: 500 }
    );
  }
}
