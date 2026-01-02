import { getOrphanedStatusEvents, getWebhookEvents } from '@/lib/admin/nevermiss-support';

jest.mock('@supabase/supabase-js', () => {
  return {
    createClient: jest.fn(() => {
      const m: any = (globalThis as any).__nmsOrphanMock || {};
      return {
        from: (table: string) => {
          const base = (m[table] || []).slice();
          const ctx: any = { eqs: {}, ltCut: null, orderKey: null, limitN: null };
          const chain: any = {
            select: (_fields?: string) => chain,
            eq: (col: string, val: any) => { ctx.eqs[col] = val; return chain; },
            lt: (col: string, val: any) => { ctx.ltCut = { col, val }; return chain; },
            order: (key: string, _opts?: any) => { ctx.orderKey = key; return chain; },
            limit: (n: number) => { ctx.limitN = n; return chain; },
            then: async (resolve: any) => {
              let rows = base.slice();
              for (const [k, v] of Object.entries(ctx.eqs)) {
                rows = rows.filter(r => r[k] === v);
              }
              if (ctx.ltCut) {
                rows = rows.filter(r => new Date(r[ctx.ltCut.col]) < new Date(ctx.ltCut.val));
              }
              if (ctx.orderKey) {
                rows.sort((a, b) => String(b[ctx.orderKey]).localeCompare(String(a[ctx.orderKey])));
              }
              if (ctx.limitN != null) rows = rows.slice(0, ctx.limitN);
              return resolve({ data: m.nullTables?.[table] ? null : rows, error: null });
            },
          };
          return chain;
        },
      };
    }),
  };
});

describe('nevermiss-support: orphaned status events and webhook list', () => {
  beforeEach(() => { (globalThis as any).__nmsOrphanMock = {}; });

  it('getOrphanedStatusEvents returns only unprocessed sms_status older than 5 minutes', async () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const older = new Date(fiveMinAgo.getTime() - 60 * 1000).toISOString();
    const newer = new Date(fiveMinAgo.getTime() + 60 * 1000).toISOString();
    (globalThis as any).__nmsOrphanMock = {
      nevermiss_events: [
        { id: '1', event_type: 'sms_status', processed: false, created_at: older },
        { id: '2', event_type: 'sms_status', processed: false, created_at: newer },
        { id: '3', event_type: 'sms_status', processed: true, created_at: older },
        { id: '4', event_type: 'other', processed: false, created_at: older },
      ],
    };
    const rows = await getOrphanedStatusEvents();
    const ids = rows.map(r => r.id);
    expect(ids).toContain('1');
    expect(ids).not.toContain('2');
    expect(ids).not.toContain('3');
    expect(ids).not.toContain('4');
  });

  it('getWebhookEvents returns empty array when data null', async () => {
    (globalThis as any).__nmsOrphanMock = {
      nevermiss_events: [],
      nullTables: { nevermiss_events: true },
    };
    const rows = await getWebhookEvents('org-1', 10);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(0);
  });
});
