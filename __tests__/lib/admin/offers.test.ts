import {
  getOfferCodes,
  getOfferByCode,
  getAvailableOffers,
  validateOfferCode,
  applyOfferCode,
  getClientOfferHistory,
  requestOfferApproval,
  calculateDiscountedPrice,
} from '@/lib/admin/offers';

jest.mock('@/lib/supabase/server', () => {
  const build = () => {
    const resolveBase = (table: string) => {
      const m: any = (globalThis as any).__offMock || {};
      switch (table) {
        case 'offer_codes': return m.offer_codes || [];
        case 'offer_usage': return m.offer_usage || [];
        case 'offer_approval_requests': return m.offer_approval_requests || [];
        default: return [];
      }
    };
    const state: any = {
      filters: [],
      orders: [],
      limitN: null,
      rangeStart: null,
      rangeEnd: null,
      joinSelect: null,
    };
    const apply = (rows: any[], table: string) => {
      let data = Array.isArray(rows) ? [...rows] : [];
      for (const f of state.filters) {
        if (f.type === 'eq') data = data.filter((r: any) => r[f.col] === f.val);
        else if (f.type === 'or_active') {
          const now = new Date().toISOString();
          data = data.filter((r: any) => r.expires_at == null || r.expires_at > now);
        }
      }
      for (const ord of state.orders) {
        data = data.sort((a: any, b: any) => {
          const k = ord.key;
          const asc = ord.asc;
          const av = a[k];
          const bv = b[k];
          const cmp = typeof av === 'string' && typeof bv === 'string'
            ? av.localeCompare(bv)
            : (av > bv ? 1 : av < bv ? -1 : 0);
          return asc ? cmp : -cmp;
        });
      }
      if (typeof state.rangeStart === 'number' && typeof state.rangeEnd === 'number') {
        data = data.slice(state.rangeStart, state.rangeEnd + 1);
      }
      if (typeof state.limitN === 'number') data = data.slice(0, state.limitN);
      if (state.joinSelect && state.joinSelect.includes('offer:offer_codes') && table === 'offer_usage') {
        const offers = resolveBase('offer_codes');
        data = data.map((u: any) => {
          const off = offers.find((o: any) => o.id === u.offer_code_id) || null;
          return { ...u, offer: off };
        });
      }
      return data;
    };
    const chain = (table: string): any => ({
      select: (fields?: string) => { state.joinSelect = fields || null; return chain(table); },
      eq: (col: string, val: any) => { state.filters.push({ type: 'eq', col, val }); return chain(table); },
      order: (key: string, opts?: any) => { state.orders.push({ key, asc: !!(opts && opts.ascending) }); return chain(table); },
      or: (_expr: string) => { state.filters.push({ type: 'or_active' }); return chain(table); },
      limit: (n: number) => { state.limitN = n; return chain(table); },
      single: () => {
        const base = resolveBase(table);
        const mraw: any = (globalThis as any).__offMock || {};
        if (mraw.singleError && mraw.singleTable === table) return { data: null, error: mraw.singleError };
        const d = apply(base, table);
        return { data: d[0] || null, error: null };
      },
      insert: (row: any) => ({
        select: () => ({
          single: () => {
            const mraw: any = (globalThis as any).__offMock || {};
            mraw.__state = mraw.__state || { inserts: {}, updates: {}, deletes: {} };
            mraw.__state.inserts[table] = mraw.__state.inserts[table] || [];
            const id = row.id || `${table.slice(0, 2)}_${Date.now()}`;
            const record = { id, ...row };
            const base = resolveBase(table);
            base.push(record);
            (globalThis as any).__offMock = { ...mraw, [table]: base, __state: mraw.__state };
            mraw.__state.inserts[table].push(record);
            return { data: record, error: null };
          },
        }),
      }),
      update: (updates: any) => ({
        eq: (col: string, val: any) => {
          const mraw: any = (globalThis as any).__offMock || {};
          mraw.__state = mraw.__state || { inserts: {}, updates: {}, deletes: {} };
          const base = resolveBase(table);
          let updated: any = null;
          for (let i = 0; i < base.length; i++) {
            if (base[i][col] === val) {
              base[i] = { ...base[i], ...updates };
              updated = base[i];
              break;
            }
          }
          (globalThis as any).__offMock = { ...mraw, [table]: base, __state: mraw.__state };
          mraw.__state.updates[table] = mraw.__state.updates[table] || [];
          mraw.__state.updates[table].push({ where: { col, val }, updates });
          return {
            select: () => ({
              single: () => ({ data: updated || { id: val, ...updates }, error: null }),
            }),
          };
        },
      }),
      then: (resolve: any) => {
        const base = resolveBase(table);
        return resolve({ data: apply(base, table), error: null, count: base.length });
      },
    });
    return { from: (table: string) => chain(table) };
  };
  return { createAdminClient: jest.fn(() => build()) };
});

