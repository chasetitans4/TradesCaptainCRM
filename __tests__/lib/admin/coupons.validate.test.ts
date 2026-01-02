import * as Coupons from '@/lib/admin/coupons';

jest.mock('@/lib/supabase/server', () => {
  const __state: any = {
    coupon: null,
    coupons: [],
    webStatus: 'active',
    lastCouponUpdate: null,
    lastWebUpdate: null,
    failInsert: false,
    accounts: [],
  };
  const buildCouponsSelect = () => {
    const state = { filters: {} as any, order: null as any, rangeStart: 0, rangeEnd: Infinity };
    const compute = () => {
      let list = [...(__state.coupons || [])];
      if (state.filters.status) list = list.filter(c => c.status === state.filters.status);
      if (state.filters.agentId) list = list.filter(c => c.created_by_agent_id === state.filters.agentId);
      if (state.filters.expiresNotNull) list = list.filter(c => c.expires_at != null);
      if (state.filters.expiresLte) {
        const cutoff = new Date(state.filters.expiresLte).getTime();
        list = list.filter(c => new Date(c.expires_at).getTime() <= cutoff);
      }
      if (state.order?.field === 'created_at') {
        list.sort((a, b) =>
          state.order.ascending ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at)
        );
      }
      if (state.order?.field === 'expires_at') {
        list.sort((a, b) =>
          state.order.ascending ? a.expires_at.localeCompare(b.expires_at) : b.expires_at.localeCompare(a.expires_at)
        );
      }
      const start = Math.max(0, state.rangeStart || 0);
      const end = Math.min(list.length - 1, state.rangeEnd ?? list.length - 1);
      const sliced = list.slice(start, end + 1);
      return { data: sliced, error: null, count: list.length };
    };
    const chain: any = {
      eq: (field: string, value: any) => {
        if (field === 'status') state.filters.status = value;
        if (field === 'created_by_agent_id') state.filters.agentId = value;
        return chain;
      },
      not: (field: string, op: string, value: any) => {
        if (field === 'expires_at' && op === 'is' && value === null) {
          state.filters.expiresNotNull = true;
        }
        return chain;
      },
      lte: (field: string, value: any) => {
        if (field === 'expires_at') state.filters.expiresLte = value;
        return chain;
      },
      order: (field: string, options?: { ascending?: boolean }) => {
        state.order = { field, ascending: !!options?.ascending };
        return chain;
      },
      range: (start: number, end: number) => {
        state.rangeStart = start;
        state.rangeEnd = end;
        return compute();
      },
      get data() {
        return compute().data;
      },
      get error() {
        return null;
      },
      get count() {
        return compute().count;
      },
    };
    return chain;
  };
  return {
    createAdminClient: jest.fn(() => ({
      from: (table: string) => {
        if (table === 'web_customers') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({ data: { status: __state.webStatus, business_name: 'Acme Co' }, error: null }),
              }),
            }),
            update: (payload: any) => ({
              eq: (_field: string, _id: string) => {
                __state.lastWebUpdate = payload;
                return {};
              },
            }),
          } as any;
        }
        if (table === 'crm_coupons') {
          return {
            select: (_fields?: any, _opts?: any) => {
              const builder = buildCouponsSelect();
              return {
                eq: (field: string, value: any) => {
                  if (field === 'code') {
                    return {
                      single: () => ({
                        data: __state.coupon,
                        error: __state.coupon ? null : new Error('Not found'),
                      }),
                    };
                  }
                  return builder.eq(field, value);
                },
                not: (field: string, op: string, value: any) => builder.not(field, op, value),
                lte: (field: string, value: any) => builder.lte(field, value),
                order: (field: string, options?: any) => builder.order(field, options),
                range: (start: number, end: number) => builder.range(start, end),
                get data() {
                  return builder.data;
                },
                get count() {
                  return builder.count;
                },
              };
            },
            // Listing/expiring queries use chained builder
            order: (field: string, options?: any) => buildCouponsSelect().order(field, options),
            eq: (field: string, value: any) => buildCouponsSelect().eq(field, value),
            not: (field: string, op: string, value: any) => buildCouponsSelect().not(field, op, value),
            lte: (field: string, value: any) => buildCouponsSelect().lte(field, value),
            range: (start: number, end: number) => buildCouponsSelect().range(start, end),
            update: (payload: any) => {
              __state.lastCouponUpdate = payload;
              return { eq: () => ({}) };
            },
            insert: (payload: any) => ({
              select: () => ({
                single: () => {
                  const id = 'c' + ((__state.coupons.length + 1).toString());
                  const data = { id, ...payload };
                  __state.coupons.push(data);
                  return { data, error: null };
                },
              }),
            }),
          } as any;
        }
        if (table === 'crm_accounts') {
          return {
            insert: (payload: any) => ({
              select: () => ({
                single: () => {
                  if (__state.failInsert) {
                    return { data: null, error: new Error('insert failed') };
                  }
                  const id = 'acc' + ((__state.accounts.length + 1).toString());
                  const data = { ...payload, id };
                  __state.accounts.push(data);
                  return { data, error: null };
                },
              }),
            }),
          } as any;
        }
        return {} as any;
      },
    })),
    __state,
  };
});

