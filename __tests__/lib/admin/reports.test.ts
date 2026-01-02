import { getPerformanceReport, getLeadSourceReport, getRetentionReport, getTeamLeaderboard } from '@/lib/admin/reports';

jest.mock('@/lib/supabase/server', () => {
  return {
    createAdminClient: jest.fn(() => ({
      from: (table: string) => {
        const m: any = (globalThis as any).__repMock || {};
        const buildChain = (resolver: (filters: any[]) => any[]) => {
          const state: any = { filters: [], orderBy: null };
          const compute = () => {
            let data = resolver(state.filters) || [];
            if (state.orderBy) {
              data = [...data].sort((a: any, b: any) => {
                const k = state.orderBy.key;
                const asc = state.orderBy.asc;
                const av = a[k];
                const bv = b[k];
                const cmp = typeof av === 'string' && typeof bv === 'string'
                  ? av.localeCompare(bv)
                  : (av > bv ? 1 : av < bv ? -1 : 0);
                return asc ? cmp : -cmp;
              });
            }
            return data;
          };
          const chain: any = {
            select: (_fields?: string) => chain,
            eq: (col: string, val: any) => {
              state.filters.push({ type: 'eq', col, val });
              return Object.assign({}, chain, { data: compute() });
            },
            gte: (col: string, val: any) => {
              state.filters.push({ type: 'gte', col, val });
              return Object.assign({}, chain, { data: compute() });
            },
            lte: (col: string, val: any) => {
              state.filters.push({ type: 'lte', col, val });
              return Object.assign({}, chain, { data: compute() });
            },
            lt: (col: string, val: any) => {
              state.filters.push({ type: 'lt', col, val });
              return Object.assign({}, chain, { data: compute() });
            },
            order: (key: string, opts: any) => {
              state.orderBy = { key, asc: !!(opts && opts.ascending) };
              return Object.assign({}, chain, { data: compute() });
            },
            limit: (_n: number) => Object.assign({}, chain, { data: compute() }),
            single: () => ({ data: compute()[0] || null }),
            then: (resolve: any) => resolve({ data: compute() }),
          };
          return chain;
        };
        if (table === 'pipeline_leads') {
          return buildChain((filters) => {
            const getEq = (c: string) => filters.find((f: any) => f.type === 'eq' && f.col === c)?.val;
            const hasGte = (c: string) => filters.some((f: any) => f.type === 'gte' && f.col === c);
            const hasLte = (c: string) => filters.some((f: any) => f.type === 'lte' && f.col === c);
            const hasLt = (c: string) => filters.some((f: any) => f.type === 'lt' && f.col === c);
            const agentId = getEq('agent_id');
            const stage = getEq('stage');
            if (stage === 'won' && hasGte('converted_at')) {
              if (hasLt('converted_at')) {
                return (m.wonPrev || []).filter((d: any) => !agentId || d.agent_id === agentId);
              }
              return (m.wonCurrent || []).filter((d: any) => !agentId || d.agent_id === agentId);
            }
            if (hasGte('created_at')) {
              return m.sourceLeads || [];
            }
            if (agentId) {
              return m.allLeads || [];
            }
            return m.allLeads || [];
          }) as any;
        }
        if (table === 'crm_accounts') {
          return buildChain((_filters) => m.crmAccounts || []) as any;
        }
        if (table === 'admin_users') {
          return buildChain((_filters) => m.agents || []) as any;
        }
        return {} as any;
      },
    })),
  };
});

