import { getOnboardingTemplate, getOnboardingsInProgress } from '@/lib/admin/onboarding';

jest.mock('@/lib/supabase/server', () => {
  return {
    createAdminClient: jest.fn(() => ({
      from: (table: string) => {
        const m: any = (globalThis as any).__ob2Mock || {};
        const base = (m[table] || []).slice();
        const ctx: any = { filters: [] };
        const chain: any = {
          select: (_fields?: string) => chain,
          eq: (col: string, val: any) => { ctx.filters.push({ type: 'eq', col, val }); return chain; },
          in: (col: string, vals: any[]) => { ctx.filters.push({ type: 'in', col, vals }); return chain; },
          order: () => chain,
          then: async (resolve: any) => {
            if (m.errorTable === table && m.errorType === 'list') return resolve({ data: null, error: new Error('list error'), count: 0 });
            let rows = base.slice();
            for (const f of ctx.filters) {
              if (f.type === 'eq') rows = rows.filter(r => r[f.col] === f.val);
              if (f.type === 'in') rows = rows.filter(r => f.vals.includes(r[f.col]));
            }
            return resolve({ data: rows, error: null, count: rows.length });
          },
        };
        return chain;
      },
    })),
  };
});

describe('admin onboarding: error branches', () => {
  beforeEach(() => { (globalThis as any).__ob2Mock = {}; });

  it('getOnboardingTemplate throws when list query errors', async () => {
    (globalThis as any).__ob2Mock = { onboarding_templates: [], errorTable: 'onboarding_templates', errorType: 'list' };
    await expect(getOnboardingTemplate('gold')).rejects.toThrow(/Failed to get template/);
  });

  it('getOnboardingsInProgress throws when list query errors', async () => {
    (globalThis as any).__ob2Mock = { client_onboarding: [], errorTable: 'client_onboarding', errorType: 'list' };
    await expect(getOnboardingsInProgress('agent-1')).rejects.toThrow(/Failed to get onboardings/);
  });
});
