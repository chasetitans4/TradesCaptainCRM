// =====================================================
// INVOICE REFUND API
// POST /api/invoices/[id]/refund - Process a refund for an invoice payment
// GET /api/invoices/[id]/refund - Get refund history for an invoice
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import { createRefund, getInvoiceRefunds, getRefundableAmount, RefundReason } from '@/lib/stripe/refunds';
import { apiLogger } from '@/lib/logger';

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

    // Verify invoice belongs to user's business
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id')
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const refunds = await getInvoiceRefunds(id);
    return NextResponse.json({ refunds });
  } catch (error) {
    apiLogger.error({
      msg: 'Error fetching refunds',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
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
    const { paymentId, amount, reason, notes } = body;

    // Validate required fields
    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    const validReasons: RefundReason[] = ['duplicate', 'fraudulent', 'requested_by_customer'];
    if (!reason || !validReasons.includes(reason)) {
      return NextResponse.json({ error: 'Valid reason is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Verify invoice belongs to user's business
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, status, amount_paid')
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check if invoice status allows refunds
    if (invoice.status === 'void' || invoice.status === 'draft') {
      return NextResponse.json(
        { error: 'Cannot refund void or draft invoices' },
        { status: 400 }
      );
    }

    // Check if there's anything to refund
    if (!invoice.amount_paid || invoice.amount_paid <= 0) {
      return NextResponse.json(
        { error: 'No payments to refund on this invoice' },
        { status: 400 }
      );
    }

    // Verify payment belongs to this invoice
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, amount')
      .eq('id', paymentId)
      .eq('invoice_id', id)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Check refundable amount
    const refundInfo = await getRefundableAmount(paymentId);
    if (numericAmount > refundInfo.availableToRefund) {
      return NextResponse.json(
        {
          error: `Maximum refundable amount is $${refundInfo.availableToRefund.toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    // Process refund
    const result = await createRefund(
      id,
      paymentId,
      numericAmount,
      reason as RefundReason,
      notes || null,
      profile.id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    apiLogger.info({
      msg: 'Refund processed',
      invoiceId: id,
      paymentId,
      amount: numericAmount,
      refundId: result.refundId,
      userId: profile.id,
    });

    return NextResponse.json({
      success: true,
      refundId: result.refundId,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Error processing refund',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to process refund' }, { status: 500 });
  }
}
