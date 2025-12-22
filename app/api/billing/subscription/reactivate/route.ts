// =====================================================
// REACTIVATE SUBSCRIPTION API
// POST /api/billing/subscription/reactivate
// =====================================================

import { NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { reactivateSubscription } from '@/lib/stripe/subscriptions';

export async function POST() {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners can reactivate
    if (profile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only the business owner can reactivate the subscription' },
        { status: 403 }
      );
    }

    await reactivateSubscription(profile.business_id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error reactivating subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reactivate subscription' },
      { status: 400 }
    );
  }
}