describe('reports: performance', () => {
  beforeEach(() => {
    (globalThis as any).__repMock = {};
  });

  it('computes performance summary and breakdowns', async () => {
    const now = new Date();
    const mkDeal = (id: string, cents: number, convertedAt: Date, track?: string) => ({
      id,
      agent_id: 'agent-1',
      stage: 'won',
      estimated_value_cents: cents,
      converted_at: convertedAt.toISOString(),
      interested_track: track,
      stage_changed_at: convertedAt.toISOString(),
    });
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 5);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 10);
    (globalThis as any).__repMock = {
      wonCurrent: [
        mkDeal('w1', 10000, monthStart, 'blue'),
        mkDeal('w2', 50000, new Date(monthStart.getTime() + 86400000), 'gold'),
      ],
      wonPrev: [
        mkDeal('p1', 20000, prevMonthStart, 'blue'),
      ],
      allLeads: [
        { agent_id: 'agent-1', stage: 'lost', stage_changed_at: new Date().toISOString(), estimated_value_cents: 1000 },
        mkDeal('w1', 10000, monthStart, 'blue'),
        mkDeal('w2', 50000, new Date(monthStart.getTime() + 86400000), 'gold'),
      ],
    };
    const res = await getPerformanceReport('agent-1', 'this_month');
    expect(res.summary.deals_won).toBe(2);
    expect(typeof res.summary.deals_won_change).toBe('number');
    expect(res.summary.revenue_monthly).toBe(600);
    expect(res.summary.avg_deal_size).toBe(300);
    expect(res.summary.win_rate).toBeGreaterThanOrEqual(50);
    expect(res.sales_by_track.length).toBe(2);
    expect(res.pipeline_health.length).toBe(6);
    expect(res.trend_data.length).toBe(6);
  });

  it('returns empty sales_by_track when no won deals', async () => {
    (globalThis as any).__repMock = {
      wonCurrent: [],
      wonPrev: [],
      allLeads: [
        { agent_id: 'agent-1', stage: 'lost', stage_changed_at: new Date().toISOString(), estimated_value_cents: 1000 },
      ],
    };
    const res = await getPerformanceReport('agent-1', 'this_month');
    expect(res.sales_by_track.length).toBe(0);
    expect(res.summary.deals_won).toBe(0);
  });
  it('covers last_month branch with no prev deals', async () => {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 5);
    (globalThis as any).__repMock = {
      wonCurrent: [
        { id: 'w3', agent_id: 'agent-1', stage: 'won', estimated_value_cents: 30000, converted_at: lastMonthStart.toISOString(), stage_changed_at: lastMonthStart.toISOString(), interested_track: 'blue' },
      ],
      wonPrev: [],
      allLeads: [
        { agent_id: 'agent-1', stage: 'lost', stage_changed_at: new Date().toISOString(), estimated_value_cents: 0 },
      ],
    };
    const res = await getPerformanceReport('agent-1', 'last_month');
    expect(res.summary.deals_won_change).toBe(0);
    expect(res.summary.revenue_change).toBe(0);
    expect(res.summary.avg_deal_change).toBe(0);
  });

  it('covers this_quarter and this_year branches', async () => {
    const now = new Date();
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 2);
    const prevQuarterStart = new Date(now.getFullYear(), (Math.floor(now.getMonth() / 3) - 1) * 3, 3);
    (globalThis as any).__repMock = {
      wonCurrent: [
        { id: 'q1', agent_id: 'agent-1', stage: 'won', estimated_value_cents: 10000, converted_at: quarterStart.toISOString(), stage_changed_at: quarterStart.toISOString(), interested_track: 'gold' },
      ],
      wonPrev: [
        { id: 'q0', agent_id: 'agent-1', stage: 'won', estimated_value_cents: 20000, converted_at: prevQuarterStart.toISOString(), stage_changed_at: prevQuarterStart.toISOString(), interested_track: 'blue' },
      ],
      allLeads: [
        { agent_id: 'agent-1', stage: 'qualified', stage_changed_at: new Date().toISOString(), estimated_value_cents: 1000 },
      ],
    };
    const rQuarter = await getPerformanceReport('agent-1', 'this_quarter');
    expect(typeof rQuarter.summary.deals_won_change).toBe('number');
    const yearStart = new Date(now.getFullYear(), 0, 1);
    (globalThis as any).__repMock = {
      wonCurrent: [
        { id: 'y1', agent_id: 'agent-1', stage: 'won', estimated_value_cents: 5000, converted_at: yearStart.toISOString(), stage_changed_at: yearStart.toISOString(), interested_track: 'other' },
      ],
      wonPrev: [],
      allLeads: [],
    };
    const rYear = await getPerformanceReport('agent-1', 'this_year');
    expect(rYear.period.label).toEqual(expect.any(String));
  });

  it('covers default branch when period is invalid', async () => {
    (globalThis as any).__repMock = {
      wonCurrent: [],
      wonPrev: [],
      allLeads: [],
    };
    const res = await getPerformanceReport('agent-1', 'bogus' as any);
    expect(res.period.label).toBe('This Month');
  });
});

