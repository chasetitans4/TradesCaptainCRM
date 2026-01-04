// =====================================================
// STRIPE REFUND FUNCTIONS
// Handle refund creation and tracking
// =====================================================

import { stripe, isStripeConfigured } from './client';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const refundLogger = logger.child({ context: 'stripe.refunds' });

export type RefundReason = 'duplicate' | 'fraudulent' | 'requested_by_customer';

export interface RefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
}

export interface RefundRecord {
  id: string;
  invoice_id: string;
  payment_id: string | null;
  stripe_refund_id: string | null;
  amount: number;
  reason: RefundReason | string;
  notes: string | null;
  refunded_by: string;
  created_at: string;
}

/**
 * Create a refund in Stripe and record it in the database
 */
export async function createRefund(
  invoiceId: string,
  paymentId: string,
  amount: number,
  reason: RefundReason,
  notes: string | null,
  refundedBy: string
): Promise<RefundResult> {
  const supabase = await createClient();

  // Get the payment record to find the Stripe charge/payment intent
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('id, invoice_id, amount, stripe_payment_intent_id, stripe_charge_id')
    .eq('id', paymentId)
    .single();

  if (paymentError || !payment) {
    return { success: false, error: 'Payment not found' };
  }

  // Validate refund amount
  if (amount <= 0) {
    return { success: false, error: 'Refund amount must be greater than 0' };
  }

  // Check existing refunds for this payment
  const { data: existingRefunds } = await supabase
    .from('invoice_refunds')
    .select('amount')
    .eq('payment_id', paymentId);

  const totalRefunded = (existingRefunds || []).reduce((sum, r) => sum + r.amount, 0);
  const availableToRefund = payment.amount - totalRefunded;

  if (amount > availableToRefund) {
    return {
      success: false,
      error: `Cannot refund more than available amount ($${availableToRefund.toFixed(2)})`,
    };
  }

  let stripeRefundId: string | null = null;

  // Create Stripe refund if payment was made via Stripe
  if (isStripeConfigured() && (payment.stripe_payment_intent_id || payment.stripe_charge_id)) {
    try {
      const refundParams: {
        amount: number;
        reason: RefundReason;
        metadata: Record<string, string>;
        payment_intent?: string;
        charge?: string;
      } = {
        amount: Math.round(amount * 100), // Convert to cents
        reason,
        metadata: {
          invoice_id: invoiceId,
          payment_id: paymentId,
          refunded_by: refundedBy,
        },
      };

      // Prefer payment_intent over charge
      if (payment.stripe_payment_intent_id) {
        refundParams.payment_intent = payment.stripe_payment_intent_id;
      } else if (payment.stripe_charge_id) {
        refundParams.charge = payment.stripe_charge_id;
      }

      const stripeRefund = await stripe.refunds.create(refundParams);
      stripeRefundId = stripeRefund.id;

      refundLogger.info({
        msg: 'Stripe refund created',
        refundId: stripeRefundId,
        invoiceId,
        paymentId,
        amount,
      });
    } catch (stripeError) {
      refundLogger.error({
        msg: 'Stripe refund failed',
        invoiceId,
        paymentId,
        error: stripeError instanceof Error ? stripeError.message : 'Unknown error',
      });
      return {
        success: false,
        error: stripeError instanceof Error ? stripeError.message : 'Stripe refund failed',
      };
    }
  }

  // Record refund in database
  const { error: insertError } = await supabase.from('invoice_refunds').insert({
    invoice_id: invoiceId,
    payment_id: paymentId,
    stripe_refund_id: stripeRefundId,
    amount,
    reason,
    notes,
    refunded_by: refundedBy,
  });

  if (insertError) {
    refundLogger.error({
      msg: 'Failed to record refund in database',
      invoiceId,
      paymentId,
      error: insertError.message,
    });
    return { success: false, error: 'Failed to record refund' };
  }

  // Update invoice amounts
  const { data: invoice } = await supabase
    .from('invoices')
    .select('amount_paid, amount_due, total')
    .eq('id', invoiceId)
    .single();

  if (invoice) {
    const newAmountPaid = Math.max(0, (invoice.amount_paid || 0) - amount);
    const newAmountDue = Math.max(0, invoice.total - newAmountPaid);

    await supabase
      .from('invoices')
      .update({
        amount_paid: newAmountPaid,
        amount_due: newAmountDue,
        status: newAmountDue > 0 ? 'partial' : 'paid',
      })
      .eq('id', invoiceId);
  }

  // Update payment refund tracking
  await supabase
    .from('payments')
    .update({
      refund_amount: totalRefunded + amount,
      refunded_at: new Date().toISOString(),
    })
    .eq('id', paymentId);

  // Add to audit log
  await supabase.from('payment_audit_log').insert({
    payment_id: paymentId,
    invoice_id: invoiceId,
    action: 'refunded',
    actor_id: refundedBy,
    actor_type: 'user',
    amount,
    metadata: {
      stripe_refund_id: stripeRefundId,
      reason,
      notes,
    },
  });

  return { success: true, refundId: stripeRefundId || paymentId };
}

/**
 * Get refund history for an invoice
 */
export async function getInvoiceRefunds(invoiceId: string): Promise<RefundRecord[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('invoice_refunds')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false });

  if (error) {
    refundLogger.error({
      msg: 'Failed to fetch refunds',
      invoiceId,
      error: error.message,
    });
    return [];
  }

  return data || [];
}

/**
 * Check refund eligibility for a payment
 */
export async function getRefundableAmount(paymentId: string): Promise<{
  paymentAmount: number;
  alreadyRefunded: number;
  availableToRefund: number;
}> {
  const supabase = await createClient();

  const { data: payment } = await supabase
    .from('payments')
    .select('amount')
    .eq('id', paymentId)
    .single();

  if (!payment) {
    return { paymentAmount: 0, alreadyRefunded: 0, availableToRefund: 0 };
  }

  const { data: refunds } = await supabase
    .from('invoice_refunds')
    .select('amount')
    .eq('payment_id', paymentId);

  const alreadyRefunded = (refunds || []).reduce((sum, r) => sum + r.amount, 0);

  return {
    paymentAmount: payment.amount,
    alreadyRefunded,
    availableToRefund: Math.max(0, payment.amount - alreadyRefunded),
  };
}
