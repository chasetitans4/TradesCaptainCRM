// =====================================================
// STRIPE CUSTOMER PORTAL API
// POST /api/billing/portal
// =====================================================

import { NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { createCustomerPortalSession } from '@/lib/stripe/subscriptions';
import { apiLogger } from '@/lib/logger';

export async function POST() {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners can access billing
    if (profile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only the business owner can access billing' },
        { status: 403 }
      );
    }

    const url = await createCustomerPortalSession(profile.business_id);

    return NextResponse.json({ url });
  } catch (error) {
    apiLogger.error({ msg: 'Error creating portal session', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create portal session' },
      { status: 400 }
    );
  }
}
