import {
  getCommissionDashboard,
  getPendingCommissions as getPendingCT,
  getRecurringCommissions,
  getBonusData,
  getPerformanceData,
  getCustomerCommissionDetail,
} from '@/lib/admin/commission-tracker';

jest.mock('@/lib/supabase/server', () => {
  return {
    createClient: jest.fn(async () => {
      const m: any = (globalThis as any).__ctMock || {};
      const buildChain = (table: string) => {
        const state: any = { filters: [], orderBy: null, limitN: null, likeFilter: null, inFilter: null };
        const resolveBase = () => {
          switch (table) {
            case 'agent_commissions': return m.agentCommissions || [];
            case 'agent_goals': return m.agentGoals || [];
            case 'customer_commission_status': return m.customerStatus || [];
            default: return [];
          }
        };
        const applyFilters = (rows: any[]) => {
          let data = Array.isArray(rows) ? [...rows] : [];
          for (const f of state.filters) {
            if (f.type === 'eq') data = data.filter((r: any) => r[f.col] === f.val);
            else if (f.type === 'gte') data = data.filter((r: any) => r[f.col] >= f.val);
            else if (f.type === 'lte') data = data.filter((r: any) => r[f.col] <= f.val);
            else if (f.type === 'lt') data = data.filter((r: any) => r[f.col] < f.val);
          }
          if (state.likeFilter) {
            const { col, pattern } = state.likeFilter;
            const p = pattern.replace(/%/g, '');
            data = data.filter((r: any) => String(r[col] || '').includes(p));
          }
          if (state.inFilter) {
            const { col, values } = state.inFilter;
            data = data.filter((r: any) => values.includes(r[col]));
          }
          if (state.orderBy) {
            data = data.sort((a: any, b: any) => {
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
          if (typeof state.limitN === 'number') data = data.slice(0, state.limitN);
          return data;
        };
        const chain: any = {
          select: (_fields?: string) => chain,
          eq: (col: string, val: any) => {
            state.filters.push({ type: 'eq', col, val });
            return Object.assign({}, chain, { data: applyFilters(resolveBase()) });
          },
          gte: (col: string, val: any) => {
            state.filters.push({ type: 'gte', col, val });
            return Object.assign({}, chain, { data: applyFilters(resolveBase()) });
          },
          lte: (col: string, val: any) => {
            state.filters.push({ type: 'lte', col, val });
            return Object.assign({}, chain, { data: applyFilters(resolveBase()) });
          },
          lt: (col: string, val: any) => {
            state.filters.push({ type: 'lt', col, val });
            return Object.assign({}, chain, { data: applyFilters(resolveBase()) });
          },
          like: (col: string, pattern: string) => {
            state.likeFilter = { col, pattern };
            return Object.assign({}, chain, { data: applyFilters(resolveBase()) });
          },
          in: (col: string, values: any[]) => {
            state.inFilter = { col, values };
            return Object.assign({}, chain, { data: applyFilters(resolveBase()) });
          },
          order: (key: string, opts: any) => {
            state.orderBy = { key, asc: !!(opts && opts.ascending) };
            return Object.assign({}, chain, { data: applyFilters(resolveBase()) });
          },
          limit: (n: number) => {
            state.limitN = n;
            return Object.assign({}, chain, { data: applyFilters(resolveBase()) });
          },
          single: () => ({ data: applyFilters(resolveBase())[0] || null }),
          then: (resolve: any) => resolve({ data: applyFilters(resolveBase()) }),
        };
        return chain;
      };
      return {
        from: (table: string) => buildChain(table),
      };
    }),
  };
});

describe('commission-tracker: dashboard', () => {
  beforeEach(() => {
    (globalThis as any).__ctMock = {};
  });
  it('computes summary, breakdown, and sales by track', async () => {
    const now = new Date();
    const thisMonthDate = new Date(now.getFullYear(), now.getMonth(), 10).toISOString().split('T')[0];
    (globalThis as any).__ctMock = {
      agentCommissions: [
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 5000, status: 'paid', plan_type: 'blue_pro', plan_price_cents: 9900, earned_date: thisMonthDate },
        { agent_id: 'a1', commission_type: 'recurring', rate_applied: 10, amount_cents: 990, status: 'pending', earned_date: thisMonthDate },
        { agent_id: 'a1', commission_type: 'recurring', rate_applied: 15, amount_cents: 1485, status: 'pending', earned_date: thisMonthDate },
        { agent_id: 'a1', commission_type: 'bonus_m3', amount_cents: 1500, status: 'paid', earned_date: thisMonthDate },
      ],
      agentGoals: [
        { agent_id: 'a1', period_type: 'monthly', period_start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], period_end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0], goal_amount_cents: 100000 },
      ],
      customerStatus: [
        { agent_id: 'a1', current_month: 6, plan_price_cents: 9900 },
      ],
    };
    const res = await getCommissionDashboard('a1', 'this_month');
    expect(res.summary.paid).toBe(6500);
    expect(res.summary.pending).toBe(2475);
    expect(res.breakdown.upfront).toBe(5000);
    expect(res.breakdown.recurring_10).toBe(990);
    expect(res.breakdown.recurring_15).toBe(1485);
    expect(res.salesByTrack[0].track).toContain('blue');
  });
});

