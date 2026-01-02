// =====================================================
// ADMIN PLAN DETAILS API
// GET /api/admin/plans/:planType - Get plan details with features
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getPlanDetails } from '@/lib/admin/plans';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planType: string }> }
) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planType } = await params;
    const planDetails = await getPlanDetails(planType);

    if (!planDetails) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json(planDetails);
  } catch (error: any) {
    console.error('Error in GET /api/admin/plans/:planType:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get plan details' },
      { status: 500 }
    );
  }
}
