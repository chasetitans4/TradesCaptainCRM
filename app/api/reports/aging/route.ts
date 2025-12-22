// =====================================================
// A/R AGING REPORT API
// GET /api/reports/aging - Get accounts receivable aging report
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { generateAgingReport, getAgingSummary } from '@/lib/invoices/aging';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owner and admin can view financial reports
    if (profile.role === 'technician') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const summaryOnly = searchParams.get('summary') === 'true';

    if (summaryOnly) {
      const summary = await getAgingSummary(profile.business_id);
      return NextResponse.json({ summary });
    }

    const report = await generateAgingReport(profile.business_id);

    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Error generating aging report:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate report' },
      { status: 500 }
    );
  }
}