describe('commission-tracker: pending and risk', () => {
  beforeEach(() => {
    (globalThis as any).__ctMock = {};
  });
  it('computes awaiting upfront and clawback risk amounts', async () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    (globalThis as any).__ctMock = {
      customerStatus: [
        { agent_id: 'a1', customer_id: 'c1', customer_name: 'AC', plan_name: 'Blue Pro', plan_type: 'blue_pro', plan_price_cents: 10000, start_date: start, current_month: 1, risk_score: 20 },
        { agent_id: 'a1', customer_id: 'c2', customer_name: 'BC', plan_name: 'Blue Pro', plan_type: 'blue_pro', plan_price_cents: 20000, start_date: start, current_month: 2, risk_score: 80, last_login: new Date(Date.now() - 20*86400000).toISOString() },
      ],
    };
    const res = await getPendingCT('a1');
    expect(res.awaitingPayment.length).toBe(2);
    expect(res.awaitingPayment[0].upfront).toBe(5000);
    expect(res.clawbackRisk.length).toBe(1);
    expect(res.totalAtRisk).toBe(10000);
  });

  it('sets riskReason for support tickets and paused recurring', async () => {
    (globalThis as any).__ctMock = {
      customerStatus: [
        { agent_id: 'a1', customer_id: 'c1', customer_name: 'AC', plan_name: 'Blue Pro', plan_type: 'blue_pro', plan_price_cents: 15000, current_month: 7, risk_score: 60, has_open_support_ticket: true },
        { agent_id: 'a1', customer_id: 'c2', customer_name: 'BC', plan_name: 'Blue Pro', plan_type: 'blue_pro', plan_price_cents: 20000, current_month: 10, risk_score: 75, recurring_paused: true, paused_reason: 'User requested pause' },
      ],
    };
    const res = await getPendingCT('a1');
    const ticketRisk = res.clawbackRisk.find((r) => r.customerId === 'c1');
    const pausedRisk = res.clawbackRisk.find((r) => r.customerId === 'c2');
    expect(ticketRisk?.riskReason).toBe('Open support ticket');
    expect(pausedRisk?.riskReason).toBe('User requested pause');
  });
});

describe('commission-tracker: recurring', () => {
  beforeEach(() => {
    (globalThis as any).__ctMock = {};
  });
  it('aggregates recurring totals and rate bump approaching', async () => {
    (globalThis as any).__ctMock = {
      agentCommissions: [
        { agent_id: 'a1', commission_type: 'recurring', amount_cents: 1000, status: 'paid', rate_applied: 10, earned_date: new Date().toISOString().split('T')[0], customer_id: 'c1', customer_commission_status: { customer_name: 'C1', plan_name: 'Blue', current_month: 4 } },
        { agent_id: 'a1', commission_type: 'recurring', amount_cents: 1500, status: 'paid', rate_applied: 15, earned_date: new Date().toISOString().split('T')[0], customer_id: 'c2', customer_commission_status: { customer_name: 'C2', plan_name: 'Web', current_month: 10 } },
      ],
      customerStatus: [
        { agent_id: 'a1', customer_id: 'c3', customer_name: 'C3', plan_name: 'Blue', plan_price_cents: 20000, start_date: new Date().toISOString().split('T')[0], current_month: 5, rate_locked_at_15: false },
      ],
    };
    const res = await getRecurringCommissions('a1');
    expect(res.thisMonth.rate10Total).toBe(1000);
    expect(res.thisMonth.rate15Total).toBe(1500);
    expect(res.approachingRateBump.length).toBe(1);
    expect(res.totalRecurringBoost).toBe(3000);
  });
});

describe('commission-tracker: bonuses', () => {
  beforeEach(() => {
    (globalThis as any).__ctMock = {};
  });
  it('produces upcoming bonuses and earnedThisMonth', async () => {
    (globalThis as any).__ctMock = {
      customerStatus: [
        { agent_id: 'a1', customer_id: 'c1', customer_name: 'C1', start_date: '2024-12-10', current_month: 2 },
        { agent_id: 'a1', customer_id: 'c2', customer_name: 'C2', start_date: '2024-12-10', current_month: 11 },
        { agent_id: 'a1', customer_id: 'c3', customer_name: 'C3', start_date: '2024-12-10', current_month: 5 },
      ],
      agentCommissions: [
        { agent_id: 'a1', commission_type: 'bonus_m3', amount_cents: 1500, status: 'paid', earned_date: new Date().toISOString().split('T')[0] },
      ],
    };
    const res = await getBonusData('a1');
    expect(res.upcoming.length).toBeGreaterThan(0);
    expect(res.earnedThisMonth.length).toBe(1);
    expect(res.totalPotential).toBeGreaterThan(0);
  });

  it('marks paused vs missed bonuses based on grace period', async () => {
    const now = new Date();
    (globalThis as any).__ctMock = {
      customerStatus: [
        { agent_id: 'a1', customer_id: 'p1', customer_name: 'PausedSoon', current_month: 6, recurring_paused: true, paused_since: new Date(now.getTime() - 7 * 86400000).toISOString() },
        { agent_id: 'a1', customer_id: 'm1', customer_name: 'Missed', current_month: 6, recurring_paused: true, paused_since: new Date(now.getTime() - 20 * 86400000).toISOString() },
      ],
      agentCommissions: [],
    };
    const res = await getBonusData('a1');
    const paused = res.missed.find((b) => b.customerId === 'p1');
    const missed = res.missed.find((b) => b.customerId === 'm1');
    expect(paused?.status).toBe('paused');
    expect((paused?.gracePeriodDays || 0)).toBeGreaterThan(0);
    expect(missed?.status).toBe('missed');
    expect(missed?.gracePeriodDays).toBe(0);
  });
});

