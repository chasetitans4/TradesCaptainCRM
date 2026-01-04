// =====================================================
// BONUSES API
// GET /api/commissions/bonuses
// Get retention bonus tracking data
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getBonusData } from '@/lib/admin/commission-tracker';
import { apiLogger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bonusData = await getBonusData(admin.id);

    return NextResponse.json(bonusData);
  } catch (error) {
    apiLogger.error({ error, context: 'Error in GET /api/commissions/bonuses' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get bonus data' },
      { status: 500 }
    );
  }
}
