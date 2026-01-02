import { getActivityLog, getAgentSubmissions, markSubmissionRegistered, rejectSubmission } from '@/lib/admin/index';

jest.mock('@/lib/supabase/server', () => {
  const build = () => {
    const m: any = (globalThis as any).__admErrMock || {};
    const resolveBase = (table: string) => (m[table] || []).slice();
    const makeChain = (table: string): any => {
      const state: any = { filters: [], countOpts: null };
      const apply = (rows: any[]) => {
        let data = rows.slice();
        for (const f of state.filters) {
          if (f.type === 'eq') data = data.filter(r => r[f.col] === f.val);
          if (f.type === 'in') data = data.filter(r => (f.vals || []).includes(r[f.col]));
        }
        return data;
      };
      const api: any = {
        select: (_fields?: string, opts?: any) => { state.countOpts = opts || null; return api; },
        order: () => api,
        eq: (col: string, val: any) => { state.filters.push({ type: 'eq', col, val }); return api; },
        in: (col: string, vals: any[]) => { state.filters.push({ type: 'in', col, vals }); return api; },
        range: () => api,
        then: (resolve: any) => {
          if (m.listError && m.listTable === table) return resolve({ data: [], error: m.listError, count: 0 });
          const base = resolveBase(table);
          const data = apply(base);
          const count = state.countOpts?.count === 'exact' ? data.length : undefined;
          return resolve({ data, error: null, count });
        },
      };
      return api;
    };
    return {
      from: (table: string) => ({
        select: (fields?: string, opts?: any) => makeChain(table).select(fields, opts),
        order: (key: string, opts?: any) => makeChain(table).order(key, opts),
        eq: (col: string, val: any) => makeChain(table).eq(col, val),
        in: (col: string, vals: any[]) => makeChain(table).in(col, vals),
        range: (start: number, end: number) => makeChain(table).range(start, end),
        then: (resolve: any) => makeChain(table).then(resolve),
        update: (_updates: any) => ({
          eq: (_col: string, _val: any) => {
            if (m.updateError && table === 'agent_submissions') {
              throw new Error('update failed');
            }
            return {};
          },
        }),
      }),
    };
  };
  return { createClient: jest.fn(() => build()) };
});

describe('admin index: errors and edge branches', () => {
  beforeEach(() => { (globalThis as any).__admErrMock = {}; });

  it('getActivityLog throws when list query errors', async () => {
    (globalThis as any).__admErrMock = { listError: new Error('list fail'), listTable: 'admin_activity_log' };
    await expect(getActivityLog({ adminId: 'u1' }, 1, 50)).rejects.toThrow();
  });

  it('getAgentSubmissions throws when list query errors', async () => {
    (globalThis as any).__admErrMock = { listError: new Error('list fail'), listTable: 'agent_submissions' };
    await expect(getAgentSubmissions({ status: 'pending' as any }, 1, 25)).rejects.toThrow();
  });

  it('markSubmissionRegistered throws when update fails', async () => {
    (globalThis as any).__admErrMock = { updateError: true };
    await expect(markSubmissionRegistered('s1', 'acc1')).rejects.toThrow();
  });

  it('rejectSubmission throws when update fails', async () => {
    (globalThis as any).__admErrMock = { updateError: true };
    await expect(rejectSubmission('s2', 'duplicate')).rejects.toThrow();
  });
});