describe('commission-tracker: performance', () => {
  beforeEach(() => {
    (globalThis as any).__ctMock = {};
  });
  it('computes goal progress, quarterly totals, quota, and trend', async () => {
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    (globalThis as any).__ctMock = {
      agentGoals: [{ agent_id: 'a1', period_type: 'monthly', period_start: mStart, period_end: mEnd, goal_amount_cents: 50000 }],
      agentCommissions: [
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 5000, status: 'paid', earned_date: mStart },
      ],
      customerStatus: [
        { agent_id: 'a1', recurring_paused: false, current_month: 8 },
        { agent_id: 'a1', recurring_paused: true, current_month: 3 },
      ],
    };
    const res = await getPerformanceData('a1');
    expect(res.goal.amount).toBe(50000);
    expect(typeof res.goal.progress).toBe('number');
    expect(res.quarterly.months.length).toBeLessThanOrEqual(3);
    expect(['exceeds','meets','below']).toContain(res.quota.status);
    expect(res.yearTrend.length).toBeLessThanOrEqual(12);
  });
  it('handles zero sales and no customers for quota and retention', async () => {
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    (globalThis as any).__ctMock = {
      agentGoals: [{ agent_id: 'a1', period_type: 'monthly', period_start: mStart, period_end: mEnd, goal_amount_cents: 75000 }],
      agentCommissions: [],
      customerStatus: [],
    };
    const res = await getPerformanceData('a1');
    expect(res.quota.actual).toBe(0);
    expect(res.quota.status).toBe('below');
    expect(res.quota.totalCustomers).toBe(0);
    expect(res.quota.customersLost).toBe(0);
    expect(res.quota.retentionRate).toBe(100);
  });
  it('produces yearTrend with zero commissions when no paid history', async () => {
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    (globalThis as any).__ctMock = {
      agentGoals: [{ agent_id: 'a1', period_type: 'monthly', period_start: mStart, period_end: mEnd, goal_amount_cents: 50000 }],
      agentCommissions: [],
    };
    const res = await getPerformanceData('a1');
    expect(res.yearTrend.length).toBeLessThanOrEqual(12);
    expect(res.yearTrend.every((e) => e.commission === 0)).toBe(true);
  });
  it('returns on_track when progress ahead of pace', async () => {
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    (globalThis as any).__ctMock = {
      agentGoals: [{ agent_id: 'a1', period_type: 'monthly', period_start: mStart, period_end: mEnd, goal_amount_cents: 1000 }],
      agentCommissions: [
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 1000, status: 'paid', earned_date: mStart },
      ],
    };
    const res = await getPerformanceData('a1');
    expect(res.goal.status).toBe('on_track');
  });
  it('sets quota status meets and exceeds at thresholds', async () => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const monthIdx = [quarter * 3, quarter * 3 + 1, quarter * 3 + 2];
    const mkDate = (mi: number) => new Date(now.getFullYear(), mi, 1).toISOString().split('T')[0];
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    (globalThis as any).__ctMock = {
      agentGoals: [{ agent_id: 'a1', period_type: 'monthly', period_start: mStart, period_end: mEnd, goal_amount_cents: 50000 }],
      agentCommissions: [
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 1000, status: 'paid', earned_date: mkDate(monthIdx[0]) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 1100, status: 'paid', earned_date: mkDate(monthIdx[0]) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 1200, status: 'paid', earned_date: mkDate(monthIdx[1]) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 1300, status: 'paid', earned_date: mkDate(monthIdx[1]) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 1400, status: 'paid', earned_date: mkDate(monthIdx[2]) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 1500, status: 'paid', earned_date: mkDate(monthIdx[2]) },
      ],
    };
    const meets = await getPerformanceData('a1');
    expect(meets.quota.actual).toBe(6);
    expect(meets.quota.status).toBe('meets');
    (globalThis as any).__ctMock = {
      agentGoals: [{ agent_id: 'a1', period_type: 'monthly', period_start: mStart, period_end: mEnd, goal_amount_cents: 50000 }],
      agentCommissions: [
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 1000, status: 'paid', earned_date: mkDate(monthIdx[0]) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 1100, status: 'paid', earned_date: mkDate(monthIdx[0]) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 1200, status: 'paid', earned_date: mkDate(monthIdx[0]) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 1300, status: 'paid', earned_date: mkDate(monthIdx[0]) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 1400, status: 'paid', earned_date: mkDate(monthIdx[1]) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 1500, status: 'paid', earned_date: mkDate(monthIdx[1]) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 1600, status: 'paid', earned_date: mkDate(monthIdx[1]) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 1700, status: 'paid', earned_date: mkDate(monthIdx[1]) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 1800, status: 'paid', earned_date: mkDate(monthIdx[2]) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 1900, status: 'paid', earned_date: mkDate(monthIdx[2]) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 2000, status: 'paid', earned_date: mkDate(monthIdx[2]) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 2100, status: 'paid', earned_date: mkDate(monthIdx[2]) },
      ],
    };
    const exceeds = await getPerformanceData('a1');
    expect(exceeds.quota.actual).toBe(12);
    expect(exceeds.quota.status).toBe('exceeds');
  });
  it('sets status at_risk when slightly below pace (fake timers)', async () => {
    jest.useFakeTimers();
    const fixed = new Date('2025-07-15T12:00:00Z');
    jest.setSystemTime(fixed);
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const pace = (daysPassed / daysInMonth) * 100;
    const goal = 10000;
    const progressWanted = Math.floor(pace - 5);
    const amount = Math.round((progressWanted / 100) * goal);
    (globalThis as any).__ctMock = {
      agentGoals: [{ agent_id: 'a1', period_type: 'monthly', period_start: mStart, period_end: mEnd, goal_amount_cents: goal }],
      agentCommissions: [
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: amount, status: 'paid', earned_date: mStart },
      ],
    };
    const res = await getPerformanceData('a1');
    expect(res.goal.status).toBe('at_risk');
    jest.useRealTimers();
  });
  it('sets status behind when >10% below pace (fake timers)', async () => {
    jest.useFakeTimers();
    const fixed = new Date('2025-07-15T12:00:00Z');
    jest.setSystemTime(fixed);
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const pace = (daysPassed / daysInMonth) * 100;
    const goal = 10000;
    const progressWanted = Math.floor(pace - 12);
    const amount = Math.round((progressWanted / 100) * goal);
    (globalThis as any).__ctMock = {
      agentGoals: [{ agent_id: 'a1', period_type: 'monthly', period_start: mStart, period_end: mEnd, goal_amount_cents: goal }],
      agentCommissions: [
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: amount, status: 'paid', earned_date: mStart },
      ],
    };
    const res = await getPerformanceData('a1');
    expect(['behind', 'at_risk']).toContain(res.goal.status);
    jest.useRealTimers();
  });
  it('yearTrend excludes current month and ignores pending commissions (fake timers)', async () => {
    jest.useFakeTimers();
    const fixed = new Date('2025-05-16T12:00:00Z');
    jest.setSystemTime(fixed);
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const mk = (y: number, m: number, d: number) => new Date(y, m, d).toISOString().split('T')[0];
    (globalThis as any).__ctMock = {
      agentGoals: [{ agent_id: 'a1', period_type: 'monthly', period_start: mStart, period_end: mEnd, goal_amount_cents: 50000 }],
      agentCommissions: [
        { agent_id: 'a1', amount_cents: 100, status: 'paid', earned_date: mk(2025, 0, 15) },
        { agent_id: 'a1', amount_cents: 200, status: 'paid', earned_date: mk(2025, 1, 15) },
        { agent_id: 'a1', amount_cents: 300, status: 'paid', earned_date: mk(2025, 2, 15) },
        { agent_id: 'a1', amount_cents: 400, status: 'paid', earned_date: mk(2025, 3, 15) },
        { agent_id: 'a1', amount_cents: 500, status: 'pending', earned_date: mk(2025, 3, 20) },
      ],
    };
    const res = await getPerformanceData('a1');
    expect(res.yearTrend.length).toBe(4);
    const months = res.yearTrend.map((e) => e.month);
    expect(months.includes('May')).toBe(false);
    const last = res.yearTrend[res.yearTrend.length - 1];
    expect(last.month).toBe('Apr');
    expect(last.commission).toBe(400);
    jest.useRealTimers();
  });
  it('aggregates quarterly revenue and commission totals with mixed types (fake timers)', async () => {
    jest.useFakeTimers();
    const fixed = new Date('2025-04-16T12:00:00Z');
    jest.setSystemTime(fixed);
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const mk = (y: number, m: number, d: number) => new Date(y, m, d).toISOString().split('T')[0];
    (globalThis as any).__ctMock = {
      agentGoals: [{ agent_id: 'a1', period_type: 'monthly', period_start: mStart, period_end: mEnd, goal_amount_cents: 50000 }],
      agentCommissions: [
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 5000, plan_price_cents: 10000, status: 'paid', earned_date: mk(2025, 3, 15) },
        { agent_id: 'a1', commission_type: 'recurring', amount_cents: 1000, status: 'paid', earned_date: mk(2025, 3, 20) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 10000, plan_price_cents: 20000, status: 'paid', earned_date: mk(2025, 4, 10) },
        { agent_id: 'a1', commission_type: 'bonus_m3', amount_cents: 1500, status: 'paid', earned_date: mk(2025, 4, 12) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 15000, plan_price_cents: 30000, status: 'paid', earned_date: mk(2025, 5, 5) },
        { agent_id: 'a1', commission_type: 'recurring', amount_cents: 1500, status: 'paid', earned_date: mk(2025, 5, 15) },
        { agent_id: 'a1', commission_type: 'recurring', amount_cents: 1500, status: 'paid', earned_date: mk(2025, 5, 20) },
      ],
    };
    const res = await getPerformanceData('a1');
    expect(res.quarterly.months.length).toBe(3);
    const apr = res.quarterly.months[0];
    const may = res.quarterly.months[1];
    const jun = res.quarterly.months[2];
    expect(apr.month).toBe('April');
    expect(apr.sales).toBe(1);
    expect(apr.revenue).toBe(10000);
    expect(apr.commission).toBe(6000);
    expect(may.month).toBe('May');
    expect(may.sales).toBe(1);
    expect(may.revenue).toBe(20000);
    expect(may.commission).toBe(11500);
    expect(jun.month).toBe('June');
    expect(jun.sales).toBe(1);
    expect(jun.revenue).toBe(30000);
    expect(jun.commission).toBe(18000);
    expect(res.quarterly.totals.sales).toBe(3);
    expect(res.quarterly.totals.revenue).toBe(60000);
    expect(res.quarterly.totals.commission).toBe(35500);
    jest.useRealTimers();
  });
  it('computes projectedFinal mid-month using daily average (fake timers)', async () => {
    jest.useFakeTimers();
    const fixed = new Date('2025-07-10T12:00:00Z');
    jest.setSystemTime(fixed);
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    (globalThis as any).__ctMock = {
      agentGoals: [{ agent_id: 'a1', period_type: 'monthly', period_start: mStart, period_end: mEnd, goal_amount_cents: 100000 }],
      agentCommissions: [
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 3100, status: 'paid', earned_date: mStart },
      ],
    };
    const res = await getPerformanceData('a1');
    expect(res.goal.current).toBe(3100);
    expect(res.goal.projectedFinal).toBe(9610);
    jest.useRealTimers();
  });
  it('computes projectedFinal equals current at month end (fake timers)', async () => {
    jest.useFakeTimers();
    const fixed = new Date('2025-07-31T12:00:00Z');
    jest.setSystemTime(fixed);
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    (globalThis as any).__ctMock = {
      agentGoals: [{ agent_id: 'a1', period_type: 'monthly', period_start: mStart, period_end: mEnd, goal_amount_cents: 200000 }],
      agentCommissions: [
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 6200, status: 'paid', earned_date: mStart },
      ],
    };
    const res = await getPerformanceData('a1');
    expect(res.goal.current).toBe(6200);
    expect(res.goal.projectedFinal).toBe(6200);
    jest.useRealTimers();
  });
  it('computes retention rate filtering paused and month >14 customers', async () => {
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    (globalThis as any).__ctMock = {
      agentGoals: [{ agent_id: 'a1', period_type: 'monthly', period_start: mStart, period_end: mEnd, goal_amount_cents: 50000 }],
      agentCommissions: [],
      customerStatus: [
        { agent_id: 'a1', recurring_paused: false, current_month: 14 },
        { agent_id: 'a1', recurring_paused: false, current_month: 15 },
        { agent_id: 'a1', recurring_paused: true, current_month: 10 },
        { agent_id: 'a1', recurring_paused: false, current_month: 3 },
      ],
    };
    const res = await getPerformanceData('a1');
    expect(res.quota.totalCustomers).toBe(4);
    expect(res.quota.customersLost).toBe(2);
    expect(res.quota.retentionRate).toBe(50);
  });
  it('computes retention when all customers paused', async () => {
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    (globalThis as any).__ctMock = {
      agentGoals: [{ agent_id: 'a1', period_type: 'monthly', period_start: mStart, period_end: mEnd, goal_amount_cents: 50000 }],
      agentCommissions: [],
      customerStatus: [
        { agent_id: 'a1', recurring_paused: true, current_month: 5 },
        { agent_id: 'a1', recurring_paused: true, current_month: 10 },
        { agent_id: 'a1', recurring_paused: true, current_month: 14 },
      ],
    };
    const res = await getPerformanceData('a1');
    expect(res.quota.totalCustomers).toBe(3);
    expect(res.quota.customersLost).toBe(3);
    expect(res.quota.retentionRate).toBe(0);
    expect(res.quota.status).toBe('below');
  });
  it('orders quarter months correctly at quarter start (fake timers)', async () => {
    jest.useFakeTimers();
    const fixed = new Date('2025-10-01T12:00:00Z');
    jest.setSystemTime(fixed);
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    (globalThis as any).__ctMock = {
      agentGoals: [{ agent_id: 'a1', period_type: 'monthly', period_start: mStart, period_end: mEnd, goal_amount_cents: 50000 }],
      agentCommissions: [],
    };
    const res = await getPerformanceData('a1');
    expect(res.quarterly.months.map((m) => m.month)).toEqual(['October', 'November', 'December']);
    jest.useRealTimers();
  });
  it('aggregates yearTrend for leap-year February (fake timers)', async () => {
    jest.useFakeTimers();
    const fixed = new Date('2024-02-29T12:00:00Z');
    jest.setSystemTime(fixed);
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const mk = (y: number, m: number, d: number) => new Date(y, m, d).toISOString().split('T')[0];
    (globalThis as any).__ctMock = {
      agentGoals: [{ agent_id: 'a1', period_type: 'monthly', period_start: mStart, period_end: mEnd, goal_amount_cents: 50000 }],
      agentCommissions: [
        { agent_id: 'a1', amount_cents: 100, status: 'paid', earned_date: mk(2024, 0, 10) },
        { agent_id: 'a1', amount_cents: 200, status: 'paid', earned_date: mk(2024, 1, 20) },
        { agent_id: 'a1', amount_cents: 300, status: 'pending', earned_date: mk(2024, 1, 25) },
      ],
    };
    const res = await getPerformanceData('a1');
    expect(res.yearTrend.length).toBe(2);
    expect(res.yearTrend[0].month).toBe('Jan');
    expect(res.yearTrend[0].commission).toBe(100);
    expect(res.yearTrend[1].month).toBe('Feb');
    expect(res.yearTrend[1].commission).toBe(200);
    jest.useRealTimers();
  });
  it('includes future quarter months with zero totals at quarter start (fake timers)', async () => {
    jest.useFakeTimers();
    const fixed = new Date('2025-10-01T12:00:00Z');
    jest.setSystemTime(fixed);
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const mk = (y: number, m: number, d: number) => new Date(y, m, d).toISOString().split('T')[0];
    (globalThis as any).__ctMock = {
      agentGoals: [{ agent_id: 'a1', period_type: 'monthly', period_start: mStart, period_end: mEnd, goal_amount_cents: 50000 }],
      agentCommissions: [
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 5000, plan_price_cents: 10000, status: 'paid', earned_date: mk(2025, 9, 5) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 5000, plan_price_cents: 10000, status: 'paid', earned_date: mk(2025, 9, 25) },
      ],
    };
    const res = await getPerformanceData('a1');
    expect(res.quarterly.months.map((m) => m.month)).toEqual(['October', 'November', 'December']);
    const oct = res.quarterly.months[0];
    const nov = res.quarterly.months[1];
    const dec = res.quarterly.months[2];
    expect(oct.sales).toBe(2);
    expect(oct.revenue).toBe(20000);
    expect(oct.commission).toBe(10000);
    expect(nov.sales).toBe(0);
    expect(nov.revenue).toBe(0);
    expect(nov.commission).toBe(0);
    expect(dec.sales).toBe(0);
    expect(dec.revenue).toBe(0);
    expect(dec.commission).toBe(0);
    expect(res.quarterly.totals.sales).toBe(2);
    expect(res.quarterly.totals.revenue).toBe(20000);
    expect(res.quarterly.totals.commission).toBe(10000);
    jest.useRealTimers();
  });
  it('produces empty yearTrend on January 1 (fake timers)', async () => {
    jest.useFakeTimers();
    const fixed = new Date('2025-01-01T12:00:00Z');
    jest.setSystemTime(fixed);
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    (globalThis as any).__ctMock = {
      agentGoals: [{ agent_id: 'a1', period_type: 'monthly', period_start: mStart, period_end: mEnd, goal_amount_cents: 50000 }],
      agentCommissions: [],
    };
    const res = await getPerformanceData('a1');
    expect(res.yearTrend.length).toBe(0);
    jest.useRealTimers();
  });
  it('aggregates quarterly totals with upfront, recurring, and bonuses across months (fake timers)', async () => {
    jest.useFakeTimers();
    const fixed = new Date('2025-04-20T12:00:00Z');
    jest.setSystemTime(fixed);
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const mk = (y: number, m: number, d: number) => new Date(y, m, d).toISOString().split('T')[0];
    (globalThis as any).__ctMock = {
      agentGoals: [{ agent_id: 'a1', period_type: 'monthly', period_start: mStart, period_end: mEnd, goal_amount_cents: 50000 }],
      agentCommissions: [
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 5000, plan_price_cents: 10000, status: 'paid', earned_date: mk(2025, 3, 15) },
        { agent_id: 'a1', commission_type: 'recurring', amount_cents: 1000, status: 'paid', earned_date: mk(2025, 3, 20) },
        { agent_id: 'a1', commission_type: 'bonus_m3', amount_cents: 1500, status: 'paid', earned_date: mk(2025, 3, 25) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 7000, plan_price_cents: 14000, status: 'paid', earned_date: mk(2025, 4, 10) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 8000, plan_price_cents: 16000, status: 'paid', earned_date: mk(2025, 4, 12) },
        { agent_id: 'a1', commission_type: 'recurring', amount_cents: 1200, status: 'paid', earned_date: mk(2025, 4, 18) },
        { agent_id: 'a1', commission_type: 'bonus_m4', amount_cents: 2500, status: 'paid', earned_date: mk(2025, 4, 19) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 6000, plan_price_cents: 12000, status: 'paid', earned_date: mk(2025, 5, 5) },
        { agent_id: 'a1', commission_type: 'recurring', amount_cents: 1500, status: 'paid', earned_date: mk(2025, 5, 15) },
        { agent_id: 'a1', commission_type: 'recurring', amount_cents: 1500, status: 'paid', earned_date: mk(2025, 5, 20) },
        { agent_id: 'a1', commission_type: 'bonus_m6', amount_cents: 5000, status: 'paid', earned_date: mk(2025, 5, 25) },
      ],
    };
    const res = await getPerformanceData('a1');
    expect(res.quarterly.months.map((m) => m.month)).toEqual(['April', 'May', 'June']);
    const apr = res.quarterly.months[0];
    const may = res.quarterly.months[1];
    const jun = res.quarterly.months[2];
    expect(apr.sales).toBe(1);
    expect(apr.revenue).toBe(10000);
    expect(apr.commission).toBe(7500);
    expect(may.sales).toBe(2);
    expect(may.revenue).toBe(30000);
    expect(may.commission).toBe(18700);
    expect(jun.sales).toBe(1);
    expect(jun.revenue).toBe(12000);
    expect(jun.commission).toBe(14000);
    expect(res.quarterly.totals.sales).toBe(4);
    expect(res.quarterly.totals.revenue).toBe(52000);
    expect(res.quarterly.totals.commission).toBe(40200);
    jest.useRealTimers();
  });
  it('yearTrend full lead-up excludes December and sums paid history (fake timers)', async () => {
    jest.useFakeTimers();
    const fixed = new Date('2025-12-20T12:00:00Z');
    jest.setSystemTime(fixed);
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const mk = (y: number, m: number, d: number) => new Date(y, m, d).toISOString().split('T')[0];
    (globalThis as any).__ctMock = {
      agentGoals: [{ agent_id: 'a1', period_type: 'monthly', period_start: mStart, period_end: mEnd, goal_amount_cents: 50000 }],
      agentCommissions: [
        { agent_id: 'a1', amount_cents: 100, status: 'paid', earned_date: mk(2025, 0, 10) },
        { agent_id: 'a1', amount_cents: 600, status: 'paid', earned_date: mk(2025, 5, 10) },
        { agent_id: 'a1', amount_cents: 1100, status: 'paid', earned_date: mk(2025, 10, 10) },
        { agent_id: 'a1', amount_cents: 1200, status: 'paid', earned_date: mk(2025, 11, 10) },
        { agent_id: 'a1', amount_cents: 999, status: 'pending', earned_date: mk(2025, 11, 15) },
      ],
    };
    const res = await getPerformanceData('a1');
    expect(res.yearTrend.length).toBe(11);
    const months = res.yearTrend.map((e) => e.month);
    expect(months.includes('Dec')).toBe(false);
    const jan = res.yearTrend.find((e) => e.month === 'Jan');
    const jun = res.yearTrend.find((e) => e.month === 'Jun');
    const nov = res.yearTrend.find((e) => e.month === 'Nov');
    const feb = res.yearTrend.find((e) => e.month === 'Feb');
    expect(jan?.commission).toBe(100);
    expect(jun?.commission).toBe(600);
    expect(nov?.commission).toBe(1100);
    expect(feb?.commission).toBe(0);
    jest.useRealTimers();
  });
  it('aggregates quarterly totals at end of quarter with mixed entries (fake timers)', async () => {
    jest.useFakeTimers();
    const fixed = new Date('2025-06-30T12:00:00Z');
    jest.setSystemTime(fixed);
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const mk = (y: number, m: number, d: number) => new Date(y, m, d).toISOString().split('T')[0];
    (globalThis as any).__ctMock = {
      agentGoals: [{ agent_id: 'a1', period_type: 'monthly', period_start: mStart, period_end: mEnd, goal_amount_cents: 50000 }],
      agentCommissions: [
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 5000, plan_price_cents: 10000, status: 'paid', earned_date: mk(2025, 3, 5) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 10000, plan_price_cents: 20000, status: 'paid', earned_date: mk(2025, 3, 25) },
        { agent_id: 'a1', commission_type: 'recurring', amount_cents: 1000, status: 'paid', earned_date: mk(2025, 3, 20) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 7000, plan_price_cents: 15000, status: 'paid', earned_date: mk(2025, 4, 12) },
        { agent_id: 'a1', commission_type: 'bonus_m4', amount_cents: 2500, status: 'paid', earned_date: mk(2025, 4, 19) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 6000, plan_price_cents: 12000, status: 'paid', earned_date: mk(2025, 5, 5) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 7000, plan_price_cents: 14000, status: 'paid', earned_date: mk(2025, 5, 10) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 8000, plan_price_cents: 16000, status: 'paid', earned_date: mk(2025, 5, 20) },
        { agent_id: 'a1', commission_type: 'recurring', amount_cents: 1500, status: 'paid', earned_date: mk(2025, 5, 22) },
        { agent_id: 'a1', commission_type: 'recurring', amount_cents: 1500, status: 'paid', earned_date: mk(2025, 5, 25) },
      ],
    };
    const res = await getPerformanceData('a1');
    expect(res.quarterly.months.map((m) => m.month)).toEqual(['April', 'May', 'June']);
    const apr = res.quarterly.months[0];
    const may = res.quarterly.months[1];
    const jun = res.quarterly.months[2];
    expect(apr.sales).toBe(2);
    expect(apr.revenue).toBe(30000);
    expect(apr.commission).toBe(16000);
    expect(may.sales).toBe(1);
    expect(may.revenue).toBe(15000);
    expect(may.commission).toBe(9500);
    expect(jun.sales).toBe(3);
    expect(jun.revenue).toBe(42000);
    expect(jun.commission).toBe(24000);
    expect(res.quarterly.totals.sales).toBe(6);
    expect(res.quarterly.totals.revenue).toBe(87000);
    expect(res.quarterly.totals.commission).toBe(49500);
    jest.useRealTimers();
  });
  it('yearTrend includes months up to August with zeros when only January paid (fake timers)', async () => {
    jest.useFakeTimers();
    const fixed = new Date('2025-09-20T12:00:00Z');
    jest.setSystemTime(fixed);
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const mk = (y: number, m: number, d: number) => new Date(y, m, d).toISOString().split('T')[0];
    (globalThis as any).__ctMock = {
      agentGoals: [{ agent_id: 'a1', period_type: 'monthly', period_start: mStart, period_end: mEnd, goal_amount_cents: 50000 }],
      agentCommissions: [
        { agent_id: 'a1', amount_cents: 500, status: 'paid', earned_date: mk(2025, 0, 10) },
        { agent_id: 'a1', amount_cents: 999, status: 'pending', earned_date: mk(2025, 7, 15) },
      ],
    };
    const res = await getPerformanceData('a1');
    const months = res.yearTrend.map((e) => e.month);
    expect(months).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']);
    const jan = res.yearTrend[0];
    const aug = res.yearTrend[7];
    expect(jan.commission).toBe(500);
    expect(aug.commission).toBe(0);
    jest.useRealTimers();
  });
  it('counts multiple upfront sales in a single month (fake timers)', async () => {
    jest.useFakeTimers();
    const fixed = new Date('2025-04-10T12:00:00Z');
    jest.setSystemTime(fixed);
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const mk = (y: number, m: number, d: number) => new Date(y, m, d).toISOString().split('T')[0];
    (globalThis as any).__ctMock = {
      agentGoals: [{ agent_id: 'a1', period_type: 'monthly', period_start: mStart, period_end: mEnd, goal_amount_cents: 50000 }],
      agentCommissions: [
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 5000, plan_price_cents: 10000, status: 'paid', earned_date: mk(2025, 3, 5) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 5000, plan_price_cents: 10000, status: 'paid', earned_date: mk(2025, 3, 25) },
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 6000, plan_price_cents: 12000, status: 'paid', earned_date: mk(2025, 4, 12) },
      ],
    };
    const res = await getPerformanceData('a1');
    const apr = res.quarterly.months[0];
    const may = res.quarterly.months[1];
    const jun = res.quarterly.months[2];
    expect(apr.sales).toBe(2);
    expect(apr.revenue).toBe(20000);
    expect(apr.commission).toBe(10000);
    expect(may.sales).toBe(1);
    expect(may.revenue).toBe(12000);
    expect(may.commission).toBe(6000);
    expect(jun.sales).toBe(0);
    expect(jun.revenue).toBe(0);
    expect(jun.commission).toBe(0);
    expect(res.quarterly.totals.sales).toBe(3);
    expect(res.quarterly.totals.revenue).toBe(32000);
    expect(res.quarterly.totals.commission).toBe(16000);
    jest.useRealTimers();
  });
  it('rounds projectedFinal from fractional daily average (fake timers)', async () => {
    jest.useFakeTimers();
    const fixed = new Date('2025-07-07T12:00:00Z');
    jest.setSystemTime(fixed);
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    (globalThis as any).__ctMock = {
      agentGoals: [{ agent_id: 'a1', period_type: 'monthly', period_start: mStart, period_end: mEnd, goal_amount_cents: 100000 }],
      agentCommissions: [
        { agent_id: 'a1', commission_type: 'upfront', amount_cents: 1234, status: 'paid', earned_date: mStart },
      ],
    };
    const res = await getPerformanceData('a1');
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const expected = Math.round((1234 / 7) * daysInMonth);
    expect(res.goal.current).toBe(1234);
    expect(res.goal.projectedFinal).toBe(expected);
    jest.useRealTimers();
  });
});

