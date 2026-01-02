import Stripe from 'stripe';

jest.mock('next/server', () => {
  class NextResponse {
    static json(obj: any, init?: { status?: number }) {
      return { status: init?.status ?? 200, body: obj };
    }
  }
  return { NextResponse };
});

jest.mock('@/lib/stripe', () => {
  const actual = jest.requireActual('@/lib/stripe');
  return {
    ...actual,
    constructWebhookEvent: jest.fn(async (body: string, sig: string) => JSON.parse(body)),
  };
});

function makeSupabaseStub() {
  const state: any = { invoices: new Map<string, any>(), payments: [] as any[] };
  const api = {
    state,
    from(table: string) {
      const ctx: any = { _table: table, _eq: {} };
      const chain = {
        select() {
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
          if (table === 'payments') {
            const found = state.payments.find(
              (p: any) => p.stripe_payment_intent_id === ctx._eq['stripe_payment_intent_id']
            );
            return { data: found || null };
          }
          return { data: null };
        },
        insert: async (data: any) => {
          if (table === 'payments') {
            state.payments.push(data);
            return { data: { id: `pay_${state.payments.length}` } };
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
      };
      return chain as any;
    },
  };
  return api as any;
}

jest.mock('@/lib/supabase/server', () => {
  const shared = (globalThis as any).__sharedSupabasePerf || makeSupabaseStub();
  (globalThis as any).__sharedSupabasePerf = shared;
  return {
    createAdminClient: jest.fn(() => shared),
  };
});

import { POST } from '@/app/api/webhooks/stripe/route';

describe('performance: webhook processing under load', () => {
  it('processes 100 payment_intent events within threshold', async () => {
    const server = require('@/lib/supabase/server');
    const supabase = server.createAdminClient();
    supabase.state.invoices.set('inv_perf', {
      id: 'inv_perf',
      business_id: 'biz_perf',
      total: 100,
      amount_paid: 0,
      amount_due: 100,
    });

    const events: Stripe.Event[] = [];
    for (let i = 0; i < 100; i++) {
      events.push({
        id: `evt_${i}`,
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: `pi_${i}`,
            amount: 100,
            metadata: { invoice_id: 'inv_perf' },
          },
        },
      } as any);
    }

    const start = performance.now();
    for (const evt of events) {
      const req: any = {
        text: async () => JSON.stringify(evt),
        headers: { get: () => 'sig' },
      };
      await POST(req);
    }
    const ms = performance.now() - start;
    expect(ms).toBeLessThan(2000);
    const updated = supabase.state.invoices.get('inv_perf');
    expect(updated.amount_paid).toBeGreaterThan(0);
  });
});
