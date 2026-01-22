// =====================================================
// PORTAL LEAD CAPTAIN PRICE LIST BY ID API
// PATCH /api/portal/lead-captain/price-list/[id] - Update price item
// DELETE /api/portal/lead-captain/price-list/[id] - Delete price item
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import type { UpdatePortalPriceItemRequest } from '@/types/portal/lead-captain';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const body: UpdatePortalPriceItemRequest = await request.json();
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

    // Verify the item belongs to this config
    const { data: existing } = await supabase
      .from('leads_captain_price_list')
      .select('id, config_id')
      .eq('id', id)
      .single();

    if (!existing || existing.config_id !== config.id) {
      return NextResponse.json({ error: 'Price item not found' }, { status: 404 });
    }

    // Build update object
    const updates: Record<string, unknown> = {};

    if (body.service_name !== undefined) updates.service_name = body.service_name;
    if (body.price_min !== undefined) updates.price_min = body.price_min;
    if (body.price_max !== undefined) updates.price_max = body.price_max;
    if (body.price_note !== undefined) updates.price_note = body.price_note;
    if (body.display_order !== undefined) updates.display_order = body.display_order;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    const { data: item, error } = await supabase
      .from('leads_captain_price_list')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    apiLogger.info({
      msg: 'Portal price list item updated',
      businessId: session.businessId,
      itemId: id,
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal Lead Captain price-list PATCH error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to update price list item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Verify the item belongs to this config
    const { data: existing } = await supabase
      .from('leads_captain_price_list')
      .select('id, config_id')
      .eq('id', id)
      .single();

    if (!existing || existing.config_id !== config.id) {
      return NextResponse.json({ error: 'Price item not found' }, { status: 404 });
    }

    // Delete the item
    const { error } = await supabase
      .from('leads_captain_price_list')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    apiLogger.info({
      msg: 'Portal price list item deleted',
      businessId: session.businessId,
      itemId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal Lead Captain price-list DELETE error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to delete price list item' },
      { status: 500 }
    );
  }
}
