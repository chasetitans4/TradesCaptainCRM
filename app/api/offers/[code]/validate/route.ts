// =====================================================
// VALIDATE OFFER API
// POST /api/offers/:code/validate
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { validateOfferCode } from '@/lib/admin/offers';
import { apiLogger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const auth = await requireAgentOrHigher();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await params;
    const body = await request.json();

    const { plan_slug, monthly_price_cents } = body;

    if (!plan_slug || !monthly_price_cents) {
      return NextResponse.json(
        { error: 'plan_slug and monthly_price_cents are required' },
        { status: 400 }
      );
    }

    const validation = await validateOfferCode(code, plan_slug, monthly_price_cents);

    return NextResponse.json(validation);
  } catch (error) {
    apiLogger.error({ message: 'Validate offer error', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to validate offer' },
      { status: 500 }
    );
  }
}
