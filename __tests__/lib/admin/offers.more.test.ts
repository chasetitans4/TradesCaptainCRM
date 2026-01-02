import { getOfferCodes, getAvailableOffers } from '@/lib/admin/offers';

jest.mock('@/lib/supabase/server', () => {
  return {
    createAdminClient: jest.fn(() => {
      const m: any = (globalThis as any).__offersMock || {};
      return {
        from: (table: string) => {
          const base = (m[table] || []).slice();
          const ctx: any = { eqs: {}, orderKey: null };
          const chain: any = {
            select: (_fields?: string) => chain,
            order: (key: string, _opts?: any) => { ctx.orderKey = key; return chain; },
            eq: (col: string, val: any) => { ctx.eqs[col] = val; return chain; },
            or: (_expr: string) => chain,
            then: async (resolve: any) => {
              let rows = base.slice();
              for (const [k, v] of Object.entries(ctx.eqs)) {
                rows = rows.filter(r => r[k] === v);
              }
              if (ctx.orderKey) {
                rows.sort((a, b) => String(a[ctx.orderKey]).localeCompare(String(b[ctx.orderKey])));
              }
              return resolve({ data: rows, error: null });
            },
          };
          return chain;
        },
      };
    }),
  };
});

describe('admin offers: code listing and availability', () => {
  beforeEach(() => { (globalThis as any).__offersMock = {}; });

  it('filters offer codes by includeExpired and includeRestricted flags', async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    (globalThis as any).__offersMock = {
      offer_codes: [
        { code: 'OPEN', is_active: true, expires_at: future, requires_approval: false },
        { code: 'RESTRICT', is_active: true, expires_at: future, requires_approval: true },
        { code: 'EXPIRED', is_active: true, expires_at: past, requires_approval: false },
      ],
    };
    const withoutRestricted = await getOfferCodes({ includeExpired: false, includeRestricted: false });
    expect(withoutRestricted.map(o => o.code)).toContain('OPEN');
    expect(withoutRestricted.map(o => o.code)).not.toContain('RESTRICT');
    const withRestricted = await getOfferCodes({ includeExpired: false, includeRestricted: true });
    expect(withRestricted.map(o => o.code)).toEqual(expect.arrayContaining(['OPEN', 'RESTRICT']));

    const withExpired = await getOfferCodes({ includeExpired: true, includeRestricted: true });
    expect(withExpired.map(o => o.code)).toEqual(expect.arrayContaining(['OPEN', 'RESTRICT', 'EXPIRED']));
  });

  it('getAvailableOffers filters by plan applicability and usage limits', async () => {
    (globalThis as any).__offersMock = {
      offer_codes: [
        { code: 'ANY', is_active: true, expires_at: null, requires_approval: false, applicable_plans: [], usage_limit: null, usage_count: 0 },
        { code: 'PLAN', is_active: true, expires_at: null, requires_approval: false, applicable_plans: ['gold_pro'], usage_limit: 5, usage_count: 1 },
        { code: 'LIMITED', is_active: true, expires_at: null, requires_approval: false, applicable_plans: ['gold_pro'], usage_limit: 1, usage_count: 1 },
        { code: 'RESTRICT', is_active: true, expires_at: null, requires_approval: true, applicable_plans: ['gold_pro'], usage_limit: null, usage_count: 0 },
      ],
    };
    const res = await getAvailableOffers('gold_pro');
    expect(res.standard.map(o => o.code)).toEqual(expect.arrayContaining(['ANY', 'PLAN']));
    expect(res.standard.map(o => o.code)).not.toContain('LIMITED');
    expect(res.restricted.map(o => o.code)).toContain('RESTRICT');
  });
});
