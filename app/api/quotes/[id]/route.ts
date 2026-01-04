// =====================================================
// QUOTE DETAIL API
// GET /api/quotes/[id] - Get quote details
// PATCH /api/quotes/[id] - Update quote
// DELETE /api/quotes/[id] - Delete quote (draft only)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import { calculateQuoteTotals } from '@/lib/quotes';
import { apiLogger } from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: quote, error } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers (*),
        items:quote_items (*)
      `)
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (error || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    return NextResponse.json({ quote });
  } catch (error) {
    apiLogger.error({ error, context: 'fetching quote' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const supabase = await createServerSupabaseClient();

    // Get current quote
    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select('status')
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (fetchError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Only allow editing draft quotes
    if (quote.status !== 'draft' && body.items) {
      return NextResponse.json({ error: 'Can only edit draft quotes' }, { status: 400 });
    }

    const updates: any = {};

    // Handle simple field updates
    if (body.customer_notes !== undefined) updates.customer_notes = body.customer_notes;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.terms !== undefined) updates.terms = body.terms;
    if (body.status !== undefined) updates.status = body.status;
    if (body.valid_until !== undefined) updates.valid_until = body.valid_until;

    // Handle line items update
    if (body.items) {
      const { tax_rate = 0, discount_amount = 0 } = body;
      const totals = calculateQuoteTotals(body.items, tax_rate, discount_amount);

      updates.subtotal = totals.subtotal;
      updates.tax_rate = tax_rate;
      updates.tax_amount = totals.tax_amount;
      updates.discount_amount = discount_amount;
      updates.total = totals.total;

      // Delete existing items
      await supabase.from('quote_items').delete().eq('quote_id', id);

      // Insert new items
      const lineItems = body.items.map((item: any, index: number) => ({
        quote_id: id,
        saved_service_id: item.saved_service_id,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
        is_taxable: item.is_taxable ?? true,
        sort_order: item.sort_order ?? index,
      }));

      await supabase.from('quote_items').insert(lineItems);
    }

    // Update the quote
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('quotes')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        apiLogger.error({ error: updateError, context: 'updating quote' });
        return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error, context: 'updating quote' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // Get current quote
    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select('status')
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (fetchError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Only allow deleting draft quotes
    if (quote.status !== 'draft') {
      return NextResponse.json({ error: 'Can only delete draft quotes' }, { status: 400 });
    }

    // Delete items first
    await supabase.from('quote_items').delete().eq('quote_id', id);

    // Delete quote
    const { error: deleteError } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      apiLogger.error({ error: deleteError, context: 'deleting quote' });
      return NextResponse.json({ error: 'Failed to delete quote' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error, context: 'deleting quote' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
