// =====================================================
// NEVERMISS ALERTS API
// GET /api/nevermiss/alerts
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getNevermissAlerts } from '@/lib/admin/nevermiss-dashboard';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAgentOrHigher();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const alerts = await getNevermissAlerts(auth.id);

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
  } catch (error: any) {
    console.error('NeverMiss alerts error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}
