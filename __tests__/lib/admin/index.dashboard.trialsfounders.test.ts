import { getDashboardStats } from '@/lib/admin/index';

jest.mock('@/lib/supabase/server', () => {
  const buildClient = () => {
    const m: any = (globalThis as any).__admIndexTFMock || {};
    const resolveBase = (table: string) => {
      switch (table) {
        case 'crm_accounts': return (m.crm_accounts || []).slice();
        case 'agent_submissions': return (m.agent_submissions || []).slice();
        default: return [];
      }
    };
    const makeChain = (table: string): any => {
      const state: any = { filters: [], opts: null, orderKey: null, rangeVals: null };
      const apply = (rows: any[]) => {
        let data = rows.slice();
        for (const f of state.filters) {
          if (f.type === 'eq') data = data.filter(r => r[f.col] === f.val);
          if (f.type === 'in') data = data.filter(r => (f.vals || []).includes(r[f.col]));
        }
        if (state.orderKey) {
          data.sort((a, b) => String(b[state.orderKey]).localeCompare(String(a[state.orderKey])));
        }
        if (state.rangeVals) data = data.slice(state.rangeVals.start, state.rangeVals.end + 1);
        return data;
      };
      const api: any = {
        select: (_fields?: string, opts?: any) => { state.opts = opts || null; return api; },
        order: (key: string, _opts?: any) => { state.orderKey = key; return api; },
        eq: (col: string, val: any) => { state.filters.push({ type: 'eq', col, val }); return api; },
        in: (col: string, vals: any[]) => { state.filters.push({ type: 'in', col, vals }); return api; },
        range: (start: number, end: number) => { state.rangeVals = { start, end }; return api; },
        single: () => {
          const base = resolveBase(table);
          const first = apply(base)[0] || null;
          return { data: first, error: null };
        },
        then: async (resolve: any) => {
          const base = resolveBase(table);
          if (state.opts && state.opts.count === 'exact' && state.opts.head === true) {
            return resolve({ data: [], error: null, count: resolveBase(table).length });
          }
          return resolve({ data: apply(base), error: null, count: resolveBase(table).length });
        },
      };
      return api;
    };
    return {
      from: (table: string) => ({
        select: (fields?: string, opts?: any) => makeChain(table).select(fields, opts),
        order: (key: string, opts?: any) => makeChain(table).order(key, opts),
        eq: (c: string, v: any) => makeChain(table).eq(c, v),
        in: (c: string, vals: any[]) => makeChain(table).in(c, vals),
        range: (s: number, e: number) => makeChain(table).range(s, e),
        single: () => makeChain(table).single(),
        then: (resolve: any) => makeChain(table).then(resolve),
      }),
    };
  };
  return {
    createClient: jest.fn(() => buildClient()),
    createAdminClient: jest.fn(() => buildClient())
  };
});

describe('admin index: dashboard trials', () => {
  beforeEach(() => { (globalThis as any).__admIndexTFMock = {}; });

  it('computes trialsEndingSoon', async () => {
    const now = new Date();
    const soon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const later = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString();
    (globalThis as any).__admIndexTFMock = {
      crm_accounts: [
        { plan_status: 'active', monthly_price: 100, is_trial: true, trial_end_date: soon, trial_converted: false },
        { plan_status: 'cancelled', monthly_price: 0, is_trial: true, trial_end_date: later, trial_converted: false },
        { plan_status: 'active', monthly_price: 50, is_trial: false, trial_converted: true },
      ],
      agent_submissions: [],
    };
    const stats = await getDashboardStats();
    expect(stats.trialsEndingSoon).toBe(1);
    expect(stats.churnRate).toBeGreaterThan(0);
    expect(stats.trialConversionRate).toBeGreaterThan(0);
  });
});
