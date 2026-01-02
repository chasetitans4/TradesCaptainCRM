import { getConversationById } from '@/lib/admin/nevermiss-support';

jest.mock('@supabase/supabase-js', () => {
  return {
    createClient: jest.fn(() => {
      const m: any = (globalThis as any).__nmsMoreMock || {};
      return {
        from: (table: string) => {
          const base = (m[table] || []).slice();
          const ctx: any = { filters: [] };
          const chain: any = {
            select: (_fields?: string) => chain,
            eq: (col: string, val: any) => { ctx.filters.push({ type: 'eq', col, val }); return chain; },
            single: () => {
              let rows = base.slice();
              for (const f of ctx.filters) {
                if (f.type === 'eq') rows = rows.filter((r: any) => r[f.col] === f.val);
              }
              if (m.singleError && m.singleTable === table) return { data: null, error: m.singleError };
              return { data: rows[0] || null, error: null };
            },
          };
          return chain;
        },
      };
    }),
  };
});

describe('nevermiss-support: getConversationById success', () => {
  beforeEach(() => { (globalThis as any).__nmsMoreMock = {}; });

  it('returns conversation when present', async () => {
    (globalThis as any).__nmsMoreMock = {
      nevermiss_conversations: [
        { id: 'c1', organization_id: 'org-1', state: 'completed', created_at: '2025-01-01' },
      ],
    };
    const conv = await getConversationById('c1');
    expect(conv?.id).toBe('c1');
    expect(conv?.state).toBe('completed');
  });
});
