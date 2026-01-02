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

export async function GET(request: NextRequest) {
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
  } catch (error: any) {
    console.error('Error in GET /api/admin/commission/reference:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get commission reference' },
      { status: 500 }
    );
  }
}
