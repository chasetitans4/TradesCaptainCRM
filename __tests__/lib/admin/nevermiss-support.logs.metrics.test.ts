import { getAIApiLogs, getDailyMetrics, checkForDuplicateEvents } from '@/lib/admin/nevermiss-support';

jest.mock('@supabase/supabase-js', () => {
  return {
    createClient: jest.fn(() => {
      const m: any = (globalThis as any).__nmsLmMock || {};
      return {
        rpc: (fn: string, args: any) => {
          if (m.rpcError) return { data: null, error: new Error('rpc missing') };
          return { data: m.rpcData || [], error: null };
        },
        from: (table: string) => {
          const base = (m[table] || []).slice();
          const ctx: any = { filters: [], orderKey: null, limitN: null };
          const chain: any = {
            select: (_fields?: string) => chain,
            eq: (col: string, val: any) => { ctx.filters.push({ type: 'eq', col, val }); return chain; },
            order: (key: string, _opts?: any) => { ctx.orderKey = key; return chain; },
            limit: (n: number) => { ctx.limitN = n; return chain; },
            then: async (resolve: any) => {
              let rows = base.slice();
              for (const f of ctx.filters) {
                if (f.type === 'eq') rows = rows.filter(r => r[f.col] === f.val);
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

describe('nevermiss-support: logs and metrics null fallbacks', () => {
  beforeEach(() => { (globalThis as any).__nmsLmMock = {}; });

  it('getAIApiLogs returns [] when data is null', async () => {
    (globalThis as any).__nmsLmMock = {
      ai_api_logs: [],
      nullTables: { ai_api_logs: true },
    };
    const logs = await getAIApiLogs('conv-1');
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBe(0);
  });

  it('getDailyMetrics returns [] when data is null', async () => {
    (globalThis as any).__nmsLmMock = {
      nevermiss_daily_metrics: [],
      nullTables: { nevermiss_daily_metrics: true },
    };
    const rows = await getDailyMetrics('org-1', 7);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(0);
  });

  it('checkForDuplicateEvents falls back and returns only entries with count>1', async () => {
    (globalThis as any).__nmsLmMock = {
      rpcError: true,
      nevermiss_events: [
        { twilio_sid: 'a', conversation_id: 'c1' },
        { twilio_sid: 'b', conversation_id: 'c1' },
        { twilio_sid: 'a', conversation_id: 'c1' },
        { twilio_sid: 'c', conversation_id: 'c1' },
      ],
    };
    const dupes = await checkForDuplicateEvents('c1');
    const ids = dupes.map(d => d.twilio_sid);
    expect(ids).toContain('a');
    expect(ids).not.toContain('b');
    expect(ids).not.toContain('c');
    const a = dupes.find(d => d.twilio_sid === 'a')!;
    expect(a.count).toBe(2);
  });
});
