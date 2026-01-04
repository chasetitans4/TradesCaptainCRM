// =====================================================
// UPGRADE COMMISSION CALCULATE API
// POST /api/admin/commission/calculate-upgrade
// Calculate commission for an upgrade scenario
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { calculateUpgradeCommission, UpgradeCommissionInput } from '@/lib/admin/commission-calculator';
import { apiLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const input: UpgradeCommissionInput = {
      currentPlanSlug: body.currentPlanSlug,
      newPlanSlug: body.newPlanSlug,
      customerMonth: body.customerMonth || 1,
      isRateLocked: body.isRateLocked || false,
    };

    if (!input.currentPlanSlug || !input.newPlanSlug) {
      return NextResponse.json(
        { error: 'currentPlanSlug and newPlanSlug are required' },
        { status: 400 }
      );
    }

    const calculation = await calculateUpgradeCommission(input);

    return NextResponse.json({
      success: true,
      calculation,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Error calculating upgrade commission',
      path: '/api/admin/commission/calculate-upgrade',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to calculate upgrade commission' },
      { status: 500 }
    );
  }
}
