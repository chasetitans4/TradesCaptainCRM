// =====================================================
// RETENTION REPORT API
// GET /api/admin/reports/retention - Get retention metrics
// =====================================================

import { NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getRetentionReport } from '@/lib/admin/reports';
import { apiLogger } from '@/lib/logger';

export async function GET() {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const report = await getRetentionReport(admin.id);

    return NextResponse.json(report);
  } catch (error) {
    apiLogger.error({
      msg: 'Get retention report error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch retention report' },
      { status: 500 }
    );
  }
}
