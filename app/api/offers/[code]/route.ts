// =====================================================
// OFFER CODE API
// GET /api/offers/:code - Get offer by code
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getOfferByCode } from '@/lib/admin/offers';
import { apiLogger } from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const auth = await requireAgentOrHigher();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await params;

    const offer = await getOfferByCode(code);

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    return NextResponse.json(offer);
  } catch (error) {
    apiLogger.error({ message: 'Get offer error', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch offer' },
      { status: 500 }
    );
  }
}
