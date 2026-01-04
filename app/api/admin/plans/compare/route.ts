// =====================================================
// ADMIN PLAN COMPARISON API
// GET /api/admin/plans/compare?plans=blue_pro,gold_pro
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { comparePlans } from '@/lib/admin/plans';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const plansParam = searchParams.get('plans');

    if (!plansParam) {
      return NextResponse.json(
        { error: 'Missing plans parameter. Example: ?plans=blue_pro,gold_pro' },
        { status: 400 }
      );
    }

    const planTypes = plansParam.split(',').map(p => p.trim());

    if (planTypes.length < 2) {
      return NextResponse.json(
        { error: 'Need at least 2 plans to compare' },
        { status: 400 }
      );
    }

    const comparison = await comparePlans(planTypes);
    return NextResponse.json(comparison);
  } catch (error) {
    apiLogger.error({
      msg: 'Compare plans error',
      path: '/api/admin/plans/compare',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compare plans' },
      { status: 500 }
    );
  }
}
