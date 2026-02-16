/**
 * ACH Payment Setup API
 * POST /api/payments/ach/setup
 *
 * Creates a PaymentIntent for ACH bank transfer payment.
 * Returns client secret for Stripe.js to collect bank account.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import {
  createAchPaymentIntent,
  getOrCreateCustomerForAch,
  getFeeComparison,
} from '@/lib/stripe/ach';
import { checkAchRateLimit } from '@/lib/rate-limit';

interface SetupRequest {
  invoiceId: string;
  customerEmail: string;
  customerName: string;
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

    const body: SetupRequest = await request.json();
    const { invoiceId, customerEmail, customerName } = body;

    if (!invoiceId || !customerEmail || !customerName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        amount,
        status,
        business_id,
        customer_id,
        businesses (
          id,
          stripe_account_id
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check invoice status
    if (invoice.status === 'PAID') {
      return NextResponse.json(
        { error: 'Invoice is already paid' },
        { status: 400 }
      );
    }

    // Get connected account ID
    const business = (invoice.businesses as any)[0] as { id: string; stripe_account_id: string | null };
    const connectedAccountId = business?.stripe_account_id;

    if (!connectedAccountId) {
      return NextResponse.json(
        { error: 'Business has not set up Stripe payments' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const customerResult = await getOrCreateCustomerForAch(
      customerEmail,
      customerName,
      invoice.business_id
    );

    if (!customerResult.success || !customerResult.customerId) {
      return NextResponse.json(
        { error: customerResult.error || 'Failed to create customer' },
        { status: 500 }
      );
    }

    // Create ACH PaymentIntent
    const paymentResult = await createAchPaymentIntent(
      invoice.amount,
      invoiceId,
      customerResult.customerId,
      connectedAccountId,
      {
        customer_email: customerEmail,
        customer_name: customerName,
        business_id: invoice.business_id,
      }
    );

    if (!paymentResult.success || !paymentResult.paymentIntent) {
      return NextResponse.json(
        { error: paymentResult.error || 'Failed to create payment' },
        { status: 500 }
      );
    }

    // Calculate fee comparison
    const fees = getFeeComparison(invoice.amount);

    // Update invoice with payment intent ID
    await supabase
      .from('invoices')
      .update({
        ach_payment_intent_id: paymentResult.paymentIntent.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    return NextResponse.json({
      clientSecret: paymentResult.paymentIntent.clientSecret,
      paymentIntentId: paymentResult.paymentIntent.id,
      amount: invoice.amount,
      fees,
      settlementInfo: {
        estimatedDays: '3-5 business days',
        message: 'ACH payments typically take 3-5 business days to process',
      },
    });
  } catch (error) {
    console.error('[ACH Setup] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