describe('admin offers: listing and lookup', () => {
  beforeEach(() => { (globalThis as any).__offMock = {}; });

  it('returns active non-expired offers and filters restricted by default', async () => {
    const now = new Date();
    const past = new Date(now.getTime() - 86400000).toISOString();
    const future = new Date(now.getTime() + 86400000).toISOString();
    (globalThis as any).__offMock = {
      offer_codes: [
        { id: 'o1', code: 'FIRST50', is_active: true, expires_at: future, requires_approval: false },
        { id: 'o2', code: 'VIP20', is_active: true, expires_at: future, requires_approval: true },
        { id: 'o3', code: 'OLD', is_active: true, expires_at: past, requires_approval: false },
        { id: 'o4', code: 'INACTIVE', is_active: false, expires_at: future, requires_approval: false },
      ],
    };
    const std = await getOfferCodes();
    expect(std.map(o => o.code)).toContain('FIRST50');
    expect(std.map(o => o.code)).not.toContain('VIP20');
    const all = await getOfferCodes({ includeRestricted: true });
    expect(all.map(o => o.code)).toContain('VIP20');
    expect(all.map(o => o.code)).not.toContain('OLD');
    expect(all.map(o => o.code)).not.toContain('INACTIVE');
  });

  it('supports includeExpired to return expired and inactive offers', async () => {
    const now = new Date();
    const past = new Date(now.getTime() - 86400000).toISOString();
    const future = new Date(now.getTime() + 86400000).toISOString();
    (globalThis as any).__offMock = {
      offer_codes: [
        { id: 'o1', code: 'ACTIVE', is_active: true, expires_at: future, requires_approval: false },
        { id: 'o2', code: 'OLD', is_active: true, expires_at: past, requires_approval: false },
        { id: 'o3', code: 'INACTIVE', is_active: false, expires_at: future, requires_approval: false },
        { id: 'o4', code: 'VIP', is_active: true, expires_at: future, requires_approval: true },
      ],
    };
    const all = await getOfferCodes({ includeExpired: true, includeRestricted: true });
    const codes = all.map(o => o.code);
    expect(codes).toEqual(expect.arrayContaining(['ACTIVE', 'OLD', 'INACTIVE', 'VIP']));
  });

  it('looks up offer by code and supports PGRST116 not found', async () => {
    (globalThis as any).__offMock = {
      offer_codes: [{ id: 'o1', code: 'FIRST50', is_active: true }],
    };
    const found = await getOfferByCode('first50');
    expect(found?.id).toBe('o1');
    (globalThis as any).__offMock.singleError = { code: 'PGRST116', message: 'not found' };
    (globalThis as any).__offMock.singleTable = 'offer_codes';
    const none = await getOfferByCode('missing');
    expect(none).toBeNull();
  });

  it('throws when getOfferByCode returns non-PGRST116 error', async () => {
    (globalThis as any).__offMock = {
      offer_codes: [],
      singleError: { code: 'PGRST001', message: 'permission denied' },
      singleTable: 'offer_codes',
    };
    await expect(getOfferByCode('VIP20')).rejects.toThrow('Failed to get offer: permission denied');
  });
});

