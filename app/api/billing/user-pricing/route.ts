// =====================================================
// USER PRICING API
// GET /api/billing/user-pricing - Get user pricing info
// =====================================================

import { NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { getUserPricingInfo } from '@/lib/billing/per-user';
import { apiLogger } from '@/lib/logger';

export async function GET() {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pricing = await getUserPricingInfo(profile.business_id);

    if (!pricing) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    return NextResponse.json(pricing);
  } catch (error) {
    apiLogger.error({
      msg: 'Error fetching user pricing',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
