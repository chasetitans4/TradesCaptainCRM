// =====================================================
// GENERATE PAYMENT LINK API
// POST /api/invoices/[id]/payment-link - Generate Stripe payment link
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import { generatePaymentLinkForInvoice } from '@/lib/invoices';
import { apiLogger } from '@/lib/logger';

export async function POST(
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

    // Verify invoice belongs to user's business
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, status, amount_due, stripe_payment_link_url')
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check if payment link already exists
    if (invoice.stripe_payment_link_url) {
      return NextResponse.json({ url: invoice.stripe_payment_link_url });
    }

    // Cannot generate for voided or paid invoices
    if (invoice.status === 'void') {
      return NextResponse.json(
        { error: 'Cannot generate payment link for voided invoice' },
        { status: 400 }
      );
    }

    if (invoice.amount_due <= 0) {
      return NextResponse.json(
        { error: 'Invoice is already paid' },
        { status: 400 }
      );
    }

    try {
      const url = await generatePaymentLinkForInvoice(id);
      return NextResponse.json({ url });
    } catch (error) {
      apiLogger.error({ message: 'Error generating payment link', error });
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to generate payment link' },
        { status: 500 }
      );
    }
  } catch (error) {
    apiLogger.error({ message: 'Error in payment link API', error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