describe('admin coupons: validateCoupon', () => {
  it('returns invalid for missing coupon', async () => {
    const supabase = require('@/lib/supabase/server');
    supabase.__state.coupon = null;
    const res = await Coupons.validateCoupon('X');
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/Invalid coupon code/i);
  });

  it('returns invalid for redeemed coupon', async () => {
    const supabase = require('@/lib/supabase/server');
    supabase.__state.coupon = { status: 'redeemed' };
    const res = await Coupons.validateCoupon('X');
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/already been redeemed/i);
  });

  it('returns invalid for expired coupon', async () => {
    const supabase = require('@/lib/supabase/server');
    supabase.__state.coupon = { status: 'expired' };
    const res = await Coupons.validateCoupon('X');
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/has expired/i);
  });

  it('returns invalid for revoked coupon', async () => {
    const supabase = require('@/lib/supabase/server');
    supabase.__state.coupon = { status: 'revoked' };
    const res = await Coupons.validateCoupon('X');
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/no longer valid/i);
  });

  it('returns invalid for unknown coupon status', async () => {
    const supabase = require('@/lib/supabase/server');
    supabase.__state.coupon = { status: 'weird' };
    const res = await Coupons.validateCoupon('X');
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/Invalid coupon status/i);
  });

  it('expires active coupon when past expiration', async () => {
    const past = new Date(Date.now() - 1000).toISOString();
    const supabase = require('@/lib/supabase/server');
    supabase.__state.coupon = { status: 'active', expires_at: past, id: 'c1' };
    supabase.__state.lastCouponUpdate = null;
    const res = await Coupons.validateCoupon('X');
    expect(supabase.__state.lastCouponUpdate).toEqual({ status: 'expired' });
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/has expired/i);
  });

  it('invalid when web customer is not active', async () => {
    const supabase = require('@/lib/supabase/server');
    supabase.__state.coupon = { status: 'active', web_customer_id: 'w1' };
    supabase.__state.webStatus = 'cancelled';
    const res = await Coupons.validateCoupon('X');
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/web plan is no longer active/i);
  });

  it('returns valid for active coupon and active web customer', async () => {
    const supabase = require('@/lib/supabase/server');
    const coupon = { status: 'active', web_customer_id: 'w1', id: 'c1' } as any;
    supabase.__state.coupon = coupon;
    supabase.__state.webStatus = 'active';
    const res = await Coupons.validateCoupon('X');
    expect(res.valid).toBe(true);
    expect(res.coupon).toBe(coupon);
  });
});

describe('admin coupons: generateCouponCode', () => {
  it('generates code with plan and business prefixes', async () => {
    const code = await Coupons.generateCouponCode('web_pro', 'Smith Plumbing!');
    expect(code).toMatch(/^WEBPRO-SMITHP-\d{4}-[0-9A-F]{4}$/);
  });
});

describe('admin coupons: getCoupons listing and filters', () => {
  beforeEach(() => {
    const supabase = require('@/lib/supabase/server');
    const now = new Date();
    const mkDate = (offset: number) => new Date(now.getTime() + offset).toISOString();
    supabase.__state.coupons = [
      { id: 'c1', status: 'active', created_by_agent_id: 'a1', created_at: mkDate(1000) },
      { id: 'c2', status: 'revoked', created_by_agent_id: 'a2', created_at: mkDate(2000) },
      { id: 'c3', status: 'active', created_by_agent_id: 'a1', created_at: mkDate(3000) },
      { id: 'c4', status: 'expired', created_by_agent_id: 'a3', created_at: mkDate(4000) },
      { id: 'c5', status: 'active', created_by_agent_id: 'a2', created_at: mkDate(5000) },
    ];
  });

  it('returns paginated list ordered by created_at desc', async () => {
    const res = await Coupons.getCoupons({ page: 1, limit: 2 });
    expect(res.total).toBe(5);
    expect(res.coupons.map(c => c.id)).toEqual(['c5', 'c4']);
    const res2 = await Coupons.getCoupons({ page: 2, limit: 2 });
    expect(res2.coupons.map(c => c.id)).toEqual(['c3', 'c2']);
  });

  it('filters by status and agentId', async () => {
    const onlyActive = await Coupons.getCoupons({ status: 'active' as any });
    expect(onlyActive.coupons.every(c => c.status === 'active')).toBe(true);
    const byAgent = await Coupons.getCoupons({ agentId: 'a1' });
    expect(byAgent.coupons.every(c => c.created_by_agent_id === 'a1')).toBe(true);
  });
});

