// =====================================================
// APPLY OFFER API
// POST /api/offers/:code/apply
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { applyOfferCode, validateOfferCode } from '@/lib/admin/offers';
import { apiLogger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await params;
    const body = await request.json();

    const { client_id, plan_slug, monthly_price_cents, subscription_id } = body;

    if (!client_id || !plan_slug || !monthly_price_cents) {
      return NextResponse.json(
        { error: 'client_id, plan_slug, and monthly_price_cents are required' },
        { status: 400 }
      );
    }

    // Validate first
    const validation = await validateOfferCode(code, plan_slug, monthly_price_cents);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid offer code' },
        { status: 400 }
      );
    }

    // Apply the offer
    const usage = await applyOfferCode(
      code,
      client_id,
      admin.id,
      subscription_id
    );

    return NextResponse.json({
      success: true,
      usage,
      offer: validation.offer,
      commission_impact: validation.commission_impact,
    });
  } catch (error) {
    apiLogger.error({ message: 'Apply offer error', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to apply offer' },
      { status: 500 }
    );
  }
}
