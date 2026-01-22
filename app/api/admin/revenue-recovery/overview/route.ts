// =====================================================
// ADMIN REVENUE RECOVERY OVERVIEW API
// GET /api/admin/revenue-recovery/overview
// Platform-wide recovery statistics
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminAuth } from '@/lib/admin/auth';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.valid || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Calculate date ranges
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Get this month's attributions
    const { data: thisMonthData } = await supabase
      .from('revenue_attributions')
      .select('*')
      .gte('trigger_at', thisMonth.toISOString());

    // Get last month's attributions for comparison
    const { data: lastMonthData } = await supabase
      .from('revenue_attributions')
      .select('*')
      .gte('trigger_at', lastMonth.toISOString())
      .lt('trigger_at', thisMonth.toISOString());

    // Calculate totals
    const calculateRevenue = (data: any[] | null) =>
      (data || []).reduce((sum, a) => {
        const amount = a.confidence === 'high'
          ? a.revenue_amount_cents
          : Math.round(a.revenue_amount_cents * 0.7);
        return sum + amount;
      }, 0) / 100;

    const calculateRate = (data: any[] | null) => {
      if (!data || data.length === 0) return 0;
      const successful = data.filter(a => a.outcome_id).length;
      return (successful / data.length) * 100;
    };

    const thisMonthRevenue = calculateRevenue(thisMonthData);
    const lastMonthRevenue = calculateRevenue(lastMonthData);
    const thisMonthRate = calculateRate(thisMonthData);
    const lastMonthRate = calculateRate(lastMonthData);

    // Calculate changes
    const revenueChange = lastMonthRevenue > 0
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : 0;
    const rateChange = lastMonthRate > 0
      ? Math.round(((thisMonthRate - lastMonthRate) / lastMonthRate) * 100)
      : 0;

    // Get active clients count
    const { count: activeClientsCount } = await supabase
      .from('client_recovery_settings')
      .select('*', { count: 'exact', head: true })
      .eq('recovery_enabled', true);

    // Calculate average latency
    const latencies = (thisMonthData || [])
      .filter(a => a.action_at && a.trigger_at)
      .map(a => {
        const trigger = new Date(a.trigger_at).getTime();
        const action = new Date(a.action_at).getTime();
        return (action - trigger) / (1000 * 60 * 60); // Hours
      });

    const avgLatency = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;

    return NextResponse.json({
      totalInfluencedRevenue: thisMonthRevenue,
      activeClientsCount: activeClientsCount || 0,
      avgRecoveryRate: thisMonthRate,
      avgLatencyHours: avgLatency,
      periodComparison: {
        revenueChange,
        rateChange,
      },
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Admin revenue recovery overview error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to fetch overview' },
      { status: 500 }
    );
  }
}
