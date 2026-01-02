import { getActivityLog } from '@/lib/admin/index';

jest.mock('@/lib/supabase/server', () => {
  const mget = () => (globalThis as any).__admActPagMock || {};
  return {
    createClient: jest.fn(() => ({
      from: (table: string) => {
        const m: any = mget();
        const ctx: any = { filters: [], countOpts: null, orderKey: null, rangeVals: null };
        const chain: any = {
          select: (_fields?: string, opts?: any) => { ctx.countOpts = opts || null; return chain; },
          order: (key: string, _opts?: any) => { ctx.orderKey = key; return chain; },
          eq: (col: string, val: any) => { ctx.filters.push({ type: 'eq', col, val }); return chain; },
          range: (start: number, end: number) => { ctx.rangeVals = { start, end }; return chain; },
          then: async (resolve: any) => {
            let rows = (m[table] || []).slice();
            for (const f of ctx.filters) {
              if (f.type === 'eq') rows = rows.filter(r => r[f.col] === f.val);
            }
            if (ctx.orderKey) rows.sort((a, b) => String(b[ctx.orderKey]).localeCompare(String(a[ctx.orderKey])));
            const total = rows.length;
            if (ctx.rangeVals) rows = rows.slice(ctx.rangeVals.start, ctx.rangeVals.end + 1);
            const count = ctx.countOpts?.count === 'exact' ? total : undefined;
            return resolve({ data: rows, error: null, count });
          },
        };
        return chain;
      },
    })),
  };
});

describe('admin index: activity pagination', () => {
  beforeEach(() => {
    (globalThis as any).__admActPagMock = {
      admin_activity_log: [
        { id: '1', admin_user_id: 'a1', action: 'login', target_type: null, created_at: '2025-01-01' },
        { id: '2', admin_user_id: 'a1', action: 'login', target_type: null, created_at: '2025-01-02' },
        { id: '3', admin_user_id: 'a1', action: 'login', target_type: null, created_at: '2025-01-03' },
      ],
    };
  });

  it('returns page 1 with limit 2', async () => {
    const res = await getActivityLog({ adminId: 'a1', action: 'login' }, 1, 2);
    expect(res.total).toBe(3);
    expect(res.activities.length).toBe(2);
    expect(res.activities[0].id).toBe('3');
    expect(res.activities[1].id).toBe('2');
  });

  it('returns page 2 with limit 2', async () => {
    const res = await getActivityLog({ adminId: 'a1', action: 'login' }, 2, 2);
    expect(res.total).toBe(3);
    expect(res.activities.length).toBe(1);
    expect(res.activities[0].id).toBe('1');
  });
});
