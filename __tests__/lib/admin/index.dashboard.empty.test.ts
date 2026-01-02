import { getDashboardStats } from '@/lib/admin/index';

jest.mock('@/lib/supabase/server', () => {
  const buildClient = () => {
    const m: any = (globalThis as any).__admIndexEmptyMock || {};
    const resolveBase = (table: string) => {
      switch (table) {
        case 'crm_accounts': return m.crm_accounts || [];
        case 'agent_submissions': return m.agent_submissions || [];
        case 'founders_program': return m.founders_program || [];
        default: return [];
      }
    };
    const makeChain = (table: string): any => {
      const state: any = { filters: [], opts: null, table };
      const apply = (rows: any[]) => {
        let data = [...rows];
        for (const f of state.filters) {
          if (f.type === 'eq') data = data.filter(r => r[f.col] === f.val);
        }
        return data;
      };
      const api: any = {
        select: (_fields?: string, opts?: any) => { state.opts = opts || null; return api; },
        eq: (col: string, val: any) => { state.filters.push({ type: 'eq', col, val }); return api; },
        in: (col: string, vals: any[]) => { state.filters.push({ type: 'in', col, vals }); return api; },
        single: () => {
          const base = resolveBase(state.table);
          // Simulate missing founders_program with PGRST116
          if (state.table === 'founders_program' && base.length === 0) {
            return { data: null, error: { code: 'PGRST116' } };
          }
          const first = apply(base)[0] || null;
          return { data: first, error: null };
        },
        then: async (resolve: any) => {
          const base = resolveBase(table);
          if (state.opts && state.opts.count === 'exact' && state.opts.head === true) {
            return resolve({ data: [], error: null, count: base.length });
          }
          return resolve({ data: apply(base), error: null, count: base.length });
        },
      };
      return api;
    };
    return {
      from: (table: string) => ({
        select: (fields?: string, opts?: any) => makeChain(table).select(fields, opts),
        eq: (c: string, v: any) => makeChain(table).eq(c, v),
        insert: (row: any) => {
          const mraw: any = (globalThis as any).__admIndexEmptyMock || {};
          const base = resolveBase(table);
          const record = { id: `${table}_id_${Date.now()}`, ...row };
          base.push(record);
          (globalThis as any).__admIndexEmptyMock = { ...mraw, [table]: base };
          return {
            select: () => ({
              single: () => ({ data: record, error: null }),
            }),
          };
        },
        then: (resolve: any) => makeChain(table).then(resolve),
      }),
    };
  };
  return { createClient: jest.fn(() => buildClient()) };
});

describe('admin index: dashboard stats empty', () => {
  beforeEach(() => { (globalThis as any).__admIndexEmptyMock = { crm_accounts: [], agent_submissions: [], founders_program: [] }; });

  it('returns zeros and defaults when no data', async () => {
    const stats = await getDashboardStats();
    expect(stats.totalAccounts).toBe(0);
    expect(stats.activePaying).toBe(0);
    expect(stats.trialsEndingSoon).toBe(0);
    expect(stats.mrr).toBe(0);
    expect(stats.trialConversionRate).toBe(0);
    expect(stats.churnRate).toBe(0);
    expect(stats.pendingSubmissions).toBe(0);
  });
});
