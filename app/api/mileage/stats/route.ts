// =====================================================
// MILEAGE STATS API
// GET /api/mileage/stats - Get mileage statistics
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { getTechnicianMileageStats, getBusinessMileageStats } from '@/lib/mileage';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const period = searchParams.get('period') || 'week'; // week, month, custom
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Calculate date range
    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else if (period === 'month') {
      startDate = startOfMonth(new Date());
      endDate = endOfMonth(new Date());
    } else {
      // Default to current week
      startDate = startOfWeek(new Date(), { weekStartsOn: 0 });
      endDate = endOfWeek(new Date(), { weekStartsOn: 0 });
    }

    // Technicians can only see their own stats
    if (profile.role === 'technician' || userId) {
      const targetUserId =
        profile.role === 'technician' ? profile.id : userId!;

      const stats = await getTechnicianMileageStats(targetUserId, startDate, endDate);

      return NextResponse.json({
        stats,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      });
    }

    // Owner/admin gets business-wide stats
    const stats = await getBusinessMileageStats(profile.business_id, startDate, endDate);

    return NextResponse.json({
      stats,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching mileage stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch mileage stats' },
      { status: 500 }
    );
  }
}