describe('commission-tracker: dashboard quarterly period', () => {
  beforeEach(() => {
    (globalThis as any).__ctMock = {};
  });
  it('uses quarterly goal when period is this_quarter', async () => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const qStart = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
    const qEnd = new Date(now.getFullYear(), quarter * 3 + 3, 0).toISOString().split('T')[0];
    (globalThis as any).__ctMock = {
      agentGoals: [
        { agent_id: 'a1', period_type: 'quarterly', period_start: qStart, period_end: qEnd, goal_amount_cents: 75000 },
      ],
      agentCommissions: [],
    };
    const res = await getCommissionDashboard('a1', 'this_quarter');
    expect(res.summary.goal).toBe(75000);
    expect(typeof res.summary.goalProgress).toBe('number');
  });
});
describe('commission-tracker: customer detail', () => {
  beforeEach(() => {
    (globalThis as any).__ctMock = {};
  });
  it('returns timeline and totals for a customer', async () => {
    (globalThis as any).__ctMock = {
      customerStatus: [{ agent_id: 'a1', customer_id: 'c1', customer_name: 'C1', plan_name: 'Blue', plan_type: 'blue_pro', plan_price_cents: 10000, start_date: '2024-01-01', current_month: 7, rate_locked_at_15: true }],
      agentCommissions: [
        { agent_id: 'a1', customer_id: 'c1', commission_type: 'upfront', amount_cents: 5000, status: 'paid', earned_date: '2024-01-15' },
        { agent_id: 'a1', customer_id: 'c1', commission_type: 'recurring', amount_cents: 1000, status: 'pending', earned_date: '2024-02-15', rate_applied: 10 },
      ],
    };
    const res = await getCustomerCommissionDetail('a1', 'c1');
    expect(res?.totals.earned).toBe(5000);
    expect(res?.totals.pending).toBe(1000);
    expect(res?.totals.maxPossible).toBe(5000 + 1000*3 + 1500*9 + (1500+2500+5000+10000));
  });
});
