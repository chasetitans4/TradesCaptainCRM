import {
  getAllPlanPricing,
  getPlanPricing,
  getPlansByTrack,
  getPlanFeatures,
  getPlanDetails,
  comparePlans,
  getClientUpgradeOptions,
  getPlanTracksSummary,
} from '@/lib/admin/plans';

jest.mock('@/lib/supabase/server', () => {
  const build = () => {
    const m: any = (globalThis as any).__plansMock || {};
    const state: any = { filters: [] as any[], orderBy: null as any, lastSelect: null as any };
    const resolveBase = (table: string) => {
      switch (table) {
        case 'plan_pricing': return m.plan_pricing || [];
        case 'plan_features': return m.plan_features || [];
        case 'plan_upgrade_paths': return m.plan_upgrade_paths || [];
        case 'crm_accounts': return m.crm_accounts || [];
        case 'sms_usage': return m.sms_usage || [];
        default: return [];
      }
    };
    const applyFilters = (arr: any[]) => {
      let data = Array.isArray(arr) ? [...arr] : [];
      for (const f of state.filters) {
        if (f.type === 'eq') data = data.filter((r: any) => r[f.col] === f.val);
        if (f.type === 'in') data = data.filter((r: any) => f.val.includes(r[f.col]));
      }
      if (state.orderBy) {
        const { key, asc } = state.orderBy;
        data = data.sort((a: any, b: any) => {
          const av = a[key], bv = b[key];
          const cmp = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : (av > bv ? 1 : av < bv ? -1 : 0);
          return asc ? cmp : -cmp;
        });
      }
      return data;
    };
    const makeChain = (table: string) => {
      const chain: any = {
        select: (_fields?: any, _opts?: any) => {
          state.lastSelect = { table };
          return chain;
        },
        eq: (col: string, val: any) => { state.filters.push({ type: 'eq', col, val }); return chain; },
        order: (key: string, opts: any) => { state.orderBy = { key, asc: !!(opts && opts.ascending) }; return chain; },
        in: (col: string, vals: any[]) => { state.filters.push({ type: 'in', col, val: vals }); return chain; },
        range: (_s: number, _e: number) => chain,
        single: () => {
          const data = applyFilters(resolveBase(table));
          const err = m.singleError && m.singleTable === table ? m.singleError : null;
          return { data: data[0] || null, error: err };
        },
        then: (resolve: any) => resolve({ data: applyFilters(resolveBase(table)), error: m.listError && m.listTable === table ? new Error('list fail') : null, count: applyFilters(resolveBase(table)).length }),
      };
      return chain;
    };
    return { from: (table: string) => makeChain(table) };
  };
  return { createAdminClient: jest.fn(() => build()) };
});