describe('admin offers: availability and validation', () => {
  beforeEach(() => { (globalThis as any).__offMock = {}; });

  it('gets available offers for a plan and separates restricted', async () => {
    (globalThis as any).__offMock = {
      offer_codes: [
        { id: 'o1', code: 'A1', is_active: true, requires_approval: false, applicable_plans: [], usage_count: 0 },
        { id: 'o2', code: 'A2', is_active: true, requires_approval: false, applicable_plans: ['gold_pro'], usage_count: 0 },
        { id: 'o3', code: 'R1', is_active: true, requires_approval: true, applicable_plans: ['gold_pro'], usage_count: 0 },
        { id: 'o4', code: 'MAXED', is_active: true, requires_approval: false, applicable_plans: ['gold_pro'], usage_count: 10, usage_limit: 10 },
      ],
    };
    const res = await getAvailableOffers('gold_pro');
    expect(res.standard.map(o => o.code)).toEqual(expect.arrayContaining(['A1', 'A2']));
    expect(res.standard.map(o => o.code)).not.toContain('MAXED');
    expect(res.restricted.map(o => o.code)).toContain('R1');
  });

  it('excludes expired offers in availability list', async () => {
    const now = new Date();
    const past = new Date(now.getTime() - 86400000).toISOString();
    const future = new Date(now.getTime() + 86400000).toISOString();
    (globalThis as any).__offMock = {
      offer_codes: [
        { id: 'o1', code: 'NEW', is_active: true, expires_at: future, applicable_plans: ['gold_pro'], requires_approval: false, usage_count: 0 },
        { id: 'o2', code: 'OLD', is_active: true, expires_at: past, applicable_plans: ['gold_pro'], requires_approval: false, usage_count: 0 },
      ],
    };
    const res = await getAvailableOffers('gold_pro');
    expect(res.standard.map(o => o.code)).toContain('NEW');
    expect(res.standard.map(o => o.code)).not.toContain('OLD');
  });

  it('validates offer code with commission impact and handles invalid plan', async () => {
    (globalThis as any).__offMock = {
      offer_codes: [
        {
          id: 'o1',
          code: 'FIRST50',
          is_active: true,
          applicable_plans: ['gold_pro'],
          discount_type: 'percent_first_month',
          discount_value: 50,
          commission_impact_type: 'reduce_upfront',
          commission_impact_value: 0,
          usage_count: 0,
        },
      ],
    };
    const ok = await validateOfferCode('FIRST50', 'gold_pro', 10000);
    expect(ok.valid).toBe(true);
    expect(ok.commission_impact?.description.length).toBeGreaterThan(0);
    const badPlan = await validateOfferCode('FIRST50', 'silver', 10000);
    expect(badPlan.valid).toBe(false);
  });

  it('returns not-found from validateOfferCode when code missing', async () => {
    (globalThis as any).__offMock = {
      offer_codes: [],
      singleError: { code: 'PGRST116', message: 'not found' },
      singleTable: 'offer_codes',
    };
    const res = await validateOfferCode('MISSING', 'gold_pro', 10000);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('Offer code not found');
  });
  it('invalidates inactive, expired, and usage-limited offer codes', async () => {
    const now = new Date();
    const past = new Date(now.getTime() - 86400000).toISOString();
    (globalThis as any).__offMock = {
      offer_codes: [
        { id: 'i1', code: 'INACT', is_active: false, applicable_plans: ['gold_pro'], usage_count: 0 },
        { id: 'e1', code: 'OLD', is_active: true, expires_at: past, applicable_plans: ['gold_pro'], usage_count: 0 },
        { id: 'l1', code: 'MAXED', is_active: true, applicable_plans: ['gold_pro'], usage_count: 5, usage_limit: 5 },
      ],
    };
    const r1 = await validateOfferCode('INACT', 'gold_pro', 10000);
    expect(r1.valid).toBe(false);
    expect(r1.error).toBe('Offer code is no longer active');
    const r2 = await validateOfferCode('OLD', 'gold_pro', 10000);
    expect(r2.valid).toBe(false);
    expect(r2.error).toBe('Offer code has expired');
    const r3 = await validateOfferCode('MAXED', 'gold_pro', 10000);
    expect(r3.valid).toBe(false);
    expect(r3.error).toBe('Offer code has reached its usage limit');
  });

  it('returns correct commission impact for reduce_all and delay_upfront', async () => {
    (globalThis as any).__offMock = {
      offer_codes: [
        {
          id: 'r1',
          code: 'REDALL',
          is_active: true,
          applicable_plans: ['gold_pro'],
          commission_impact_type: 'reduce_all',
          commission_impact_value: 15,
          usage_count: 0,
        },
        {
          id: 'd1',
          code: 'DELAY',
          is_active: true,
          applicable_plans: ['gold_pro'],
          commission_impact_type: 'delay_upfront',
          usage_count: 0,
        },
      ],
    };
    const a = await validateOfferCode('REDALL', 'gold_pro', 10000);
    expect(a.valid).toBe(true);
    expect(a.commission_impact?.upfront_adjustment).toBeCloseTo(-0.15, 5);
    expect(a.commission_impact?.recurring_adjustment).toBeCloseTo(-0.15, 5);
    expect(a.commission_impact?.description).toContain('15%');
    const b = await validateOfferCode('DELAY', 'gold_pro', 10000);
    expect(b.valid).toBe(true);
    expect(b.commission_impact?.description).toContain('Month 2');
  });

  it('returns commission impact messaging for free trial reduce_upfront and none', async () => {
    (globalThis as any).__offMock = {
      offer_codes: [
        {
          id: 'f1',
          code: 'FREETRIAL',
          is_active: true,
          applicable_plans: ['gold_pro'],
          discount_type: 'free_trial',
          commission_impact_type: 'reduce_upfront',
          usage_count: 0,
        },
        {
          id: 'n1',
          code: 'NOIMPACT',
          is_active: true,
          applicable_plans: ['gold_pro'],
          commission_impact_type: 'none',
          usage_count: 0,
        },
      ],
    };
    const t = await validateOfferCode('FREETRIAL', 'gold_pro', 10000);
    expect(t.valid).toBe(true);
    expect(t.commission_impact?.description).toContain('after trial converts');
    const n = await validateOfferCode('NOIMPACT', 'gold_pro', 10000);
    expect(n.valid).toBe(true);
    expect(n.commission_impact?.description).toContain('No impact');
  });
});

