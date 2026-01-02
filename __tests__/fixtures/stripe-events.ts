import Stripe from 'stripe';

export function evtCheckoutCompleted(invoiceId: string, amount: number): Stripe.Event {
  return {
    id: 'evt_checkout',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_x',
        mode: 'payment',
        amount_total: Math.round(amount * 100),
        payment_intent: 'pi_x',
        metadata: { invoice_id: invoiceId, business_id: 'biz_x' },
      } as any,
    },
  } as any;
}

export function evtPaymentIntentSucceeded(invoiceId: string, amount: number): Stripe.Event {
  return {
    id: 'evt_pi',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_y',
        amount: Math.round(amount * 100),
        metadata: { invoice_id: invoiceId },
      } as any,
    },
  } as any;
}

export function evtChargeSucceeded(paymentIntentId: string, chargeId: string): Stripe.Event {
  return {
    id: 'evt_ch',
    type: 'charge.succeeded',
    data: {
      object: {
        id: chargeId,
        payment_intent: paymentIntentId,
      } as any,
    },
  } as any;
}

export function evtChargeRefunded(paymentIntentId: string, amount: number): Stripe.Event {
  return {
    id: 'evt_ref',
    type: 'charge.refunded',
    data: {
      object: {
        id: 'ch_ref',
        payment_intent: paymentIntentId,
        amount_refunded: Math.round(amount * 100),
      } as any,
    },
  } as any;
}

export function evtDisputeCreated(paymentIntentId: string): Stripe.Event {
  return {
    id: 'evt_dp',
    type: 'charge.dispute.created',
    data: {
      object: {
        id: 'dp_x',
        payment_intent: paymentIntentId,
      } as any,
    },
  } as any;
}