describe('admin plans: pricing and features', () => {
  beforeEach(() => { (globalThis as any).__plansMock = {}; });

  it('gets all active plan pricing and orders by display_order', async () => {
    (globalThis as any).__plansMock = {
      plan_pricing: [
        { id: 'p1', plan_type: 'blue_starter', is_active: true, display_order: 2 },
        { id: 'p2', plan_type: 'blue_pro', is_active: true, display_order: 1 },
        { id: 'p3', plan_type: 'legacy', is_active: false, display_order: 3 },
      ],
    };
    const rows = await getAllPlanPricing();
    expect(rows.length).toBe(3 - 1);
    expect(rows[0].plan_type).toBe('blue_pro');
  });

  it('throws when getAllPlanPricing select fails', async () => {
    (globalThis as any).__plansMock = { listError: true, listTable: 'plan_pricing' };
    await expect(getAllPlanPricing()).rejects.toThrow('Failed to get plan pricing');
  });

  it('gets plan pricing by type and returns null on PGRST116', async () => {
    (globalThis as any).__plansMock = {
      plan_pricing: [{ id: 'p1', plan_type: 'blue_pro' }],
    };
    const one = await getPlanPricing('blue_pro');
    expect(one?.plan_type).toBe('blue_pro');
    (globalThis as any).__plansMock.singleError = { code: 'PGRST116', message: 'missing' };
    (globalThis as any).__plansMock.singleTable = 'plan_pricing';
    const none = await getPlanPricing('missing');
    expect(none).toBeNull();
  });
  
  it('throws when getPlanPricing encounters non-PGRST116 error', async () => {
    (globalThis as any).__plansMock = {
      plan_pricing: [{ id: 'p1', plan_type: 'blue_pro' }],
      singleError: { code: 'XX', message: 'bad' },
      singleTable: 'plan_pricing',
    };
    await expect(getPlanPricing('blue_pro')).rejects.toThrow('Failed to get plan pricing');
  });

  it('gets plan features and throws on error', async () => {
    (globalThis as any).__plansMock = {
      plan_features: [
        { id: 'f1', plan_type: 'blue_pro', feature_name: 'A', feature_category: 'core', is_included: true, display_value: 'yes', display_order: 2 },
        { id: 'f2', plan_type: 'blue_pro', feature_name: 'B', feature_category: 'core', is_included: false, display_value: 'no', display_order: 1 },
      ],
    };
    const list = await getPlanFeatures('blue_pro');
    expect(list.length).toBe(2);
    (globalThis as any).__plansMock.listError = true;
    (globalThis as any).__plansMock.listTable = 'plan_features';
    await expect(getPlanFeatures('blue_pro')).rejects.toThrow('Failed to get plan features');
  });
});

describe('admin plans: details and comparison', () => {
  beforeEach(() => { (globalThis as any).__plansMock = {}; });

  it('gets plan details including SMS and calendar flags', async () => {
    (globalThis as any).__plansMock = {
      plan_pricing: [{ id: 'pp', plan_type: 'blue_pro', plan_name: 'Blue Pro' }],
      plan_features: [
        { id: 'f1', plan_type: 'blue_pro', feature_name: 'Leads Captain AI SMS', feature_category: 'sms', is_included: true, display_value: '1,000 messages', display_order: 1 },
        { id: 'f2', plan_type: 'blue_pro', feature_name: 'Calendar Booking via SMS', feature_category: 'sms', is_included: true, display_value: null, display_order: 2 },
        { id: 'f3', plan_type: 'blue_pro', feature_name: 'Other', feature_category: 'core', is_included: false, display_value: null, display_order: 3 },
      ],
      plan_upgrade_paths: [
        { id: 'u1', from_plan_type: 'blue_pro', to_plan_type: 'blue_enterprise', price_difference_cents: 5000, is_recommended: true, benefits_summary: 'More features', display_order: 1 },
      ],
    };
    const details = await getPlanDetails('blue_pro');
    expect(details?.sms.included).toBe(1000);
    expect(details?.sms.has_nevermiss).toBe(true);
    expect(details?.sms.has_calendar_booking).toBe(true);
    expect(details?.upgradePaths.length).toBe(1);
  });
  
  it('getPlanDetails returns null when pricing missing', async () => {
    (globalThis as any).__plansMock = {
      plan_pricing: [],
    };
    const details = await getPlanDetails('missing');
    expect(details).toBeNull();
  });
  
  it('getPlanDetails handles SMS not included and missing calendar booking', async () => {
    (globalThis as any).__plansMock = {
      plan_pricing: [{ id: 'pp2', plan_type: 'blue_basic', plan_name: 'Blue Basic' }],
      plan_features: [
        { id: 'f1', plan_type: 'blue_basic', feature_name: 'Leads Captain AI SMS', feature_category: 'sms', is_included: false, display_value: '1,000 messages', display_order: 1 },
        { id: 'f3', plan_type: 'blue_basic', feature_name: 'Other', feature_category: 'core', is_included: true, display_value: null, display_order: 2 },
      ],
    };
    const details = await getPlanDetails('blue_basic');
    expect(details?.sms.included).toBe(0);
    expect(details?.sms.has_nevermiss).toBe(false);
    expect(details?.sms.has_calendar_booking).toBe(false);
  });

  it('comparePlans throws when less than two valid plans', async () => {
    (globalThis as any).__plansMock = { plan_pricing: [{ id: 'p1', plan_type: 'blue_pro', monthly_price_cents: 9900 }] };
    await expect(comparePlans(['blue_pro'])).rejects.toThrow('Need at least 2 valid plans to compare');
  });

  it('compares plans and aggregates features with talking point', async () => {
    (globalThis as any).__plansMock = {
      plan_pricing: [
        { id: 'p1', plan_type: 'blue_starter', monthly_price_cents: 4900 },
        { id: 'p2', plan_type: 'blue_pro', monthly_price_cents: 9900 },
      ],
      plan_features: [
        { id: 'fs1', plan_type: 'blue_starter', feature_name: 'Feature A', feature_description: 'd', feature_category: 'core', is_included: true, display_value: '✓' },
        { id: 'fs2', plan_type: 'blue_pro', feature_name: 'Feature A', feature_description: 'd', feature_category: 'core', is_included: false, display_value: null },
      ],
      plan_upgrade_paths: [{ id: 'up', from_plan_type: 'blue_starter', to_plan_type: 'blue_pro', talking_point: 'Upgrade benefits' }],
    };
    const res = await comparePlans(['blue_starter', 'blue_pro']);
    expect(res.features.length).toBeGreaterThanOrEqual(1);
    expect(res.price_difference).toBe(9900 - 4900);
    expect(res.talking_point).toBe('Upgrade benefits');
  });
});

