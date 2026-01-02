/**
 * Admin Plans Branch Coverage Tests
 *
 * Tests for edge cases and branches to achieve 85%+ branch coverage.
 */

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
    const m: any = (globalThis as any).__plansBranchMock || {};
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
        then: (resolve: any) => resolve({
          data: applyFilters(resolveBase(table)),
          error: m.listError && m.listTable === table ? new Error('list fail') : null,
          count: applyFilters(resolveBase(table)).length
        }),
      };
      return chain;
    };
    return { from: (table: string) => { state.filters = []; state.orderBy = null; return makeChain(table); } };
  };
  return { createAdminClient: jest.fn(() => build()) };
});

describe('admin plans branch coverage', () => {
  beforeEach(() => {
    (globalThis as any).__plansBranchMock = {};
  });

  describe('getAllPlanPricing', () => {
    it('returns empty array when data is null', async () => {
      (globalThis as any).__plansBranchMock = {
        plan_pricing: null,
      };
      const result = await getAllPlanPricing();
      expect(result).toEqual([]);
    });
  });

  describe('getPlansByTrack', () => {
    it('returns plans for valid track', async () => {
      (globalThis as any).__plansBranchMock = {
        plan_pricing: [
          { id: 'p1', plan_type: 'blue_starter', track: 'blue', is_active: true, display_order: 1 },
          { id: 'p2', plan_type: 'blue_pro', track: 'blue', is_active: true, display_order: 2 },
          { id: 'p3', plan_type: 'gold_basic', track: 'gold', is_active: true, display_order: 1 },
        ],
      };
      const result = await getPlansByTrack('blue');
      expect(result.length).toBe(2);
      expect(result[0].plan_type).toBe('blue_starter');
    });

    it('returns empty array when no plans for track', async () => {
      (globalThis as any).__plansBranchMock = {
        plan_pricing: [
          { id: 'p1', plan_type: 'blue_starter', track: 'blue', is_active: true, display_order: 1 },
        ],
      };
      const result = await getPlansByTrack('silver');
      expect(result).toEqual([]);
    });

    it('throws when database query fails', async () => {
      (globalThis as any).__plansBranchMock = {
        listError: true,
        listTable: 'plan_pricing',
      };
      await expect(getPlansByTrack('blue')).rejects.toThrow('Failed to get plans by track');
    });

    it('returns empty array when data is null', async () => {
      (globalThis as any).__plansBranchMock = {
        plan_pricing: null,
      };
      const result = await getPlansByTrack('blue');
      expect(result).toEqual([]);
    });
  });

  describe('getPlanFeatures', () => {
    it('returns empty array when data is null', async () => {
      (globalThis as any).__plansBranchMock = {
        plan_features: null,
      };
      const result = await getPlanFeatures('blue_pro');
      expect(result).toEqual([]);
    });
  });

  describe('getPlanDetails', () => {
    it('returns 0 SMS included when feature is included but display_value has no number', async () => {
      (globalThis as any).__plansBranchMock = {
        plan_pricing: [{ id: 'pp', plan_type: 'test_plan', plan_name: 'Test Plan' }],
        plan_features: [
          { id: 'f1', plan_type: 'test_plan', feature_name: 'Leads Captain AI SMS', feature_category: 'sms', is_included: true, display_value: 'Unlimited', display_order: 1 },
        ],
        plan_upgrade_paths: [],
      };
      const details = await getPlanDetails('test_plan');
      expect(details?.sms.included).toBe(0);
      expect(details?.sms.has_nevermiss).toBe(true);
    });

    it('returns 0 SMS when display_value is null but feature is included', async () => {
      (globalThis as any).__plansBranchMock = {
        plan_pricing: [{ id: 'pp', plan_type: 'test_plan2', plan_name: 'Test Plan 2' }],
        plan_features: [
          { id: 'f1', plan_type: 'test_plan2', feature_name: 'Leads Captain AI SMS', feature_category: 'sms', is_included: true, display_value: null, display_order: 1 },
        ],
        plan_upgrade_paths: [],
      };
      const details = await getPlanDetails('test_plan2');
      expect(details?.sms.included).toBe(0);
      expect(details?.sms.has_nevermiss).toBe(true);
    });

    it('handles missing SMS feature entirely', async () => {
      (globalThis as any).__plansBranchMock = {
        plan_pricing: [{ id: 'pp', plan_type: 'no_sms', plan_name: 'No SMS Plan' }],
        plan_features: [
          { id: 'f1', plan_type: 'no_sms', feature_name: 'Some Other Feature', feature_category: 'core', is_included: true, display_value: null, display_order: 1 },
        ],
        plan_upgrade_paths: [],
      };
      const details = await getPlanDetails('no_sms');
      expect(details?.sms.included).toBe(0);
      expect(details?.sms.has_nevermiss).toBe(false);
      expect(details?.sms.has_calendar_booking).toBe(false);
    });

    it('returns empty upgrade paths when null from database', async () => {
      (globalThis as any).__plansBranchMock = {
        plan_pricing: [{ id: 'pp', plan_type: 'null_paths', plan_name: 'Null Paths Plan' }],
        plan_features: [],
        plan_upgrade_paths: null,
      };
      const details = await getPlanDetails('null_paths');
      expect(details?.upgradePaths).toEqual([]);
    });
  });

  describe('comparePlans', () => {
    it('uses checkmark when display_value is null and feature is included', async () => {
      (globalThis as any).__plansBranchMock = {
        plan_pricing: [
          { id: 'p1', plan_type: 'plan_a', monthly_price_cents: 4900 },
          { id: 'p2', plan_type: 'plan_b', monthly_price_cents: 9900 },
        ],
        plan_features: [
          { id: 'f1', plan_type: 'plan_a', feature_name: 'Feature X', feature_description: 'desc', feature_category: 'core', is_included: true, display_value: null },
          { id: 'f2', plan_type: 'plan_b', feature_name: 'Feature X', feature_description: 'desc', feature_category: 'core', is_included: false, display_value: null },
        ],
        plan_upgrade_paths: [],
      };
      const result = await comparePlans(['plan_a', 'plan_b']);
      const featureX = result.features.find(f => f.name === 'Feature X');
      expect(featureX?.values['plan_a']).toBe('✓');
      expect(featureX?.values['plan_b']).toBe('✗');
    });

    it('returns null talking_point when no upgrade path exists', async () => {
      (globalThis as any).__plansBranchMock = {
        plan_pricing: [
          { id: 'p1', plan_type: 'solo', monthly_price_cents: 1000 },
          { id: 'p2', plan_type: 'duo', monthly_price_cents: 2000 },
        ],
        plan_features: [],
        plan_upgrade_paths: [],
      };
      const result = await comparePlans(['solo', 'duo']);
      expect(result.talking_point).toBeNull();
    });

    it('skips invalid plans in comparison', async () => {
      (globalThis as any).__plansBranchMock = {
        plan_pricing: [
          { id: 'p1', plan_type: 'valid1', monthly_price_cents: 1000 },
          { id: 'p2', plan_type: 'valid2', monthly_price_cents: 2000 },
        ],
        plan_features: [],
        plan_upgrade_paths: [],
      };
      // 'invalid' plan doesn't exist, so only valid1 and valid2 should be compared
      const result = await comparePlans(['invalid', 'valid1', 'valid2']);
      expect(result.plans.length).toBe(2);
    });

    it('throws when only one valid plan after filtering', async () => {
      (globalThis as any).__plansBranchMock = {
        plan_pricing: [
          { id: 'p1', plan_type: 'only_valid', monthly_price_cents: 1000 },
        ],
        plan_features: [],
        plan_upgrade_paths: [],
      };
      await expect(comparePlans(['invalid1', 'invalid2', 'only_valid'])).rejects.toThrow('Need at least 2 valid plans');
    });
  });

  describe('getClientUpgradeOptions', () => {
    it('returns null when current plan not found', async () => {
      (globalThis as any).__plansBranchMock = {
        plan_pricing: [],
      };
      const result = await getClientUpgradeOptions('c1', 'nonexistent');
      expect(result).toBeNull();
    });

    it('returns options when paths is null', async () => {
      (globalThis as any).__plansBranchMock = {
        plan_pricing: [{ id: 'p1', plan_type: 'basic' }],
        plan_upgrade_paths: null,
      };
      const result = await getClientUpgradeOptions('c1', 'basic');
      expect(result?.upgrade_options).toEqual([]);
    });

    it('skips upgrade path when target plan not found', async () => {
      (globalThis as any).__plansBranchMock = {
        plan_pricing: [{ id: 'p1', plan_type: 'basic' }],
        plan_upgrade_paths: [
          { id: 'u1', from_plan_type: 'basic', to_plan_type: 'nonexistent', price_difference_cents: 1000, is_recommended: false, display_order: 1 },
        ],
      };
      const result = await getClientUpgradeOptions('c1', 'basic');
      expect(result?.upgrade_options.length).toBe(0);
    });

    it('returns no usage when client has no business_id', async () => {
      (globalThis as any).__plansBranchMock = {
        plan_pricing: [{ id: 'p1', plan_type: 'basic' }],
        plan_upgrade_paths: [],
        crm_accounts: [{ id: 'c1', business_id: null }],
      };
      const result = await getClientUpgradeOptions('c1', 'basic');
      expect(result?.current_usage).toBeUndefined();
    });

    it('returns no usage when no sms_usage record found', async () => {
      (globalThis as any).__plansBranchMock = {
        plan_pricing: [{ id: 'p1', plan_type: 'basic' }],
        plan_upgrade_paths: [],
        crm_accounts: [{ id: 'c1', business_id: 'b1' }],
        sms_usage: [], // No matching usage record
      };
      const result = await getClientUpgradeOptions('c1', 'basic');
      expect(result?.current_usage).toBeUndefined();
    });

    it('uses default suggestion reason when benefits_summary is null', async () => {
      (globalThis as any).__plansBranchMock = {
        plan_pricing: [
          { id: 'p1', plan_type: 'basic' },
          { id: 'p2', plan_type: 'pro' },
        ],
        plan_upgrade_paths: [
          { id: 'u1', from_plan_type: 'basic', to_plan_type: 'pro', price_difference_cents: 5000, is_recommended: true, benefits_summary: null, display_order: 1 },
        ],
        crm_accounts: [],
      };
      const result = await getClientUpgradeOptions('c1', 'basic');
      expect(result?.suggested_upgrade).toBe('pro');
      expect(result?.suggestion_reason).toBe('Recommended upgrade for your business');
    });

    it('calculates commission correctly', async () => {
      (globalThis as any).__plansBranchMock = {
        plan_pricing: [
          { id: 'p1', plan_type: 'basic' },
          { id: 'p2', plan_type: 'pro' },
        ],
        plan_upgrade_paths: [
          { id: 'u1', from_plan_type: 'basic', to_plan_type: 'pro', price_difference_cents: 10000, is_recommended: false, benefits_summary: 'More features', display_order: 1 },
        ],
        crm_accounts: [],
      };
      const result = await getClientUpgradeOptions('c1', 'basic');
      expect(result?.upgrade_options[0].commission_upfront).toBe(50); // 10000/100 * 0.5
      expect(result?.upgrade_options[0].commission_recurring).toBe(10); // 10000/100 * 0.1
    });

    it('handles usage with partial null values', async () => {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      (globalThis as any).__plansBranchMock = {
        plan_pricing: [
          { id: 'p1', plan_type: 'basic' },
          { id: 'p2', plan_type: 'pro' },
        ],
        plan_upgrade_paths: [
          { id: 'u1', from_plan_type: 'basic', to_plan_type: 'pro', price_difference_cents: 5000, is_recommended: false, display_order: 1 },
        ],
        crm_accounts: [{ id: 'c1', business_id: 'b1' }],
        sms_usage: [{ business_id: 'b1', period_start: periodStart, sms_sent: 50, sms_received: 0, sms_limit: 100 }],
      };
      const result = await getClientUpgradeOptions('c1', 'basic');
      expect(result?.current_usage?.sms_used).toBe(50);
      expect(result?.current_usage?.percentage).toBe(50);
    });
  });

  describe('getPlanTracksSummary', () => {
    it('excludes tracks with no plans', async () => {
      (globalThis as any).__plansBranchMock = {
        plan_pricing: [
          { id: 'p1', plan_type: 'blue_starter', track: 'blue', monthly_price_cents: 4900, is_active: true, display_order: 1 },
        ],
      };
      const result = await getPlanTracksSummary();
      // Should only return blue track, others should be filtered out
      expect(result.length).toBe(1);
      expect(result[0].track).toBe('blue');
    });

    it('returns single price when min equals max', async () => {
      (globalThis as any).__plansBranchMock = {
        plan_pricing: [
          { id: 'p1', plan_type: 'leads_captain_solo', track: 'leads_captain', monthly_price_cents: 2900, is_active: true, display_order: 1 },
        ],
      };
      const result = await getPlanTracksSummary();
      const lc = result.find(r => r.track === 'leads_captain');
      expect(lc?.price_range).toBe('$29/mo');
    });

    it('returns price range when min differs from max', async () => {
      (globalThis as any).__plansBranchMock = {
        plan_pricing: [
          { id: 'p1', plan_type: 'web_basic', track: 'web', monthly_price_cents: 9900, is_active: true, display_order: 1 },
          { id: 'p2', plan_type: 'web_pro', track: 'web', monthly_price_cents: 19900, is_active: true, display_order: 2 },
        ],
      };
      const result = await getPlanTracksSummary();
      const web = result.find(r => r.track === 'web');
      expect(web?.price_range).toBe('$99-$199');
    });

    it('returns empty array when no tracks have plans', async () => {
      (globalThis as any).__plansBranchMock = {
        plan_pricing: [],
      };
      const result = await getPlanTracksSummary();
      expect(result).toEqual([]);
    });
  });
});
