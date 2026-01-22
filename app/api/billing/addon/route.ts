// =====================================================
// ADDON BILLING API (v6.3)
// GET/POST/DELETE /api/billing/addon
// Manage add-on subscriptions (Leads Captain, Extra Users)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { stripe, isStripeConfigured } from '@/lib/stripe/client';
import { apiLogger } from '@/lib/logger';

// Addon price IDs from environment
const ADDON_PRICES = {
  leads_captain: {
    monthly: process.env.STRIPE_PRICE_LEADS_CAPTAIN_ADDON_MONTHLY,
    annual: process.env.STRIPE_PRICE_LEADS_CAPTAIN_ADDON_ANNUAL,
    price: 49,
  },
  extra_user: {
    monthly: process.env.STRIPE_PRICE_EXTRA_USER_MONTHLY,
    annual: process.env.STRIPE_PRICE_EXTRA_USER_MONTHLY, // Extra users billed monthly only
    price: 10,
  },
};

// GET - Get addon status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business
    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Get addon subscriptions
    const { data: addons } = await supabase
      .from('addon_subscriptions')
      .select('*')
      .eq('business_id', userData.business_id)
      .eq('status', 'active');

    // Get business for flags
    const { data: business } = await supabase
      .from('businesses')
      .select('has_leads_captain_addon, plan_type')
      .eq('id', userData.business_id)
      .single();

    return NextResponse.json({
      addons: addons || [],
      hasLeadsCaptainAddon: business?.has_leads_captain_addon ?? false,
      planType: business?.plan_type,
      availableAddons: [
        {
          id: 'leads_captain',
          name: 'Leads Captain',
          description: 'AI-powered missed call text-back with SMS automation',
          price: 49,
          billing: 'monthly',
          purchased: addons?.some(a => a.addon_type === 'leads_captain') ?? false,
        },
      ],
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Get addons error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to get addons' }, { status: 500 });
  }
}

// POST - Purchase addon
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { addonType, billing = 'monthly' } = body;

    if (!addonType || !['leads_captain', 'extra_user'].includes(addonType)) {
      return NextResponse.json({ error: 'Invalid addon type' }, { status: 400 });
    }

    // Get user's business
    const { data: userData } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Only owners and admins can purchase addons
    if (!['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if already has this addon
    const { data: existingAddon } = await supabase
      .from('addon_subscriptions')
      .select('id')
      .eq('business_id', userData.business_id)
      .eq('addon_type', addonType)
      .eq('status', 'active')
      .single();

    if (existingAddon) {
      return NextResponse.json({ error: 'You already have this addon' }, { status: 400 });
    }

    // Get business Stripe info
    const { data: business } = await supabase
      .from('businesses')
      .select('stripe_customer_id, stripe_subscription_id, plan_type')
      .eq('id', userData.business_id)
      .single();

    // If Stripe is not configured or no subscription, handle manually
    if (!isStripeConfigured() || !business?.stripe_subscription_id) {
      // Create addon record without Stripe
      const { error: insertError } = await supabase
        .from('addon_subscriptions')
        .insert({
          business_id: userData.business_id,
          addon_type: addonType,
          status: 'active',
          quantity: 1,
        });

      if (insertError) throw insertError;

      // Update business flag
      if (addonType === 'leads_captain') {
        await supabase
          .from('businesses')
          .update({ has_leads_captain_addon: true })
          .eq('id', userData.business_id);
      }

      apiLogger.info({
        msg: 'Addon purchased (manual)',
        businessId: userData.business_id,
        addonType,
        userId: user.id,
      });

      return NextResponse.json({
        success: true,
        message: 'Addon activated successfully',
      });
    }

    // Get the price ID for this addon
    const addonConfig = ADDON_PRICES[addonType as keyof typeof ADDON_PRICES];
    const priceId = billing === 'annual' ? addonConfig.annual : addonConfig.monthly;

    if (!priceId) {
      return NextResponse.json({
        error: 'Stripe price not configured for this addon',
      }, { status: 500 });
    }

    // Add the addon to the existing subscription
    const subscriptionItem = await stripe.subscriptionItems.create({
      subscription: business.stripe_subscription_id,
      price: priceId,
      quantity: 1,
    });

    // Record the addon in our database
    const { error: insertError } = await supabase
      .from('addon_subscriptions')
      .insert({
        business_id: userData.business_id,
        addon_type: addonType,
        stripe_subscription_item_id: subscriptionItem.id,
        stripe_price_id: priceId,
        status: 'active',
        quantity: 1,
      });

    if (insertError) throw insertError;

    // Update business flag
    if (addonType === 'leads_captain') {
      await supabase
        .from('businesses')
        .update({ has_leads_captain_addon: true })
        .eq('id', userData.business_id);
    }

    // Log the purchase
    await supabase.from('business_audit_log').insert({
      business_id: userData.business_id,
      user_id: user.id,
      action: 'addon_purchased',
      entity_type: 'billing',
      details: { addonType, priceId, subscriptionItemId: subscriptionItem.id },
    });

    apiLogger.info({
      msg: 'Addon purchased',
      businessId: userData.business_id,
      addonType,
      subscriptionItemId: subscriptionItem.id,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Addon added to your subscription',
      subscriptionItemId: subscriptionItem.id,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Purchase addon error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to purchase addon' }, { status: 500 });
  }
}

// DELETE - Cancel addon
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const addonType = searchParams.get('addonType');

    if (!addonType) {
      return NextResponse.json({ error: 'addonType is required' }, { status: 400 });
    }

    // Get user's business
    const { data: userData } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Only owners and admins can cancel addons
    if (!['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get the addon subscription
    const { data: addon } = await supabase
      .from('addon_subscriptions')
      .select('*')
      .eq('business_id', userData.business_id)
      .eq('addon_type', addonType)
      .eq('status', 'active')
      .single();

    if (!addon) {
      return NextResponse.json({ error: 'Addon not found' }, { status: 404 });
    }

    // Cancel in Stripe if we have a subscription item
    if (addon.stripe_subscription_item_id && isStripeConfigured()) {
      try {
        await stripe.subscriptionItems.del(addon.stripe_subscription_item_id);
      } catch (stripeError) {
        apiLogger.warn({
          msg: 'Failed to cancel Stripe subscription item',
          error: stripeError instanceof Error ? stripeError.message : 'Unknown error',
          subscriptionItemId: addon.stripe_subscription_item_id,
        });
      }
    }

    // Update our record
    await supabase
      .from('addon_subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', addon.id);

    // Update business flag
    if (addonType === 'leads_captain') {
      await supabase
        .from('businesses')
        .update({
          has_leads_captain_addon: false,
          ai_sms_enabled: false, // Also disable AI services
        })
        .eq('id', userData.business_id);
    }

    // Log the cancellation
    await supabase.from('business_audit_log').insert({
      business_id: userData.business_id,
      user_id: user.id,
      action: 'addon_canceled',
      entity_type: 'billing',
      details: { addonType, addonId: addon.id },
    });

    apiLogger.info({
      msg: 'Addon canceled',
      businessId: userData.business_id,
      addonType,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Addon canceled successfully',
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Cancel addon error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to cancel addon' }, { status: 500 });
  }
}
