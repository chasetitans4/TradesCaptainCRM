import { validateCoupon, updateCouponStatus } from '@/lib/admin/coupons';

jest.mock('@/lib/supabase/server', () => {
  const state: any = { updates: [] };
  return {
    createAdminClient: jest.fn(() => ({
      from: (table: string) => {
        const m: any = (globalThis as any).__couponMock || {};
        const base = (m[table] || []).slice();
        const ctx: any = { eqs: {} };
        const chain: any = {
          select: (_fields?: string, _opts?: any) => chain,
          eq: (col: string, val: any) => { ctx.eqs[col] = val; return chain; },
          single: () => {
            let rows = base.slice();
            for (const [k, v] of Object.entries(ctx.eqs)) {
              rows = rows.filter(r => r[k] === v);
            }
            return { data: rows[0] || null, error: null };
          },
          update: (updates: any) => ({
            eq: (col: string, val: any) => {
              state.updates.push({ table, where: { col, val }, updates });
              return {};
            },
          }),
        };
        return chain;
      },
    })),
    __state: state,
  };
});

describe('admin coupons: validate and status updates', () => {
  beforeEach(() => {
    const supabase = require('@/lib/supabase/server');
    supabase.__state.updates = [];
    (globalThis as any).__couponMock = {};
  });

  it('validateCoupon marks expired when past expires_at and returns invalid', async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    (globalThis as any).__couponMock = {
      crm_coupons: [
        { id: 'cp1', code: 'FREE1', status: 'active', expires_at: past, web_customer_id: 'w1' },
      ],
      web_customers: [
        { id: 'w1', status: 'active' },
      ],
    };
    const res = await validateCoupon('FREE1');
    expect(res.valid).toBe(false);
    const supabase = require('@/lib/supabase/server');
    const last = supabase.__state.updates[supabase.__state.updates.length - 1];
    expect(last.table).toBe('crm_coupons');
    expect(last.updates.status).toBe('expired');
  });

  it('validateCoupon returns invalid when web customer inactive', async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    (globalThis as any).__couponMock = {
      crm_coupons: [
        { id: 'cp2', code: 'FREE2', status: 'active', expires_at: future, web_customer_id: 'w2' },
      ],
      web_customers: [
        { id: 'w2', status: 'cancelled' },
      ],
    };
    const res = await validateCoupon('FREE2');
    expect(res.valid).toBe(false);
    expect(String(res.error || '')).toMatch(/web plan is no longer active/);
  });

  it('updateCouponStatus updates status field', async () => {
    const supabase = require('@/lib/supabase/server');
    await updateCouponStatus('cpX', 'revoked');
    const last = supabase.__state.updates[supabase.__state.updates.length - 1];
    expect(last.table).toBe('crm_coupons');
    expect(last.updates.status).toBe('revoked');
  });
});
