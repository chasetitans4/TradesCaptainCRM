jest.mock('next/server', () => {
  class NextResponse {
    static json(obj: any, init?: { status?: number }) {
      return { status: init?.status ?? 200, body: obj };
    }
  }
  return { NextResponse };
});

function makeSupabaseStub() {
  const state: any = {
    invoices: new Map<string, any>(),
    payments: [] as any[],
  };
  const api = {
    state,
    from(table: string) {
      const ctx: any = { _table: table, _eq: {}, _sel: null };
      const chain = {
        select(sel?: string) {
          ctx._sel = sel;
          return chain;
        },
        eq(col: string, val: any) {
          ctx._eq[col] = val;
          return chain;
        },
        single: async () => {
          if (table === 'invoices') {
            const id = ctx._eq['id'];
            return { data: state.invoices.get(id) || null };
          }
          return { data: null };
        },
        update: (data: any) => {
          return {
            eq: async () => {
              if (table === 'invoices') {
                const id = ctx._eq['id'];
                const cur = state.invoices.get(id) || {};
                state.invoices.set(id, { ...cur, ...data });
              }
              return { data: null };
            },
          };
        },
        insert: async (data: any) => {
          if (table === 'payments') {
            state.payments.push(data);
            return { data: { id: `pay_${state.payments.length}` } };
          }
          return { data: null };
        },
      };
      return chain as any;
    },
  };
  return api as any;
}

jest.mock('@/lib/supabase/server', () => {
  const shared = (globalThis as any).__sharedInvoicesSupabase || makeSupabaseStub();
  (globalThis as any).__sharedInvoicesSupabase = shared;
  return {
    createAdminClient: jest.fn(() => shared),
  };
});

jest.mock('@/lib/stripe/client', () => ({
  stripe: {
    prices: { create: jest.fn(async () => ({ id: 'price_1' })) },
    paymentLinks: { create: jest.fn(async () => ({ url: 'https://pay.link' })) },
  },
}));

import { generatePaymentLinkForInvoice } from '@/lib/invoices';
import { POST as WebhookPost } from '@/app/api/webhooks/stripe/route';
import { constructWebhookEvent } from '@/lib/stripe';

jest.mock('@/lib/stripe', () => {
  const actual = jest.requireActual('@/lib/stripe');
  return {
    ...actual,
    constructWebhookEvent: jest.fn(async (_body: string, _sig: string) => ({
      id: 'evt_x',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_x',
          amount: 5000,
          metadata: { invoice_id: 'inv_i' },
        },
      },
    })),
  };
});

describe('integration: invoice payment flow', () => {
  it('generates payment link then records payment via webhook', async () => {
    const server = require('@/lib/supabase/server');
    const supabase = server.createAdminClient();
    supabase.state.invoices.set('inv_i', {
      id: 'inv_i',
      business_id: 'biz_i',
      total: 50,
      amount_paid: 0,
      amount_due: 50,
      customer: { name: 'T', email: 't@example.com' },
      business: { name: 'B' },
      invoice_number: 'INV-0001',
    });

    const url = await generatePaymentLinkForInvoice('inv_i');
    expect(url).toContain('https://pay.link');

    const res: any = await WebhookPost({
      text: async () => 'payload',
      headers: { get: () => 'sig' },
    } as any);
    expect(res.status).toBe(200);

    const updated = supabase.state.invoices.get('inv_i');
    expect(updated.amount_paid).toBe(50);
    expect(updated.amount_due).toBe(0);
    expect(updated.status).toBe('paid');
  });
});
