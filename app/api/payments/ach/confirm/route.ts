/**
 * ACH Payment Confirmation API
 * POST /api/payments/ach/confirm
 *
 * Confirms an ACH payment after bank account collection.
 * Updates invoice status to processing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import {
  confirmAchPayment,
  getAchPaymentIntent,
  getAchPaymentStatusInfo,
} from '@/lib/stripe/ach';
import { checkAchRateLimit } from '@/lib/rate-limit';

interface ConfirmRequest {
  paymentIntentId: string;
  paymentMethodId: string;
  invoiceId: string;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit per IP to prevent abuse
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimit = await checkAchRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': (rateLimit.retryAfter || 300).toString() } }
      );
    }

    const body: ConfirmRequest = await request.json();
    const { paymentIntentId, paymentMethodId, invoiceId } = body;

    if (!paymentIntentId || !paymentMethodId || !invoiceId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify invoice exists and matches payment intent
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, status, ach_payment_intent_id')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    if (invoice.status === 'PAID') {
      return NextResponse.json(
        { error: 'Invoice is already paid' },
        { status: 400 }
      );
    }

    // Verify payment intent matches
    if (invoice.ach_payment_intent_id !== paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent does not match invoice' },
        { status: 400 }
      );
    }

    // Confirm the payment
    const result = await confirmAchPayment(paymentIntentId, paymentMethodId);

    if (!result.success || !result.paymentIntent) {
      return NextResponse.json(
        { error: result.error || 'Failed to confirm payment' },
        { status: 500 }
      );
    }

    // Get status info
    const statusInfo = getAchPaymentStatusInfo(result.paymentIntent.status);

    // Update invoice status based on payment status
    let invoiceStatus = 'PENDING';
    if (result.paymentIntent.status === 'processing') {
      invoiceStatus = 'PROCESSING';
    } else if (result.paymentIntent.status === 'succeeded') {
      invoiceStatus = 'PAID';
    } else if (result.paymentIntent.status === 'failed') {
      invoiceStatus = 'FAILED';
    }

    await supabase
      .from('invoices')
      .update({
        status: invoiceStatus,
        payment_method: 'ACH',
        ach_payment_status: result.paymentIntent.status,
        updated_at: new Date().toISOString(),
        ...(invoiceStatus === 'PAID' && {
          paid_at: new Date().toISOString(),
        }),
      })
      .eq('id', invoiceId);

    // Log activity
    const { data: invoiceWithCustomer } = await supabase
      .from('invoices')
      .select('customer_id, business_id')
      .eq('id', invoiceId)
      .single();

    if (invoiceWithCustomer) {
      await supabase.from('customer_activity').insert({
        customer_id: invoiceWithCustomer.customer_id,
        business_id: invoiceWithCustomer.business_id,
        activity_type: 'PAYMENT_INITIATED',
        description: `ACH payment initiated - ${statusInfo.message}`,
        metadata: {
          invoice_id: invoiceId,
          payment_intent_id: paymentIntentId,
          payment_method: 'ACH',
          status: result.paymentIntent.status,
        },
      });
    }

    return NextResponse.json({
      success: true,
      status: result.paymentIntent.status,
      statusInfo,
      invoiceStatus,
    });
  } catch (error) {
    console.error('[ACH Confirm] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/ach/confirm?paymentIntentId=xxx
 *
 * Check the status of an ACH payment
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentIntentId = searchParams.get('paymentIntentId');

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'paymentIntentId is required' },
        { status: 400 }
      );
    }

    const result = await getAchPaymentIntent(paymentIntentId);

    if (!result.success || !result.paymentIntent) {
      return NextResponse.json(
        { error: result.error || 'Failed to get payment status' },
        { status: 500 }
      );
    }

    const statusInfo = getAchPaymentStatusInfo(result.paymentIntent.status);

    return NextResponse.json({
      status: result.paymentIntent.status,
      statusInfo,
      amount: result.paymentIntent.amount,
    });
  } catch (error) {
    console.error('[ACH Status] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
