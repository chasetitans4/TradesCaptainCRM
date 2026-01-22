// =====================================================
// PORTAL LEAD CAPTAIN PRICE LIST API
// GET /api/portal/lead-captain/price-list - List price items
// POST /api/portal/lead-captain/price-list - Create price item
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import { PLAN_FEATURE_LIMITS, PlanTier } from '@/types/leads-captain';
import type { CreatePortalPriceItemRequest } from '@/types/portal/lead-captain';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    // Verify portal session
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify business ID matches session
    if (businessId && session.businessId !== businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get config_id for this business
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', session.businessId)
      .single();

    if (!config) {
      return NextResponse.json({ items: [], total: 0 });
    }

    const { data: items, error } = await supabase
      .from('leads_captain_price_list')
      .select('*')
      .eq('config_id', config.id)
      .order('display_order', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      items: items || [],
      total: items?.length || 0,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal Lead Captain price-list GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to get price list' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // SECURITY WARNING: This endpoint exposes business configuration to customers.
  return NextResponse.json({ error: 'Endpoint disabled for security reasons' }, { status: 403 });

  /*
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    // Verify portal session
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify business ID matches session
    if (businessId && session.businessId !== businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreatePortalPriceItemRequest = await request.json();
    const supabase = createAdminClient();

    // Get config for this business
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', session.businessId)
      .single();

    if (!config) {
      return NextResponse.json(
        { error: 'Lead Captain not configured' },
        { status: 400 }
      );
    }

    // Check plan limits
    const { count } = await supabase
      .from('leads_captain_price_list')
      .select('*', { count: 'exact', head: true })
      .eq('config_id', config.id);

    // Get business plan tier (default to silver if not found)
    const { data: business } = await supabase
      .from('businesses')
      .select('plan_tier')
      .eq('id', session.businessId)
      .single();

    const planTier = (business?.plan_tier || 'silver') as PlanTier;
    const limits = PLAN_FEATURE_LIMITS[planTier];

    if ((count || 0) >= limits.max_price_list_items) {
      return NextResponse.json(
        {
          error: `Maximum of ${limits.max_price_list_items} price list items allowed on your plan`,
        },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.service_name) {
      return NextResponse.json(
        { error: 'Service name is required' },
        { status: 400 }
      );
    }

    // Get next display order
    const { data: maxOrder } = await supabase
      .from('leads_captain_price_list')
      .select('display_order')
      .eq('config_id', config.id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const displayOrder = body.display_order ?? ((maxOrder?.display_order || 0) + 1);

    // Create price item
    const { data: item, error } = await supabase
      .from('leads_captain_price_list')
      .insert({
        config_id: config.id,
        service_name: body.service_name,
        price_min: body.price_min ?? null,
        price_max: body.price_max ?? null,
        price_note: body.price_note ?? null,
        display_order: displayOrder,
        is_active: body.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    apiLogger.info({
      msg: 'Portal price list item created',
      businessId: session.businessId,
      itemId: item.id,
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal Lead Captain price-list POST error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to create price list item' },
      { status: 500 }
    );
  }
  */
}
