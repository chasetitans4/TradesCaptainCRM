// =====================================================
// DAILY ROUTE SUMMARY API
// GET /api/routes/summary - Get daily route summaries
// Lightweight endpoint for the daily route summary page
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getBusinessDailyRouteSummaries, getMileageReport } from '@/lib/routes/arrival';
import { apiLogger } from '@/lib/logger';
import { isFeatureEnabled } from '@/lib/features';

// GET - Get daily route summaries for business
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business and check permissions
    const { data: userData } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Only owners, admins, and dispatchers can view all summaries
    if (!['owner', 'admin', 'dispatcher'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if route optimization is enabled
    const routeEnabled = await isFeatureEnabled(userData.business_id, 'route_optimization_enabled');
    if (!routeEnabled) {
      return NextResponse.json(
        { error: 'Route optimization is not enabled for your business' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const view = searchParams.get('view') || 'summary'; // 'summary' or 'mileage'
    const technicianId = searchParams.get('technicianId');

    // Single day summary view
    if (view === 'summary') {
      const date = dateParam ? new Date(dateParam) : new Date();
      const summaries = await getBusinessDailyRouteSummaries(userData.business_id, date);

      return NextResponse.json({
        date: date.toISOString().split('T')[0],
        technicians: summaries,
        totals: {
          totalMiles: Math.round(summaries.reduce((sum, s) => sum + s.totalMiles, 0) * 100) / 100,
          totalDriveMinutes: summaries.reduce((sum, s) => sum + s.totalDriveMinutes, 0),
          totalArrivals: summaries.reduce((sum, s) => sum + s.arrivalPingsCount, 0),
          technicianCount: summaries.length,
        },
      });
    }

    // Mileage report view (for tax/audit)
    if (view === 'mileage') {
      const startDate = startDateParam ? new Date(startDateParam) : new Date();
      const endDate = endDateParam ? new Date(endDateParam) : new Date();

      const report = await getMileageReport(
        userData.business_id,
        startDate,
        endDate,
        technicianId || undefined
      );

      return NextResponse.json({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        totalMiles: report.totalMiles,
        trips: report.trips,
        tripCount: report.trips.length,
      });
    }

    return NextResponse.json({ error: 'Invalid view parameter' }, { status: 400 });
  } catch (error) {
    apiLogger.error({
      msg: 'Get route summaries error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to get route summaries' }, { status: 500 });
  }
}
