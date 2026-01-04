// =====================================================
// AVAILABLE OFFERS API
// GET /api/offers/available?planSlug=gold_pro
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getAvailableOffers } from '@/lib/admin/offers';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAgentOrHigher();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const planSlug = searchParams.get('planSlug');

    if (!planSlug) {
      return NextResponse.json(
        { error: 'planSlug is required' },
        { status: 400 }
      );
    }

    const offers = await getAvailableOffers(planSlug);

    return NextResponse.json(offers);
  } catch (error) {
    apiLogger.error({ message: 'Get available offers error', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch available offers' },
      { status: 500 }
    );
  }
}
