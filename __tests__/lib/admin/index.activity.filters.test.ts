import { getActivityLog } from '@/lib/admin/index';

jest.mock('@/lib/supabase/server', () => {
  const build = () => {
    const m: any = (globalThis as any).__admActMock || {};
    const base = (m['admin_activity_log'] || []).slice();
    const ctx: any = { filters: [], countOpts: null, orderKey: null, rangeVals: null };
    const chain: any = {
      select: (_fields?: string, opts?: any) => { ctx.countOpts = opts || null; return chain; },
      order: (key: string, _opts?: any) => { ctx.orderKey = key; return chain; },
      eq: (col: string, val: any) => { ctx.filters.push({ type: 'eq', col, val }); return chain; },
      range: (start: number, end: number) => { ctx.rangeVals = { start, end }; return chain; },
      then: async (resolve: any) => {
        let rows = base.slice();
        for (const f of ctx.filters) {
          if (f.type === 'eq') rows = rows.filter(r => r[f.col] === f.val);
        }
        if (ctx.orderKey) rows.sort((a, b) => String(b[ctx.orderKey]).localeCompare(String(a[ctx.orderKey])));
        if (ctx.rangeVals) rows = rows.slice(ctx.rangeVals.start, ctx.rangeVals.end + 1);
        const count = ctx.countOpts?.count === 'exact' ? rows.length : undefined;
        return resolve({ data: rows, error: null, count });
      },
    };
    return {
      from: (_table: string) => chain,
    };
  };
  return {
    createClient: jest.fn(() => build()),
    createAdminClient: jest.fn(() => build())
  };
});

describe('admin index: activity log filters combine', () => {
  beforeEach(() => {
    (globalThis as any).__admActMock = {
      admin_activity_log: [
        { id: '1', admin_user_id: 'a1', action: 'login', target_type: null, created_at: '2025-01-02' },
        { id: '2', admin_user_id: 'a1', action: 'update', target_type: 'crm_account', created_at: '2025-01-03' },
        { id: '3', admin_user_id: 'a2', action: 'update', target_type: 'web_customer', created_at: '2025-01-04' },
      ],
    };
  });

  it('filters by adminId, action, and targetType with count exact', async () => {
    const res = await getActivityLog({ adminId: 'a1', action: 'update', targetType: 'crm_account' }, 1, 25);
    expect(res.total).toBe(1);
    expect(res.activities[0].id).toBe('2');
  });
});
