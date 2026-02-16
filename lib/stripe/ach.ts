/**
 * Stripe ACH Payment Integration
 *
 * Provides bank transfer payment functionality via Stripe ACH.
 * Uses US Bank Account payment method for lower-fee transactions.
 *
 * Fee structure: 0.8% capped at $5 (vs 2.9% + $0.30 for cards)
 * Settlement: 3-5 business days
 */

import Stripe from 'stripe';
import { stripe, isStripeConfigured } from './client';

// ACH Payment Status
export type AchPaymentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled';

export interface AchPaymentIntent {
  id: string;
  clientSecret: string;
  status: AchPaymentStatus;
  amount: number;
  currency: string;
}

export interface AchPaymentResult {
  success: boolean;
  paymentIntent?: AchPaymentIntent;
  error?: string;
}

export interface AchStatusInfo {
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  message: string;
  estimatedCompletion?: string;
}

/**
 * Create a PaymentIntent for ACH bank transfer
 *
 * @param amount - Amount in dollars (will be converted to cents)
 * @param invoiceId - Associated invoice ID for metadata
 * @param customerId - Stripe customer ID
 * @param connectedAccountId - Connected account ID for the business
 * @param metadata - Additional metadata
 */
export async function createAchPaymentIntent(
  amount: number,
  invoiceId: string,
  customerId: string,
  connectedAccountId: string,
  metadata: Record<string, string> = {}
): Promise<AchPaymentResult> {
  if (!isStripeConfigured()) {
    return { success: false, error: 'Stripe is not configured' };
  }

  try {
    const amountInCents = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      customer: customerId,
      payment_method_types: ['us_bank_account'],
      payment_method_options: {
        us_bank_account: {
          financial_connections: {
            permissions: ['payment_method', 'balances'],
          },
          verification_method: 'automatic',
        },
      },
      metadata: {
        ...metadata,
        invoice_id: invoiceId,
        payment_type: 'ach',
      },
      // Transfer to connected account
      transfer_data: {
        destination: connectedAccountId,
      },
      // Set up for manual capture if needed
      capture_method: 'automatic',
    });

    return {
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || '',
        status: paymentIntent.status as AchPaymentStatus,
        amount: amount,
        currency: 'usd',
      },
    };
  } catch (error) {
    console.error('[ACH] Failed to create payment intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment',
    };
  }
}

/**
 * Confirm an ACH PaymentIntent with a payment method
 *
 * @param paymentIntentId - The PaymentIntent ID
 * @param paymentMethodId - The payment method ID (us_bank_account)
 */
export async function confirmAchPayment(
  paymentIntentId: string,
  paymentMethodId: string
): Promise<AchPaymentResult> {
  if (!isStripeConfigured()) {
    return { success: false, error: 'Stripe is not configured' };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    });

    return {
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || '',
        status: paymentIntent.status as AchPaymentStatus,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
      },
    };
  } catch (error) {
    console.error('[ACH] Failed to confirm payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to confirm payment',
    };
  }
}

/**
 * Get payment status information for display
 */
export function getAchPaymentStatusInfo(status: AchPaymentStatus): AchStatusInfo {
  switch (status) {
    case 'requires_payment_method':
      return {
        status: 'pending',
        message: 'Awaiting bank account information',
      };
    case 'requires_confirmation':
      return {
        status: 'pending',
        message: 'Ready to process',
      };
    case 'processing':
      return {
        status: 'processing',
        message: 'Payment processing (3-5 business days)',
        estimatedCompletion: getEstimatedCompletionDate(),
      };
    case 'succeeded':
      return {
        status: 'succeeded',
        message: 'Payment complete',
      };
    case 'failed':
      return {
        status: 'failed',
        message: 'Payment failed - please try again or use a different payment method',
      };
    case 'canceled':
      return {
        status: 'failed',
        message: 'Payment was canceled',
      };
    default:
      return {
        status: 'pending',
        message: 'Payment status unknown',
      };
  }
}

/**
 * Calculate estimated completion date for ACH payment
 * ACH typically takes 3-5 business days
 */
function getEstimatedCompletionDate(): string {
  const today = new Date();
  let businessDays = 0;
  const targetDays = 5; // Conservative estimate

  const result = new Date(today);

  while (businessDays < targetDays) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    // Skip weekends
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
  }

  return result.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Retrieve a PaymentIntent to check status
 */
export async function getAchPaymentIntent(
  paymentIntentId: string
): Promise<AchPaymentResult> {
  if (!isStripeConfigured()) {
    return { success: false, error: 'Stripe is not configured' };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return {
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || '',
        status: paymentIntent.status as AchPaymentStatus,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
      },
    };
  } catch (error) {
    console.error('[ACH] Failed to retrieve payment intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve payment',
    };
  }
}

/**
 * Cancel an ACH PaymentIntent
 */
export async function cancelAchPayment(
  paymentIntentId: string,
  reason?: string
): Promise<AchPaymentResult> {
  if (!isStripeConfigured()) {
    return { success: false, error: 'Stripe is not configured' };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId, {
      cancellation_reason: 'requested_by_customer',
    });

    return {
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || '',
        status: paymentIntent.status as AchPaymentStatus,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
      },
    };
  } catch (error) {
    console.error('[ACH] Failed to cancel payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel payment',
    };
  }
}

/**
 * Create or retrieve a Stripe Customer for ACH payments
 */
export async function getOrCreateCustomerForAch(
  email: string,
  name: string,
  businessId: string
): Promise<{ success: boolean; customerId?: string; error?: string }> {
  if (!isStripeConfigured()) {
    return { success: false, error: 'Stripe is not configured' };
  }

  try {
    // Search for existing customer by email
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return {
        success: true,
        customerId: existingCustomers.data[0].id,
      };
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email: email,
      name: name,
      metadata: {
        business_id: businessId,
        created_for: 'ach_payment',
      },
    });

    return {
      success: true,
      customerId: customer.id,
    };
  } catch (error) {
    console.error('[ACH] Failed to get/create customer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create customer',
    };
  }
}

/**
 * Calculate ACH fee for display purposes
 * ACH: 0.8% capped at $5
 */
export function calculateAchFee(amount: number): number {
  const percentageFee = amount * 0.008;
  return Math.min(percentageFee, 5.00);
}

/**
 * Calculate card fee for comparison
 * Card: 2.9% + $0.30
 */
export function calculateCardFee(amount: number): number {
  return (amount * 0.029) + 0.30;
}

/**
 * Get fee comparison for display
 */
export function getFeeComparison(amount: number): {
  achFee: number;
  cardFee: number;
  savings: number;
  achTotal: number;
  cardTotal: number;
} {
  const achFee = calculateAchFee(amount);
  const cardFee = calculateCardFee(amount);

  return {
    achFee: Math.round(achFee * 100) / 100,
    cardFee: Math.round(cardFee * 100) / 100,
    savings: Math.round((cardFee - achFee) * 100) / 100,
    achTotal: Math.round((amount + achFee) * 100) / 100,
    cardTotal: Math.round((amount + cardFee) * 100) / 100,
  };
}
