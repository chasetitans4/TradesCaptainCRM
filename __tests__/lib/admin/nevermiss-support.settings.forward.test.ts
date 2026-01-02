import { updateForwardToNumber, getNeverMissSettings } from '@/lib/admin/nevermiss-support';

jest.mock('@supabase/supabase-js', () => {
  return {
    createClient: jest.fn(() => {
      const m: any = (globalThis as any).__nmsSetMock || {};
      return {
        from: (table: string) => {
          const base = (m[table] || []).slice();
          const ctx: any = { updates: null, eqs: {} };
          const chain: any = {
            update: (updates: any) => { ctx.updates = updates; return chain; },
            select: (_fields?: string) => chain,
            eq: (col: string, val: any) => { ctx.eqs[col] = val; return chain; },
            single: () => {
              if (m.singleError && m.singleTable === table) return { data: null, error: m.singleError };
              let rows = base.slice();
              for (const [k, v] of Object.entries(ctx.eqs)) {
                rows = rows.filter(r => r[k] === v);
              }
              return { data: rows[0] || null, error: null };
            },
            then: async (resolve: any) => {
              if (m.updateError && table === 'nevermiss_settings') return resolve({ error: new Error('upd') });
              return resolve({ error: null });
            },
          };
          return chain;
        },
      };
    }),
  };
});

describe('nevermiss-support: forward number and settings', () => {
  beforeEach(() => { (globalThis as any).__nmsSetMock = {}; });

  it('updateForwardToNumber throws for invalid E.164 format', async () => {
    await expect(updateForwardToNumber('org-1', '1234567890')).rejects.toThrow(/E.164/);
  });

  it('updateForwardToNumber updates and returns true', async () => {
    (globalThis as any).__nmsSetMock = { nevermiss_settings: [{ organization_id: 'org-1' }] };
    const ok = await updateForwardToNumber('org-1', '+15551234567');
    expect(ok).toBe(true);
  });

  it('getNeverMissSettings returns null for PGRST116', async () => {
    (globalThis as any).__nmsSetMock = { singleError: { code: 'PGRST116' }, singleTable: 'nevermiss_settings' };
    const res = await getNeverMissSettings('org-2');
    expect(res).toBeNull();
  });

  it('getNeverMissSettings throws for other errors', async () => {
    (globalThis as any).__nmsSetMock = { singleError: { code: 'OTHER' }, singleTable: 'nevermiss_settings' };
    await expect(getNeverMissSettings('org-3')).rejects.toBeTruthy();
  });
});
