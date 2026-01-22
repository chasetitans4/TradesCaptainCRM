import { getCommissions } from '@/lib/admin/commissions';

jest.mock('@/lib/supabase/server', () => {
  const buildCommissions = () => {
    const now = Date.now();
    return [
      { id: 'c1', agent_id: 'a1', status: 'eligible', commission_type: 'recurring', created_at: new Date(now - 1000).toISOString() },
      { id: 'c2', agent_id: 'a1', status: 'pending', commission_type: 'upfront', created_at: new Date(now - 2000).toISOString() },
      { id: 'c3', agent_id: 'a2', status: 'eligible', commission_type: 'annual_onetime', created_at: new Date(now - 3000).toISOString() },
      { id: 'c4', agent_id: 'a3', status: 'approved', commission_type: 'recurring', created_at: new Date(now - 4000).toISOString() },
      { id: 'c5', agent_id: 'a1', status: 'eligible', commission_type: 'upfront', created_at: new Date(now - 5000).toISOString() },
    ];
  };
  return {
    createAdminClient: jest.fn(() => {
      const moduleState = (globalThis as any).__commMockState || {
        rows: buildCommissions(),
        filters: [],
        orderKey: 'created_at',
        orderAsc: false,
        errorOnQuery: false,
      };
      (globalThis as any).__commMockState = moduleState;
      const applyFilters = () => {
        let data = [...moduleState.rows];
        for (const f of moduleState.filters) {
          if (f.type === 'eq') {
            data = data.filter((row: any) => row[f.col] === f.val);
          }
        }
        if (moduleState.orderKey) {
          data.sort((a: any, b: any) => {
            const av = a[moduleState.orderKey];
            const bv = b[moduleState.orderKey];
            const cmp = typeof av === 'string' && typeof bv === 'string'
              ? av.localeCompare(bv)
              : (av > bv ? 1 : av < bv ? -1 : 0);
            return moduleState.orderAsc ? cmp : -cmp;
          });
        }
        return data;
      };
      const chain: any = {
        select: (_fields?: string, _opts?: any) => chain,
        eq: (col: string, val: any) => { moduleState.filters.push({ type: 'eq', col, val }); return chain; },
        order: (key: string, opts: any) => { moduleState.orderKey = key; moduleState.orderAsc = !!(opts && opts.ascending); return chain; },
        range: (start: number, end: number) => {
          const filtered = applyFilters();
          const sliced = filtered.slice(start, end + 1);
          if (moduleState.errorOnQuery) {
            return Promise.resolve({ data: null, error: new Error('query error'), count: 0 });
          }
          return Promise.resolve({ data: sliced, error: null, count: filtered.length });
        },
      };
      return {
        from: (table: string) => {
          if (table === 'commissions') return chain;
          return {} as any;
        },
      };
    }),
    get __state() {
      if (!(globalThis as any).__commMockState) {
        (globalThis as any).__commMockState = {
          rows: buildCommissions(),
          filters: [],
          orderKey: 'created_at',
          orderAsc: false,
          errorOnQuery: false,
        };
      }
      return (globalThis as any).__commMockState;
    },
  };
});

describe('admin commissions: listing with filters and pagination', () => {
  beforeEach(() => {
    const supabase = require('@/lib/supabase/server');
    supabase.__state.filters = [];
    supabase.__state.errorOnQuery = false;
  });
  it('lists commissions without filters and returns total count', async () => {
    const res = await getCommissions({ page: 1, limit: 3 });
    expect(res.commissions.length).toBe(3);
    expect(res.total).toBeGreaterThanOrEqual(5);
    const ids = res.commissions.map(c => c.id);
    expect(ids[0]).toBe('c1'); // ordered desc by created_at
  });

  it('filters by agentId, status, and type', async () => {
    const res = await getCommissions({ agentId: 'a1', status: 'eligible', type: 'recurring', page: 1, limit: 10 });
    expect(res.total).toBe(1);
    expect(res.commissions.length).toBe(1);
    expect(res.commissions[0].id).toBe('c1');
  });

  it('paginates results using page and limit', async () => {
    const res1 = await getCommissions({ page: 1, limit: 2 });
    const res2 = await getCommissions({ page: 2, limit: 2 });
    expect(res1.commissions.length).toBe(2);
    expect(res2.commissions.length).toBe(2);
    expect(res1.commissions[0].id).not.toBe(res2.commissions[0].id);
  });

  it('returns empty results when query returns error', async () => {
    // Note: getCommissions handles errors gracefully and returns empty results
    // instead of throwing, to support cases where the table might not exist
    const supabase = require('@/lib/supabase/server');
    supabase.__state.errorOnQuery = true;
    const result = await getCommissions({ page: 1, limit: 5 });
    expect(result.commissions).toEqual([]);
    expect(result.total).toBe(0);
    supabase.__state.errorOnQuery = false;
  });
});
