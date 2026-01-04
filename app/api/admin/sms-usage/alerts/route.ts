// =====================================================
// SMS USAGE ALERTS API
// GET /api/admin/sms-usage/alerts - Get SMS alerts
// =====================================================

import { NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getSmsUsageAlerts } from '@/lib/admin/sms-usage';
import { apiLogger } from '@/lib/logger';

export async function GET() {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const alerts = await getSmsUsageAlerts(admin.id);

    return NextResponse.json({ alerts });
  } catch (error) {
    apiLogger.error({ msg: 'Get SMS alerts error', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch SMS alerts' },
      { status: 500 }
    );
  }
}