describe('reports: lead source', () => {
  beforeEach(() => {
    (globalThis as any).__repMock = {};
  });

  it('summarizes leads and win rates by source with insights', async () => {
    (globalThis as any).__repMock = {
      sourceLeads: [
        { source: 'referral', stage: 'won', estimated_value_cents: 10000 },
        { source: 'google_ads', stage: 'contacted', estimated_value_cents: 0 },
        { source: 'referral', stage: 'won', estimated_value_cents: 20000 },
        { source: 'referral', stage: 'lost', estimated_value_cents: 0 },
      ],
    };
    const res = await getLeadSourceReport('agent-1', 'This Month');
    const referrals = res.sources.find(s => s.source === 'referral');
    expect(referrals?.leads).toBe(3);
    expect(referrals?.won).toBe(2);
    expect(referrals?.win_rate).toBe(67);
    expect(referrals?.revenue).toBe(300);
    expect(res.insights.some(i => i.includes('referral') && i.includes('win rate'))).toBe(true);
  });

  it('skips insight when best source win_rate is not > 50', async () => {
    (globalThis as any).__repMock = {
      sourceLeads: [
        { source: 'google_ads', stage: 'won', estimated_value_cents: 10000 },
        { source: 'google_ads', stage: 'lost', estimated_value_cents: 0 },
      ],
    };
    const res = await getLeadSourceReport('agent-1', 'This Month');
    const best = res.sources.sort((a, b) => b.win_rate - a.win_rate)[0];
    expect(best.win_rate).toBeLessThanOrEqual(50);
    expect(res.insights.length).toBe(0);
  });
});

describe('reports: retention', () => {
  beforeEach(() => {
    (globalThis as any).__repMock = {};
  });

  it('computes retention overview and churn details', async () => {
    const now = new Date();
    const thisMonthCancel = new Date(now.getFullYear(), now.getMonth(), 5).toISOString();
    const createAtOld = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();
    (globalThis as any).__repMock = {
      crmAccounts: [
        { status: 'active', created_at: createAtOld, business_name: 'A', plan_type: 'nevermiss', monthly_amount: 100 },
        { status: 'active', created_at: createAtOld, business_name: 'B', plan_type: 'blue_pro', monthly_amount: 200 },
        { status: 'cancelled', created_at: createAtOld, cancelled_at: thisMonthCancel, business_name: 'C', plan_type: 'gold_pro', monthly_amount: 300 },
      ],
    };
    const res = await getRetentionReport('agent-1');
    expect(res.overview.active_clients).toBe(2);
    expect(res.overview.churned_this_month).toBe(1);
    expect(typeof res.overview.retention_rate).toBe('number');
    expect(typeof res.overview.avg_tenure_months).toBe('number');
    expect(res.churn_details.length).toBe(1);
    expect(res.churn_details[0].lost_revenue).toBe(300);
  });
});

describe('reports: team leaderboard', () => {
  beforeEach(() => {
    (globalThis as any).__repMock = {};
  });

  it('ranks agents by deals and computes totals', async () => {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    (globalThis as any).__repMock = {
      agents: [
        { id: 'a1', full_name: 'Agent One' },
        { id: 'a2', full_name: 'Agent Two' },
      ],
      wonCurrent: [
        { agent_id: 'a1', stage: 'won', estimated_value_cents: 10000, converted_at: periodStart.toISOString() },
        { agent_id: 'a1', stage: 'won', estimated_value_cents: 20000, converted_at: periodStart.toISOString() },
        { agent_id: 'a2', stage: 'won', estimated_value_cents: 5000, converted_at: periodStart.toISOString() },
      ],
    };
    const res = await getTeamLeaderboard('This Month');
    expect(res.rankings[0].agent_name).toBe('Agent One');
    expect(res.rankings[0].deals).toBe(2);
    expect(res.team_totals.total_deals).toBe(3);
    expect(res.team_totals.total_revenue).toBe(350);
    expect(res.team_totals.total_commission).toBe(175);
  });
});
