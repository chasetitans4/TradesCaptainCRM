// =====================================================
// RETENTION REPORT API
// GET /api/admin/reports/retention - Get retention metrics
// =====================================================

import { NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getRetentionReport } from '@/lib/admin/reports';

export async function GET() {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const report = await getRetentionReport(admin.id);

    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Get retention report error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch retention report' },
      { status: 500 }
    );
  }
}
