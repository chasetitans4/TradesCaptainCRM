// =====================================================
// INVOICE DETAIL API
// GET /api/invoices/[id] - Get invoice details
// PATCH /api/invoices/[id] - Update invoice
// DELETE /api/invoices/[id] - Delete invoice (draft only)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import { calculateInvoiceTotals } from '@/lib/invoices';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers (*),
        items:invoice_items (*),
        payments (*)
      `)
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Error fetching invoice:', error);
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

    // Get current invoice
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('status, total, amount_paid')
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const updates: any = {};

    // Handle status update
    if (body.status !== undefined) {
      // Validate status transitions
      const validStatuses = ['draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'void'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = body.status;
    }

    // Handle simple field updates (only for draft invoices)
    if (invoice.status === 'draft') {
      if (body.customer_notes !== undefined) updates.customer_notes = body.customer_notes;
      if (body.terms !== undefined) updates.terms = body.terms;
      if (body.notes !== undefined) updates.notes = body.notes;
      if (body.due_date !== undefined) updates.due_date = body.due_date;

      // Handle line items update
      if (body.items) {
        const { tax_rate = 0, discount_amount = 0 } = body;
        const totals = calculateInvoiceTotals(body.items, tax_rate, discount_amount, invoice.amount_paid);

        updates.subtotal = totals.subtotal;
        updates.tax_rate = tax_rate;
        updates.tax_amount = totals.tax_amount;
        updates.discount_amount = discount_amount;
        updates.total = totals.total;
        updates.amount_due = totals.amount_due;

        // Delete existing items
        await supabase.from('invoice_items').delete().eq('invoice_id', id);

        // Insert new items
        const lineItems = body.items.map((item: any, index: number) => ({
          invoice_id: id,
          saved_service_id: item.saved_service_id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price,
          is_taxable: item.is_taxable ?? true,
          sort_order: item.sort_order ?? index,
        }));

        await supabase.from('invoice_items').insert(lineItems);
      }
    }

    // Update the invoice
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        console.error('Error updating invoice:', updateError);
        return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // Get current invoice
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('status')
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Only allow deleting draft invoices
    if (invoice.status !== 'draft') {
      return NextResponse.json({ error: 'Can only delete draft invoices' }, { status: 400 });
    }

    // Delete items first
    await supabase.from('invoice_items').delete().eq('invoice_id', id);

    // Delete invoice
    const { error: deleteError } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting invoice:', deleteError);
      return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
