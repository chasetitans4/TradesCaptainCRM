// =====================================================
// LEADS CAPTAIN ALERTS API
// GET /api/leads-captain/alerts
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, getServerSession } from '@/lib/permissions/check-permission';
import { getLeadsCaptainAlerts } from '@/lib/admin/leads-captain-dashboard';
import { apiLogger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    await checkPermission('view_leads_captain');
    const session = await getServerSession();
    const userId = session!.user.id;

    const alerts = await getLeadsCaptainAlerts(userId);

    return NextResponse.json({
      alerts,
      summary: {
        near_cap: alerts.filter(a => a.type === 'near_cap').length,
        over_cap: alerts.filter(a => a.type === 'over_cap').length,
        low_usage: alerts.filter(a => a.type === 'low_usage').length,
        declining_rate: alerts.filter(a => a.type === 'declining_rate').length,
        total: alerts.length,
      },
    });
  } catch (error) {
    apiLogger.error({
      message: 'Leads Captain alerts error',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}
