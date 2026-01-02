// =====================================================
// COMMISSION CALCULATE API
// POST /api/admin/commission/calculate
// Calculate commission for a new sale
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { calculateCommission, CommissionInput } from '@/lib/admin/commission-calculator';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const input: CommissionInput = {
      planSlug: body.planSlug,
      billingPeriod: body.billingPeriod || 'monthly',
      offerCode: body.offerCode || null,
      addOnUsers: body.addOnUsers || 0,
    };

    if (!input.planSlug) {
      return NextResponse.json({ error: 'planSlug is required' }, { status: 400 });
    }

    const calculation = await calculateCommission(input);

    return NextResponse.json({
      success: true,
      calculation,
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/commission/calculate:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate commission' },
      { status: 500 }
    );
  }
}
