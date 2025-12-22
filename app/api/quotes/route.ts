// =====================================================
// QUOTES API
// POST /api/quotes - Create a new quote
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import { generateQuoteNumber, generateAccessToken, calculateQuoteTotals, sendQuoteViaSms } from '@/lib/quotes';

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
      lead_id,
      items,
      tax_rate = 0,
      discount_amount = 0,
      valid_days = 30,
      customer_notes,
      notes,
      terms,
      send_immediately = false,
    } = body;

    if (!customer_id) {
      return NextResponse.json({ error: 'Customer is required' }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Generate quote number
    const quoteNumber = await generateQuoteNumber(profile.business_id);

    // Calculate totals
    const totals = calculateQuoteTotals(items, tax_rate, discount_amount);

    // Calculate valid until date
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + valid_days);

    // Create the quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        business_id: profile.business_id,
        customer_id,
        job_id,
        lead_id,
        quote_number: quoteNumber,
        status: 'draft',
        subtotal: totals.subtotal,
        tax_rate,
        tax_amount: totals.tax_amount,
        discount_amount,
        total: totals.total,
        customer_notes,
        notes,
        terms,
        valid_until: validUntil.toISOString().split('T')[0],
        access_token: generateAccessToken(),
        created_by: profile.id,
      })
      .select('id')
      .single();

    if (quoteError || !quote) {
      console.error('Error creating quote:', quoteError);
      return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
    }

    // Create line items
    const lineItems = items.map((item: any, index: number) => ({
      quote_id: quote.id,
      saved_service_id: item.saved_service_id,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
      is_taxable: item.is_taxable ?? true,
      sort_order: item.sort_order ?? index,
    }));

    const { error: itemsError } = await supabase.from('quote_items').insert(lineItems);

    if (itemsError) {
      console.error('Error creating quote items:', itemsError);
      // Clean up the quote if items failed
      await supabase.from('quotes').delete().eq('id', quote.id);
      return NextResponse.json({ error: 'Failed to create quote items' }, { status: 500 });
    }

    // Send immediately if requested
    if (send_immediately) {
      try {
        await sendQuoteViaSms(quote.id);
      } catch (error) {
        console.error('Error sending quote:', error);
        // Quote was created, just failed to send
      }
    }

    return NextResponse.json({ quote: { id: quote.id, quote_number: quoteNumber } });
  } catch (error) {
    console.error('Error in quotes API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
