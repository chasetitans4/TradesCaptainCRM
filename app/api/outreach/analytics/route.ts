import { NextRequest, NextResponse } from 'next/server';
import {
  getDashboardStats,
  getAgentPerformanceStats,
  getSpeedReport,
  getCampaignPerformance,
} from '@/lib/outreach/analytics';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { apiLogger } from '@/lib/logger';

/**
 * GET /api/outreach/analytics
 * Get outreach analytics and stats
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'dashboard';
    const agentId = searchParams.get('agent_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    switch (type) {
      case 'dashboard': {
        const stats = await getDashboardStats();
        return NextResponse.json(stats);
      }

      case 'agents': {
        const stats = await getAgentPerformanceStats(agentId || undefined);
        return NextResponse.json({ data: stats });
      }

      case 'speed': {
        if (!startDate || !endDate) {
          return NextResponse.json(
            { error: 'start_date and end_date are required for speed report' },
            { status: 400 }
          );
        }
        const stats = await getSpeedReport(new Date(startDate), new Date(endDate));
        return NextResponse.json(stats);
      }

      case 'campaigns': {
        const stats = await getCampaignPerformance();
        return NextResponse.json({ data: stats });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid analytics type' },
          { status: 400 }
        );
    }
  } catch (error) {
    apiLogger.error({ message: 'Error getting analytics', error });
    return NextResponse.json(
      { error: 'Failed to get analytics' },
      { status: 500 }
    );
  }
}
