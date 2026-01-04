// =====================================================
// Leads Captain v2 Price List Item API
// PUT /api/leads-captain/v2/price-list/[id] - Update item
// DELETE /api/leads-captain/v2/price-list/[id] - Delete item
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import type { UpdatePriceItemRequest } from '@/types/leads-captain';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();
    const body: UpdatePriceItemRequest = await request.json();

    // Get config ID for authorization
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', profile.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    // Check if item exists and belongs to this business
    const { data: existing } = await supabase
      .from('leads_captain_price_list')
      .select('id')
      .eq('id', id)
      .eq('config_id', config.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Price item not found' }, { status: 404 });
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    const allowedFields = ['service_name', 'price_min', 'price_max', 'price_note', 'display_order', 'is_active'];

    for (const field of allowedFields) {
      if (body[field as keyof UpdatePriceItemRequest] !== undefined) {
        updateData[field] = body[field as keyof UpdatePriceItemRequest];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: item, error } = await supabase
      .from('leads_captain_price_list')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ item });
  } catch (error) {
    apiLogger.error({
      message: 'Error updating price item',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update price item' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Get config ID for authorization
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', profile.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    // Check if item exists
    const { data: existing } = await supabase
      .from('leads_captain_price_list')
      .select('id')
      .eq('id', id)
      .eq('config_id', config.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Price item not found' }, { status: 404 });
    }

    // Delete item
    const { error } = await supabase
      .from('leads_captain_price_list')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({
      message: 'Error deleting price item',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete price item' },
      { status: 500 }
    );
  }
}
