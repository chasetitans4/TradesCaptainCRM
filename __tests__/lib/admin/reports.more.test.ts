import { getLeadSourceReport, getRetentionReport, getTeamLeaderboard } from '@/lib/admin/reports';

jest.mock('@/lib/supabase/server', () => {
  const build = () => {
    const m: any = (globalThis as any).__reportsMock || {};
    const getTable = (t: string) => (m[t] || []).slice();
    return {
      createAdminClient: jest.fn(() => ({
        from: (table: string) => {
          const base = getTable(table);
          const ctx: any = { filters: [] };
          const chain: any = {
            select: (_fields?: string, _opts?: any) => chain,
            eq: (col: string, val: any) => { ctx.filters.push({ type: 'eq', col, val }); return chain; },
            gte: (col: string, val: any) => { ctx.filters.push({ type: 'gte', col, val }); return chain; },
            then: async (resolve: any) => {
              let rows = base.slice();
              for (const f of ctx.filters) {
                if (f.type === 'eq') rows = rows.filter(r => r[f.col] === f.val);
                if (f.type === 'gte') rows = rows.filter(r => new Date(r[f.col]) >= new Date(f.val));
              }
              return resolve({ data: rows, error: null });
            },
          };
          return chain;
        },
      })),
    };
  };
  return build();
});

describe('admin reports: lead source insights', () => {
  beforeEach(() => { (globalThis as any).__reportsMock = {}; });
  it('returns no insights when no sources', async () => {
    (globalThis as any).__reportsMock = { pipeline_leads: [] };
    const rep = await getLeadSourceReport('a1', 'This Month');
    expect(rep.insights.length).toBe(0);
  });
});

describe('admin reports: retention', () => {
  beforeEach(() => { (globalThis as any).__reportsMock = {}; });
  it('returns retention 100 and zero tenure when no clients', async () => {
    (globalThis as any).__reportsMock = { crm_accounts: [] };
    const rep = await getRetentionReport('a1');
    expect(rep.overview.retention_rate).toBe(100);
    expect(rep.overview.avg_tenure_months).toBe(0);
  });
});

describe('admin reports: team leaderboard', () => {
  beforeEach(() => { (globalThis as any).__reportsMock = {}; });
  it('returns empty rankings and zero totals with no agents', async () => {
    (globalThis as any).__reportsMock = { admin_users: [], pipeline_leads: [] };
    const res = await getTeamLeaderboard('This Month');
    expect(res.rankings.length).toBe(0);
    expect(res.team_totals.total_deals).toBe(0);
    expect(res.team_totals.total_revenue).toBe(0);
  });
});