describe('admin coupons: getExpiringCoupons', () => {
  it('returns active coupons expiring within window ordered ascending', async () => {
    const supabase = require('@/lib/supabase/server');
    const now = new Date();
    const soon = new Date(now.getTime() + 3 * 24 * 3600 * 1000).toISOString();
    const later = new Date(now.getTime() + 12 * 24 * 3600 * 1000).toISOString();
    supabase.__state.coupons = [
      { id: 'e1', status: 'active', expires_at: soon },
      { id: 'e2', status: 'active', expires_at: later },
      { id: 'e3', status: 'revoked', expires_at: soon },
      { id: 'e4', status: 'active', expires_at: null },
      { id: 'e5', status: 'active', expires_at: new Date(now.getTime() + 5 * 24 * 3600 * 1000).toISOString() },
    ];
    const res = await Coupons.getExpiringCoupons(7);
    expect(res.map(c => c.id)).toEqual(['e1', 'e5']);
  });
});

describe('admin coupons: redeemCoupon', () => {
  beforeEach(() => {
    const supabase = require('@/lib/supabase/server');
    supabase.__state.failInsert = false;
    supabase.__state.accounts = [];
    supabase.__state.lastCouponUpdate = null;
    supabase.__state.lastWebUpdate = null;
    supabase.__state.webStatus = 'active';
    supabase.__state.coupon = {
      id: 'c100',
      status: 'active',
      free_months: 12,
      crm_plan: 'blue_starter',
      web_customer_id: 'w100',
    };
  });

  it('creates account, updates coupon and web customer', async () => {
    const res = await Coupons.redeemCoupon('X', {
      business_name: 'Acme Co',
      contact_name: 'Jane',
      email: 'jane@example.com',
      phone: '555',
    });
    const supabase = require('@/lib/supabase/server');
    expect(res.success).toBe(true);
    expect(res.accountId).toBe('acc1');
    expect(supabase.__state.lastCouponUpdate.status).toBe('redeemed');
    expect(supabase.__state.lastCouponUpdate.redeemed_by_account_id).toBe('acc1');
    expect(supabase.__state.lastWebUpdate).toEqual({ crm_coupon_id: 'c100' });
  });

  it('returns failure when account insert fails', async () => {
    const supabase = require('@/lib/supabase/server');
    supabase.__state.failInsert = true;
    const res = await Coupons.redeemCoupon('X', {
      business_name: 'Bad Co',
      contact_name: 'Jim',
      email: 'jim@example.com',
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Failed to redeem coupon|insert failed/i);
  });
});

describe('admin coupons: create and status updates', () => {
  it('creates coupon with generated code and defaults', async () => {
    const supabase = require('@/lib/supabase/server');
    supabase.__state.coupons = [];
    const coupon = await Coupons.createCoupon({
      webCustomerId: 'w55',
      webPlanType: 'web_plus',
      crmPlan: 'gold_pro',
      freeMonths: 6,
      agentId: 'a7',
    });
    expect(coupon.status).toBe('active');
    expect(typeof coupon.code).toBe('string');
    expect(coupon.free_months).toBe(6);
    expect(coupon.crm_plan).toBe('gold_pro');
    expect(coupon.created_by_agent_id).toBe('a7');
  });

  it('updates coupon status to revoked', async () => {
    const supabase = require('@/lib/supabase/server');
    supabase.__state.lastCouponUpdate = null;
    await Coupons.updateCouponStatus('c77', 'revoked' as any);
    expect(supabase.__state.lastCouponUpdate).toEqual({ status: 'revoked' });
  });

  it('revokes coupon via helper', async () => {
    const supabase = require('@/lib/supabase/server');
    supabase.__state.lastCouponUpdate = null;
    await Coupons.revokeCoupon('c88');
    expect(supabase.__state.lastCouponUpdate).toEqual({ status: 'revoked' });
  });
});
