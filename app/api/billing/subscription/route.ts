// =====================================================
// SUBSCRIPTION MANAGEMENT API
// GET /api/billing/subscription - Get subscription details
// PUT /api/billing/subscription - Change plan
// DELETE /api/billing/subscription - Cancel subscription
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import {
  getSubscriptionDetails,
  getInvoiceHistory,
  changePlan,
  cancelSubscription,
  getPriceIds,
  getPriceCatalog,
} from '@/lib/stripe/subscriptions';
import { apiLogger } from '@/lib/logger';

export async function GET() {
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

    const [subscription, invoices] = await Promise.all([
      getSubscriptionDetails(profile.business_id),
      getInvoiceHistory(profile.business_id),
    ]);

    return NextResponse.json({
      subscription,
      invoices,
      priceIds: getPriceIds(),
      priceCatalog: getPriceCatalog(),
    });
  } catch (error) {
    apiLogger.error({ msg: 'Error fetching subscription', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch subscription' },
      { status: 400 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners can manage billing
    if (profile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only the business owner can manage billing' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { priceId } = body;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    await changePlan(profile.business_id, priceId);

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ msg: 'Error changing plan', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to change plan' },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners can cancel
    if (profile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only the business owner can cancel the subscription' },
        { status: 403 }
      );
    }

    await cancelSubscription(profile.business_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ msg: 'Error canceling subscription', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel subscription' },
      { status: 400 }
    );
  }
}