describe('admin offers: apply and history', () => {
  beforeEach(() => { (globalThis as any).__offMock = {}; });

  it('applies offer code and increments usage', async () => {
    (globalThis as any).__offMock = {
      offer_codes: [{ id: 'o1', code: 'FIRST50', is_active: true, usage_count: 2 }],
      offer_usage: [],
    };
    const usage = await applyOfferCode('FIRST50', 'c1', 'a1', 's1');
    expect(usage.offer_code_id).toBe('o1');
    const state = (globalThis as any).__offMock.__state;
    expect(state.inserts.offer_usage.length).toBeGreaterThanOrEqual(1);
    expect(state.updates.offer_codes.length).toBeGreaterThanOrEqual(1);
  });

  it('throws on apply when offer code not found', async () => {
    (globalThis as any).__offMock = {
      offer_codes: [],
      offer_usage: [],
      singleError: { code: 'PGRST116', message: 'not found' },
      singleTable: 'offer_codes',
    };
    await expect(applyOfferCode('MISSING', 'c1', 'a1', 's1')).rejects.toThrow('Offer code not found');
  });

  it('gets client offer history with nested offer join', async () => {
    (globalThis as any).__offMock = {
      offer_codes: [{ id: 'o1', code: 'FIRST50' }],
      offer_usage: [
        { id: 'u1', client_id: 'c1', offer_code_id: 'o1', applied_at: '2025-01-01' },
      ],
    };
    const hist = await getClientOfferHistory('c1');
    expect(hist.length).toBe(1);
    expect(hist[0].offer.code).toBe('FIRST50');
  });
});

describe('admin offers: approvals and pricing', () => {
  beforeEach(() => { (globalThis as any).__offMock = {}; });

  it('requests approval for restricted offer and rejects non-restricted', async () => {
    (globalThis as any).__offMock = {
      offer_codes: [{ id: 'o1', code: 'VIP20', requires_approval: true }],
      offer_approval_requests: [],
    };
    const res = await requestOfferApproval('VIP20', 'a1', 'c1', 'Just');
    expect(res.status).toBe('pending');
    await expect(requestOfferApproval('MISSING', 'a1', 'c1', 'x')).rejects.toThrow('Offer code not found');
    (globalThis as any).__offMock = {
      offer_codes: [{ id: 'o2', code: 'FREE', requires_approval: false }],
      offer_approval_requests: [],
    };
    await expect(requestOfferApproval('FREE', 'a1', 'c1', 'x')).rejects.toThrow('This offer does not require approval');
  });

  it('calculates discounted price for multiple discount types', () => {
    const off1: any = { discount_type: 'percent_first_month', discount_value: 50 };
    const d1 = calculateDiscountedPrice(off1, 10000, 'monthly');
    expect(d1.first_payment).toBe(5000);
    const off2: any = { discount_type: 'percent_forever', discount_value: 25 };
    const d2 = calculateDiscountedPrice(off2, 10000, 'annual');
    expect(d2.first_payment).toBe(90000);
    const off3: any = { discount_type: 'free_trial', discount_duration_months: 14 };
    const d3 = calculateDiscountedPrice(off3, 10000, 'monthly');
    expect(d3.first_payment).toBe(0);
    const off4: any = { discount_type: 'percent_months', discount_value: 30, discount_duration_months: 3 };
    const d4 = calculateDiscountedPrice(off4, 10000, 'monthly');
    expect(d4.first_payment).toBe(7000);
    const off5: any = { discount_type: 'flat_waive', description: 'Fee waived' };
    const d5 = calculateDiscountedPrice(off5, 10000, 'monthly');
    expect(d5.description).toContain('Fee');
  });
});
