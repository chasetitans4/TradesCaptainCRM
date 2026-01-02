jest.mock('next/server', () => {
  class NextResponse {
    static json(obj: any, init?: { status?: number }) {
      return { status: init?.status ?? 200, body: obj };
    }
  }
  class NextRequest {}
  return { NextResponse, NextRequest };
});

function makeSupabaseStub() {
  const state: any = { invoices: new Map<string, any>() };
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
            const bid = ctx._eq['business_id'];
            const row = state.invoices.get(id);
            if (row && row.business_id === bid) return { data: row };
            return { data: null };
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
  const shared = (globalThis as any).__sharedPaymentLinkSupabase || makeSupabaseStub();
  (globalThis as any).__sharedPaymentLinkSupabase = shared;
  return {
    createServerSupabaseClient: jest.fn(async () => shared),
    getServerUserProfile: jest.fn(async () => ({ id: 'u1', business_id: 'biz_1' })),
  };
});

jest.mock('@/lib/invoices', () => ({
  generatePaymentLinkForInvoice: jest.fn(async (_id: string) => 'https://link'),
}));

import { POST } from '@/app/api/invoices/[id]/payment-link/route';
import { generatePaymentLinkForInvoice } from '@/lib/invoices';

describe('POST /api/invoices/[id]/payment-link', () => {
  it('returns 401 when no profile', async () => {
    const server = require('@/lib/supabase/server');
    server.getServerUserProfile.mockResolvedValueOnce(null);
    const req: any = {};
    const res: any = await POST(req, { params: Promise.resolve({ id: 'inv_x' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when invoice not found for business', async () => {
    const req: any = {};
    const res: any = await POST(req, { params: Promise.resolve({ id: 'inv_missing' }) });
    expect(res.status).toBe(404);
  });

  it('returns existing payment link if already present', async () => {
    const server = require('@/lib/supabase/server');
    const supabase = await server.createServerSupabaseClient();
    supabase.state.invoices.set('inv_1', {
      id: 'inv_1',
      business_id: 'biz_1',
      stripe_payment_link_url: 'https://existing',
      status: 'sent',
      amount_due: 50,
    });
    const req: any = {};
    const res: any = await POST(req, { params: Promise.resolve({ id: 'inv_1' }) });
    expect(res.body.url).toBe('https://existing');
  });

  it('rejects void invoice', async () => {
    const server = require('@/lib/supabase/server');
    const supabase = await server.createServerSupabaseClient();
    supabase.state.invoices.set('inv_2', {
      id: 'inv_2',
      business_id: 'biz_1',
      status: 'void',
      amount_due: 50,
    });
    const req: any = {};
    const res: any = await POST(req, { params: Promise.resolve({ id: 'inv_2' }) });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('voided');
  });

  it('rejects already paid invoice', async () => {
    const server = require('@/lib/supabase/server');
    const supabase = await server.createServerSupabaseClient();
    supabase.state.invoices.set('inv_3', {
      id: 'inv_3',
      business_id: 'biz_1',
      status: 'sent',
      amount_due: 0,
    });
    const req: any = {};
    const res: any = await POST(req, { params: Promise.resolve({ id: 'inv_3' }) });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('already paid');
  });

  it('generates payment link successfully', async () => {
    const server = require('@/lib/supabase/server');
    const supabase = await server.createServerSupabaseClient();
    supabase.state.invoices.set('inv_4', {
      id: 'inv_4',
      business_id: 'biz_1',
      status: 'sent',
      amount_due: 25,
    });
    const req: any = {};
    const res: any = await POST(req, { params: Promise.resolve({ id: 'inv_4' }) });
    expect(res.body.url).toBe('https://link');
    expect((generatePaymentLinkForInvoice as jest.Mock)).toHaveBeenCalledWith('inv_4');
  });

  it('handles generator error', async () => {
    const server = require('@/lib/supabase/server');
    const supabase = await server.createServerSupabaseClient();
    supabase.state.invoices.set('inv_5', {
      id: 'inv_5',
      business_id: 'biz_1',
      status: 'sent',
      amount_due: 25,
    });
    (generatePaymentLinkForInvoice as jest.Mock).mockRejectedValueOnce(new Error('bad'));
    const req: any = {};
    const res: any = await POST(req, { params: Promise.resolve({ id: 'inv_5' }) });
    expect(res.status).toBe(500);
  });
});
