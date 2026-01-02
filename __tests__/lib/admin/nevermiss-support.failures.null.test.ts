import { getSmsDeliveryFailures } from '@/lib/admin/nevermiss-support';

jest.mock('@supabase/supabase-js', () => {
  return {
    createClient: jest.fn(() => {
      const m: any = (globalThis as any).__nmsNullMock || {};
      return {
        from: (table: string) => {
          const base = (m[table] || []).slice();
          const ctx: any = { filters: [], cutoff: null };
          const chain: any = {
            select: (_fields?: string) => chain,
            gte: (col: string, val: any) => { ctx.cutoff = { col, val }; return chain; },
            order: (_key: string, _opts?: any) => chain,
            limit: (_n: number) => chain,
            eq: (col: string, val: any) => { ctx.filters.push({ type: 'eq', col, val }); return chain; },
            then: async (resolve: any) => {
              if (m.nullDataTables && m.nullDataTables[table]) {
                return resolve({ data: null, error: null });
              }
              let rows = base.slice();
              for (const f of ctx.filters) {
                if (f.type === 'eq') rows = rows.filter((r: any) => r[f.col] === f.val);
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

describe('nevermiss-support: sms failures null data', () => {
  beforeEach(() => { (globalThis as any).__nmsNullMock = {}; });

  it('getSmsDeliveryFailures returns empty array when query returns null data', async () => {
    (globalThis as any).__nmsNullMock = {
      sms_delivery_failures: [],
      nullDataTables: { sms_delivery_failures: true },
    };
    const rows = await getSmsDeliveryFailures('org-1', 24);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(0);
  });
});
