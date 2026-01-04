// =====================================================
// Leads Captain v2 Price List API
// GET /api/leads-captain/v2/price-list - List price items
// POST /api/leads-captain/v2/price-list - Create price item
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { checkPlanLimit } from '@/lib/leads-captain/v2/features';
import { apiLogger } from '@/lib/logger';
import type { CreatePriceItemRequest } from '@/types/leads-captain';

export async function GET() {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get config ID
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', profile.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    const { data: items, error } = await supabase
      .from('leads_captain_price_list')
      .select('*')
      .eq('config_id', config.id)
      .order('display_order', { ascending: true });

    if (error) throw error;

    // Get limit info
    const limitInfo = await checkPlanLimit(profile.business_id, 'price_list_items');

    return NextResponse.json({
      items: items || [],
      total: items?.length || 0,
      limits: limitInfo,
    });
  } catch (error) {
    apiLogger.error({
      message: 'Error fetching price list',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch price list' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const body: CreatePriceItemRequest = await request.json();

    if (!body.service_name) {
      return NextResponse.json({ error: 'Service name is required' }, { status: 400 });
    }

    // Get config ID
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', profile.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    // Check plan limit
    const limitInfo = await checkPlanLimit(profile.business_id, 'price_list_items');
    if (!limitInfo.allowed) {
      return NextResponse.json(
        {
          error: `Price list limit reached (${limitInfo.max}). Upgrade your plan to add more.`,
          limit_info: limitInfo,
        },
        { status: 403 }
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

    const { data: item, error } = await supabase
      .from('leads_captain_price_list')
      .insert({
        config_id: config.id,
        service_name: body.service_name,
        price_min: body.price_min || null,
        price_max: body.price_max || null,
        price_note: body.price_note || null,
        display_order: displayOrder,
        is_active: body.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    apiLogger.error({
      message: 'Error creating price item',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create price item' },
      { status: 500 }
    );
  }
}
