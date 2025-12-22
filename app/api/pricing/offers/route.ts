// =====================================================
// OFFERS API
// GET /api/pricing/offers - Get available offers
// POST /api/pricing/offers/validate - Validate offer combination
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveOffers,
  getOfferByCode,
  isOfferAvailableForPlan,
  validateOfferCombination,
  calculatePricing,
  calculateCommission,
  getPendingApprovalRequests,
} from '@/lib/pricing/offers';
import { getPlanById } from '@/lib/pricing/plans';

// GET - List active offers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('plan_id');
    const includePending = searchParams.get('include_pending') === 'true';

    let offers = getActiveOffers();

    // Filter by plan if provided
    if (planId) {
      offers = offers.filter(offer => isOfferAvailableForPlan(offer.code, planId));
    }

    const response: {
      offers: typeof offers;
      pending_approvals?: Awaited<ReturnType<typeof getPendingApprovalRequests>>;
    } = { offers };

    if (includePending) {
      response.pending_approvals = await getPendingApprovalRequests();
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching offers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch offers' },
      { status: 500 }
    );
  }
}

// POST - Calculate pricing with offers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      plan_id,
      billing_frequency = 'monthly',
      offer_codes = [],
      include_gbp_addon = false,
    } = body;

    // Validate plan
    const plan = getPlanById(plan_id);
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Validate each offer is available for this plan
    for (const code of offer_codes) {
      if (!isOfferAvailableForPlan(code, plan_id)) {
        const offer = getOfferByCode(code);
        return NextResponse.json(
          { error: `Offer "${offer?.name || code}" is not available for this plan` },
          { status: 400 }
        );
      }
    }

    // Validate offer combination
    const validation = validateOfferCombination(offer_codes);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Check if any offers require approval
    const offersRequiringApproval = offer_codes
      .map(code => getOfferByCode(code))
      .filter(offer => offer?.requires_approval);

    // Calculate pricing
    const pricing = calculatePricing(
      plan.monthly_price,
      plan.annual_price,
      billing_frequency,
      offer_codes,
      include_gbp_addon
    );

    // Calculate commission impact
    const commission = calculateCommission(
      plan.monthly_price,
      billing_frequency,
      plan.annual_price,
      offer_codes,
      include_gbp_addon,
      pricing.fees_waived.includes('gbp_setup')
    );

    return NextResponse.json({
      plan,
      pricing,
      commission,
      requires_approval: offersRequiringApproval.length > 0,
      approval_required_for: offersRequiringApproval.map(o => o?.code),
      validation: { valid: true },
    });
  } catch (error) {
    console.error('Error calculating pricing:', error);
    return NextResponse.json(
      { error: 'Failed to calculate pricing' },
      { status: 500 }
    );
  }
}
