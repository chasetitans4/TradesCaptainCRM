// =====================================================
// OFFERS API
// GET /api/offers - Get all offer codes
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getOfferCodes } from '@/lib/admin/offers';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAgentOrHigher();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeRestricted = searchParams.get('include_restricted') === 'true';

    const offers = await getOfferCodes({ includeRestricted });

    return NextResponse.json({
      offers,
      standard: offers.filter((o) => !o.requires_approval),
      restricted: offers.filter((o) => o.requires_approval),
    });
  } catch (error: any) {
    console.error('Get offers error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch offers' },
      { status: 500 }
    );
  }
}
