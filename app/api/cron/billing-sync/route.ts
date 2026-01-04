// =====================================================
// BILLING RECONCILIATION CRON JOB
// Syncs Stripe subscription state with local database
// Runs daily to catch any missed webhook events
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { stripe, isStripeConfigured } from '@/lib/stripe/client';
import { apiLogger } from '@/lib/logger';

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

interface SyncResult {
  businessId: string;
  subscriptionId: string;
  changes: string[];
  error?: string;
}

export async function GET(request: NextRequest) {
  // SECURITY: Verify authorization
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET) {
    apiLogger.error({ msg: 'CRON_SECRET not configured - denying cron access' });
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const supabase = createAdminClient();
  const results: {
    processed: number;
    synced: number;
    errors: number;
    details: SyncResult[];
  } = {
    processed: 0,
    synced: 0,
    errors: 0,
    details: [],
  };

  try {
    // Get all businesses with Stripe subscriptions
    const { data: businesses, error: fetchError } = await supabase
      .from('businesses')
      .select('id, stripe_subscription_id, stripe_subscription_status, plan_tier, current_period_end')
      .not('stripe_subscription_id', 'is', null);

    if (fetchError) {
      apiLogger.error({ msg: 'Failed to fetch businesses for billing sync', error: fetchError.message });
      return NextResponse.json({ error: 'Failed to fetch businesses' }, { status: 500 });
    }

    for (const business of businesses || []) {
      results.processed++;
      const syncResult: SyncResult = {
        businessId: business.id,
        subscriptionId: business.stripe_subscription_id,
        changes: [],
      };

      try {
        // Fetch subscription from Stripe
        const subscription = await stripe.subscriptions.retrieve(business.stripe_subscription_id);

        const updates: Record<string, unknown> = {};

        // Check status mismatch
        if (subscription.status !== business.stripe_subscription_status) {
          updates.stripe_subscription_status = subscription.status;
          syncResult.changes.push(`status: ${business.stripe_subscription_status} → ${subscription.status}`);
        }

        // Check period end mismatch
        const stripePeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        if (business.current_period_end !== stripePeriodEnd) {
          updates.current_period_end = stripePeriodEnd;
          syncResult.changes.push(`period_end updated`);
        }

        // Check cancel_at_period_end
        if (subscription.cancel_at_period_end !== undefined) {
          const currentCancel = await supabase
            .from('businesses')
            .select('cancel_at_period_end')
            .eq('id', business.id)
            .single();

          if (currentCancel.data?.cancel_at_period_end !== subscription.cancel_at_period_end) {
            updates.cancel_at_period_end = subscription.cancel_at_period_end;
            syncResult.changes.push(`cancel_at_period_end: ${subscription.cancel_at_period_end}`);
          }
        }

        // Determine plan tier from price
        const priceId = subscription.items.data[0]?.price.id;
        let expectedTier = business.plan_tier;

        if (priceId === process.env.STRIPE_PRICE_STARTER_MONTHLY) {
          expectedTier = 'starter';
        } else if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) {
          expectedTier = 'pro';
        } else if (priceId === process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY) {
          expectedTier = 'enterprise';
        }

        if (expectedTier !== business.plan_tier && expectedTier) {
          updates.plan_tier = expectedTier;
          syncResult.changes.push(`plan_tier: ${business.plan_tier} → ${expectedTier}`);
        }

        // Apply updates if any
        if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date().toISOString();

          const { error: updateError } = await supabase
            .from('businesses')
            .update(updates)
            .eq('id', business.id);

          if (updateError) {
            syncResult.error = updateError.message;
            results.errors++;
          } else {
            results.synced++;
          }
        }

        if (syncResult.changes.length > 0 || syncResult.error) {
          results.details.push(syncResult);
        }
      } catch (stripeError) {
        // Handle Stripe API errors (e.g., subscription deleted)
        const errorMessage = stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error';
        syncResult.error = errorMessage;
        results.errors++;

        // If subscription not found in Stripe, mark as canceled
        if (errorMessage.includes('No such subscription')) {
          await supabase
            .from('businesses')
            .update({
              stripe_subscription_status: 'canceled',
              updated_at: new Date().toISOString(),
            })
            .eq('id', business.id);
          syncResult.changes.push('status → canceled (subscription not found in Stripe)');
        }

        results.details.push(syncResult);
      }
    }

    apiLogger.info({
      msg: 'Billing sync completed',
      processed: results.processed,
      synced: results.synced,
      errors: results.errors,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Billing sync cron error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync job failed' },
      { status: 500 }
    );
  }
}