describe('admin plans: upgrade options and tracks summary', () => {
  beforeEach(() => { (globalThis as any).__plansMock = {}; });

  it('gets client upgrade options with no paths', async () => {
    (globalThis as any).__plansMock = {
      plan_pricing: [{ id: 'p1', plan_type: 'blue_pro' }],
      plan_upgrade_paths: [],
    };
    const res = await getClientUpgradeOptions('c1', 'blue_pro');
    expect(res?.upgrade_options.length).toBe(0);
    expect(res?.current_plan.plan_type).toBe('blue_pro');
  });

  it('gets client upgrade options with paths and usage and suggestion', async () => {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    (globalThis as any).__plansMock = {
      plan_pricing: [
        { id: 'p1', plan_type: 'blue_pro' },
        { id: 'p2', plan_type: 'blue_enterprise' },
      ],
      plan_upgrade_paths: [
        { id: 'u1', from_plan_type: 'blue_pro', to_plan_type: 'blue_enterprise', price_difference_cents: 10000, is_recommended: true, benefits_summary: 'Best for growth', display_order: 1 },
      ],
      crm_accounts: [{ id: 'c1', business_id: 'b1' }],
      sms_usage: [{ business_id: 'b1', period_start: periodStart, sms_sent: 80, sms_received: 20, sms_limit: 200 }],
    };
    const res = await getClientUpgradeOptions('c1', 'blue_pro');
    expect(res?.upgrade_options.length).toBe(1);
    expect(res?.current_usage?.percentage).toBe(50);
    expect(res?.suggested_upgrade).toBe('blue_enterprise');
  });

  it('gets plan tracks summary with price range', async () => {
    (globalThis as any).__plansMock = {
      plan_pricing: [
        { id: 'p1', plan_type: 'blue_starter', track: 'blue', monthly_price_cents: 4900, is_active: true, display_order: 1 },
        { id: 'p2', plan_type: 'blue_pro', track: 'blue', monthly_price_cents: 9900, is_active: true, display_order: 2 },
        { id: 'p3', plan_type: 'leads_basic', track: 'leads_captain', monthly_price_cents: 2900, is_active: true, display_order: 1 },
      ],
    };
    const res = await getPlanTracksSummary();
    const blue = res.find(r => r.track === 'blue');
    expect(blue?.price_range).toBe('$49-$99');
    const lc = res.find(r => r.track === 'leads_captain');
    expect(lc?.price_range).toBe('$29/mo');
  });
});
