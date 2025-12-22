// =====================================================
// STRIPE PAYMENT LINKS
// =====================================================

import { stripe } from './client';

interface CreatePaymentLinkParams {
  invoiceId: string;
  businessId: string;
  amount: number; // In cents
  customerEmail?: string;
  customerName: string;
  description: string;
}

/**
 * Create a Stripe Payment Link for an invoice
 */
export async function createPaymentLink(params: CreatePaymentLinkParams): Promise<string> {
  const { invoiceId, businessId, amount, customerEmail, customerName, description } = params;

  // Create a price for this specific invoice
  const price = await stripe.prices.create({
    unit_amount: amount,
    currency: 'usd',
    product_data: {
      name: description,
    },
  });

  // Create payment link
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: {
      invoice_id: invoiceId,
      business_id: businessId,
      customer_name: customerName,
    },
    after_completion: {
      type: 'redirect',
      redirect: {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/success?invoice_id=${invoiceId}`,
      },
    },
    customer_creation: 'if_required',
    phone_number_collection: { enabled: false },
  });

  return paymentLink.url;
}

/**
 * Create a Checkout Session for an invoice (alternative to Payment Links)
 */
export async function createCheckoutSession(params: CreatePaymentLinkParams): Promise<string> {
  const { invoiceId, businessId, amount, customerEmail, customerName, description } = params;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: amount,
          product_data: {
            name: description,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      invoice_id: invoiceId,
      business_id: businessId,
    },
    customer_email: customerEmail,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/success?invoice_id=${invoiceId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/view/invoice/${invoiceId}?cancelled=true`,
  });

  return session.url || '';
}

/**
 * Verify a webhook signature
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
) {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
