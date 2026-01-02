// =====================================================
// ADMIN PLANS API
// GET /api/admin/plans - Get all plan pricing and tracks
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getAllPlanPricing, getPlanTracksSummary } from '@/lib/admin/plans';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format');

    if (format === 'tracks') {
      // Return plans grouped by track
      const tracks = await getPlanTracksSummary();
      return NextResponse.json({ tracks });
    }

    // Default: return flat list of all plans
    const plans = await getAllPlanPricing();
    return NextResponse.json({ plans });
  } catch (error: any) {
    console.error('Error in GET /api/admin/plans:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get plans' },
      { status: 500 }
    );
  }
}
