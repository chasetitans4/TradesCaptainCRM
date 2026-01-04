// =====================================================
// REPORTS API
// GET /api/reports
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import {
  getDashboardMetrics,
  getRevenueOverTime,
  getLeadSourceBreakdown,
  getJobStatusBreakdown,
  getYearToDateSummary,
} from '@/lib/reports';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission - only owner and admin can view reports
    if (profile.role === 'technician') {
      return NextResponse.json(
        { error: 'Access denied. Reports are only available to owners and admins.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Parse date range from query params
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    // Default to current month if not specified
    const startDate = startParam ? parseISO(startParam) : startOfMonth(new Date());
    const endDate = endParam ? parseISO(endParam) : endOfMonth(new Date());

    const filters = {
      businessId: profile.business_id,
      startDate,
      endDate,
    };

    // Fetch all report data in parallel
    const [metrics, revenueChart, leadSources, jobStatuses, ytdSummary] = await Promise.all([
      getDashboardMetrics(filters),
      getRevenueOverTime(profile.business_id, 6),
      getLeadSourceBreakdown(filters),
      getJobStatusBreakdown(filters),
      getYearToDateSummary(profile.business_id),
    ]);

    return NextResponse.json({
      metrics,
      charts: {
        revenue: revenueChart,
        leadSources,
        jobStatuses,
      },
      ytd: ytdSummary,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    });
  } catch (error) {
    apiLogger.error({ error, context: 'fetching reports' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}
