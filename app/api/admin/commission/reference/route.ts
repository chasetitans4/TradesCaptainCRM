// =====================================================
// COMMISSION REFERENCE API
// GET /api/admin/commission/reference
// Get quick reference tables for all plans
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import {
  getCommissionQuickReference,
  getCurrentRates,
  getRetentionBonuses,
  getOfferAdjustments,
} from '@/lib/admin/commission-calculator';
import { apiLogger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all reference data in parallel
    const [plans, rates, bonuses, offers] = await Promise.all([
      getCommissionQuickReference(),
      getCurrentRates(),
      getRetentionBonuses(),
      getOfferAdjustments(),
    ]);

    return NextResponse.json({
      plans,
      rates,
      bonuses,
      offers,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Error getting commission reference',
      path: '/api/admin/commission/reference',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get commission reference' },
      { status: 500 }
    );
  }
}
