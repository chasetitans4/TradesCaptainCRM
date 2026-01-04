// =====================================================
// INVOICES API
// POST /api/invoices - Create a new invoice
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import { generateInvoiceNumber, generateAccessToken, calculateInvoiceTotals, sendInvoiceViaSms } from '@/lib/invoices';
import { apiLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      customer_id,
      job_id,
      quote_id,
      items,
      tax_rate = 0,
      discount_amount = 0,
      due_date,
      customer_notes,
      terms,
      notes,
      send_immediately = false,
    } = body;

    if (!customer_id) {
      return NextResponse.json({ error: 'Customer is required' }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(profile.business_id);

    // Calculate totals
    const totals = calculateInvoiceTotals(items, tax_rate, discount_amount);

    // Get due date from business settings if not provided
    let finalDueDate = due_date;
    if (!finalDueDate) {
      const { data: business } = await supabase
        .from('businesses')
        .select('invoice_due_days')
        .eq('id', profile.business_id)
        .single();

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (business?.invoice_due_days || 30));
      finalDueDate = dueDate.toISOString().split('T')[0];
    }

    // Create the invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        business_id: profile.business_id,
        customer_id,
        job_id,
        quote_id,
        invoice_number: invoiceNumber,
        status: 'draft',
        subtotal: totals.subtotal,
        tax_rate,
        tax_amount: totals.tax_amount,
        discount_amount,
        total: totals.total,
        amount_due: totals.total,
        amount_paid: 0,
        customer_notes,
        terms,
        notes,
        due_date: finalDueDate,
        access_token: generateAccessToken(),
        created_by: profile.id,
      })
      .select('id')
      .single();

    if (invoiceError || !invoice) {
      apiLogger.error({ message: 'Error creating invoice', error: invoiceError });
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
    }

    // Create line items
    const lineItems = items.map((item: any, index: number) => ({
      invoice_id: invoice.id,
      saved_service_id: item.saved_service_id,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
      is_taxable: item.is_taxable ?? true,
      sort_order: item.sort_order ?? index,
    }));

    const { error: itemsError } = await supabase.from('invoice_items').insert(lineItems);

    if (itemsError) {
      apiLogger.error({ message: 'Error creating invoice items', error: itemsError });
      // Clean up the invoice if items failed
      await supabase.from('invoices').delete().eq('id', invoice.id);
      return NextResponse.json({ error: 'Failed to create invoice items' }, { status: 500 });
    }

    // Send immediately if requested
    if (send_immediately) {
      try {
        await sendInvoiceViaSms(invoice.id);
      } catch (error) {
        apiLogger.error({ message: 'Error sending invoice', error });
        // Invoice was created, just failed to send
      }
    }

    return NextResponse.json({ invoice: { id: invoice.id, invoice_number: invoiceNumber } });
  } catch (error) {
    apiLogger.error({ message: 'Error in invoices API', error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
