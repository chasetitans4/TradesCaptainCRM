import {
  getSmsUsageForAgent,
  getSmsUsageAlerts,
  updateClientSmsCap,
  getClientSmsHistory,
} from '@/lib/admin/sms-usage';

jest.mock('@/lib/supabase/server', () => {
  return {
    createAdminClient: jest.fn(() => ({
      from: (table: string) => {
        const m: any = (globalThis as any).__smsMock || {};
        if (table === 'crm_accounts') {
          return {
            select: (_fields?: string) => ({
              eq: (col: string, val: any) => {
                const chain: any = {
                  eq: (col2: string, val2: any) => ({
                    data: (m.crm_accounts || []).filter((r: any) => r[col] === val && r[col2] === val2),
                    error: null,
                  }),
                  single: () => ({
                    data: (m.crm_accounts || []).find((r: any) => r[col] === val) || null,
                    error: null,
                  }),
                };
                return chain;
              },
            }),
            update: (updates: any) => ({
              eq: (col: string, val: any) => {
                const base = m.crm_accounts || [];
                for (let i = 0; i < base.length; i++) {
                  if (base[i][col] === val) base[i] = { ...base[i], ...updates };
                }
                m.__state = m.__state || { updates: {} };
                m.__state.updates.crm_accounts = m.__state.updates.crm_accounts || [];
                m.__state.updates.crm_accounts.push({ where: { col, val }, updates });
                (globalThis as any).__smsMock = { ...m, crm_accounts: base, __state: m.__state };
                return {};
              },
            }),
          } as any;
        }
        if (table === 'sms_messages') {
          return {
            select: (_fields?: string, _opts?: any) => ({
              eq: (col: string, val: any) => ({
                gte: (col2: string, val2: any) => ({
                  lte: (col3: string, val3: any) => ({
                    count: (m.sms_messages || []).filter((r: any) => r[col] === val && new Date(r[col2]).getTime() >= new Date(val2).getTime() && new Date(r[col3]).getTime() <= new Date(val3).getTime()).length,
                    error: null,
                  }),
                  then: (resolve: any) => {
                    const count = (m.sms_messages || []).filter((r: any) => r[col] === val && new Date(r[col2]).getTime() >= new Date(val2).getTime()).length;
                    return resolve({ data: [], error: null, count });
                  },
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      },
    })),
  };
});

describe('admin sms-usage: portfolio usage summary', () => {
  beforeEach(() => { (globalThis as any).__smsMock = {}; });

  it('aggregates usage and overage revenue for agent clients', async () => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const startIso = monthStart.toISOString();

    (globalThis as any).__smsMock = {
      crm_accounts: [
        { id: 'c1', business_id: 'b1', business_name: 'ACME', plan_type: 'starter', sms_soft_cap: 500, agent_id: 'a1', status: 'active' },
        { id: 'c2', business_id: 'b2', business_name: 'Beta Co', plan_type: 'nevermiss', sms_soft_cap: 500, agent_id: 'a1', status: 'active' },
        { id: 'c3', business_id: 'b3', business_name: 'Gamma LLC', plan_type: 'gold', sms_soft_cap: 500, agent_id: 'a2', status: 'active' },
      ],
      sms_messages: [
        // ACME: 600 messages in period (over by 100)
        { id: 'm1', business_id: 'b1', sent_at: startIso },
        ...Array.from({ length: 599 }).map((_, i) => ({ id: `a${i}`, business_id: 'b1', sent_at: startIso })),
        // Beta: 300 messages (under cap)
        ...Array.from({ length: 300 }).map((_, i) => ({ id: `b${i}`, business_id: 'b2', sent_at: startIso })),
        // Gamma: 1000 messages but different agent, should be ignored
        ...Array.from({ length: 1000 }).map((_, i) => ({ id: `g${i}`, business_id: 'b3', sent_at: startIso })),
      ],
    };

    const res = await getSmsUsageForAgent('a1');
    expect(res.summary.total_clients).toBe(2);
    expect(res.summary.total_messages).toBe(600 + 300);
    expect(res.clients[0].client_name).toBe('ACME');
    expect(res.clients[0].usage_percent).toBeGreaterThanOrEqual(100);
    expect(res.clients[1].client_name).toBe('Beta Co');
    expect(res.clients[1].usage_percent).toBeLessThan(100);
    expect(res.summary.total_overage_revenue).toBeGreaterThan(0);
  });

  it('returns zero summary when agent has no active clients', async () => {
    (globalThis as any).__smsMock = {
      crm_accounts: [
        { id: 'c1', business_id: 'b1', business_name: 'ACME', plan_type: 'starter', sms_soft_cap: 500, agent_id: 'a2', status: 'active' },
      ],
      sms_messages: [],
    };
    const res = await getSmsUsageForAgent('a1');
    expect(res.summary.total_clients).toBe(0);
    expect(res.summary.total_messages).toBe(0);
    expect(res.summary.total_overage_revenue).toBe(0);
    expect(res.summary.over_cap).toBe(0);
    expect(res.summary.near_cap).toBe(0);
    expect(res.summary.under_cap).toBe(0);
    expect(res.clients.length).toBe(0);
  });
});

describe('admin sms-usage: alerts and updates', () => {
  beforeEach(() => { (globalThis as any).__smsMock = {}; });

  it('categorizes alerts for near, over, and excessive usage', async () => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const startIso = monthStart.toISOString();

    (globalThis as any).__smsMock = {
      crm_accounts: [
        { id: 'c1', business_id: 'b1', business_name: 'Alpha', plan_type: 'starter', sms_soft_cap: 500, agent_id: 'a1', status: 'active' },
        { id: 'c2', business_id: 'b2', business_name: 'Bravo', plan_type: 'nevermiss', sms_soft_cap: 500, agent_id: 'a1', status: 'active' },
        { id: 'c3', business_id: 'b3', business_name: 'Charlie', plan_type: 'gold', sms_soft_cap: 500, agent_id: 'a1', status: 'active' },
      ],
      sms_messages: [
        ...Array.from({ length: 400 }).map((_, i) => ({ id: `a${i}`, business_id: 'b1', sent_at: startIso })), // 80% near_cap
        ...Array.from({ length: 600 }).map((_, i) => ({ id: `b${i}`, business_id: 'b2', sent_at: startIso })), // 120% over_cap
        ...Array.from({ length: 800 }).map((_, i) => ({ id: `c${i}`, business_id: 'b3', sent_at: startIso })), // 160% excessive
      ],
    };

    const alerts = await getSmsUsageAlerts('a1');
    const types = alerts.map((a) => a.alert_type);
    expect(types).toEqual(expect.arrayContaining(['near_cap', 'over_cap', 'excessive']));
    expect(alerts.find((a) => a.client_name === 'Alpha')?.alert_type).toBe('near_cap');
    expect(alerts.find((a) => a.client_name === 'Bravo')?.alert_type).toBe('over_cap');
    expect(alerts.find((a) => a.client_name === 'Charlie')?.alert_type).toBe('excessive');
  });

  it('calculates tiered overage costs and upgrade suggestions', async () => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const startIso = monthStart.toISOString();
    (globalThis as any).__smsMock = {
      crm_accounts: [
        { id: 'c1', business_id: 'b1', business_name: 'Starter LLC', plan_type: 'starter', sms_soft_cap: 500, agent_id: 'a1', status: 'active' },
        { id: 'c2', business_id: 'b2', business_name: 'NeverMiss Co', plan_type: 'nevermiss', sms_soft_cap: 500, agent_id: 'a1', status: 'active' },
        { id: 'c3', business_id: 'b3', business_name: 'Gold Inc', plan_type: 'gold', sms_soft_cap: 500, agent_id: 'a1', status: 'active' },
        { id: 'c4', business_id: 'b4', business_name: 'Low Usage', plan_type: 'starter', sms_soft_cap: 500, agent_id: 'a1', status: 'active' },
      ],
      sms_messages: [
        ...Array.from({ length: 600 }).map((_, i) => ({ id: `s${i}`, business_id: 'b1', sent_at: startIso })),  // overage 100 -> tier1
        ...Array.from({ length: 2000 }).map((_, i) => ({ id: `n${i}`, business_id: 'b2', sent_at: startIso })), // overage 1500 -> tier2
        ...Array.from({ length: 2500 }).map((_, i) => ({ id: `g${i}`, business_id: 'b3', sent_at: startIso })), // overage 2000 -> tier3
        ...Array.from({ length: 350 }).map((_, i) => ({ id: `l${i}`, business_id: 'b4', sent_at: startIso })),  // under 80% -> no recommendation
      ],
    };
    const res = await getSmsUsageForAgent('a1');
    const s = res.clients.find(c => c.client_name === 'Starter LLC')!;
    const n = res.clients.find(c => c.client_name === 'NeverMiss Co')!;
    const g = res.clients.find(c => c.client_name === 'Gold Inc')!;
    const low = res.clients.find(c => c.client_name === 'Low Usage')!;
    expect(s.overage_cost).toBeCloseTo(100 * 0.03, 2);
    expect(n.overage_cost).toBeCloseTo(500 * 0.03 + 1000 * 0.025, 2);
    expect(g.overage_cost).toBeCloseTo(500 * 0.03 + 1000 * 0.025 + 500 * 0.02, 2);
    expect(s.recommended_upgrade).toBe('nevermiss');
    expect(n.recommended_upgrade).toBe('gold');
    expect(g.recommended_upgrade).toBe('custom');
    expect(low.recommended_upgrade).toBeNull();
  });

  it('updates client sms soft cap', async () => {
    (globalThis as any).__smsMock = {
      crm_accounts: [
        { id: 'c1', business_id: 'b1', business_name: 'ACME', plan_type: 'starter', sms_soft_cap: 500, agent_id: 'a1', status: 'active' },
      ],
    };
    await updateClientSmsCap('c1', 1000);
    const mock = (globalThis as any).__smsMock;
    expect(mock.crm_accounts[0].sms_soft_cap).toBe(1000);
    const state = mock.__state;
    expect(state.updates.crm_accounts?.[0]?.updates.sms_soft_cap).toBe(1000);
  });
});

describe('admin sms-usage: client history', () => {
  beforeEach(() => { (globalThis as any).__smsMock = {}; });

  it('builds monthly SMS history with overage calculation', async () => {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    (globalThis as any).__smsMock = {
      crm_accounts: [
        { id: 'c1', business_id: 'b1', sms_soft_cap: 500 },
      ],
      sms_messages: [
        // Last month: 550 messages -> overage 50
        ...Array.from({ length: 550 }).map((_, i) => ({ id: `lm${i}`, business_id: 'b1', sent_at: lastMonthStart })),
        // This month: 300 messages -> under cap
        ...Array.from({ length: 300 }).map((_, i) => ({ id: `tm${i}`, business_id: 'b1', sent_at: thisMonthStart })),
      ],
    };

    const history = await getClientSmsHistory('c1', 2);
    expect(history.length).toBe(2);
    const last = history[0];
    expect(last.messages_sent).toBe(550);
    expect(last.soft_cap).toBe(500);
    expect(last.overage).toBe(50);
    const current = history[1];
    expect(current.messages_sent).toBe(300);
    expect(current.overage).toBe(0);
  });

  it('returns empty history when client not found', async () => {
    (globalThis as any).__smsMock = {
      crm_accounts: [],
      sms_messages: [],
    };
    const history = await getClientSmsHistory('missing', 3);
    expect(history.length).toBe(0);
  });

  it('uses default soft cap when undefined and zero messages fallback', async () => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    (globalThis as any).__smsMock = {
      crm_accounts: [
        { id: 'c1', business_id: 'b1' },
      ],
      sms_messages: [
        ...Array.from({ length: 0 }).map((_, i) => ({ id: `z${i}`, business_id: 'b1', sent_at: thisMonthStart })),
      ],
    };
    const history = await getClientSmsHistory('c1', 1);
    expect(history.length).toBe(1);
    expect(history[0].soft_cap).toBe(500);
    expect(history[0].messages_sent).toBe(0);
    expect(history[0].overage).toBe(0);
  });
});

describe('admin sms-usage: additional portfolio and upgrade cases', () => {
  beforeEach(() => { (globalThis as any).__smsMock = {}; });

  it('handles client with zero messages and under cap categorization', async () => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const startIso = monthStart.toISOString();
    (globalThis as any).__smsMock = {
      crm_accounts: [
        { id: 'c1', business_id: 'b1', business_name: 'Zero Co', plan_type: 'starter', sms_soft_cap: 500, agent_id: 'a1', status: 'active' },
      ],
      sms_messages: [
        ...Array.from({ length: 0 }).map((_, i) => ({ id: `z${i}`, business_id: 'b1', sent_at: startIso })),
      ],
    };
    const res = await getSmsUsageForAgent('a1');
    expect(res.summary.total_clients).toBe(1);
    expect(res.summary.total_messages).toBe(0);
    expect(res.summary.under_cap).toBe(1);
    expect(res.clients[0].usage_percent).toBe(0);
  });

  it('suggests null upgrade for unknown plan when usage high', async () => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const startIso = monthStart.toISOString();
    (globalThis as any).__smsMock = {
      crm_accounts: [
        { id: 'c1', business_id: 'b1', business_name: 'Mystery', plan_type: 'platinum', sms_soft_cap: 500, agent_id: 'a1', status: 'active' },
      ],
      sms_messages: [
        ...Array.from({ length: 450 }).map((_, i) => ({ id: `m${i}`, business_id: 'b1', sent_at: startIso })),
      ],
    };
    const res = await getSmsUsageForAgent('a1');
    const mystery = res.clients.find(c => c.client_name === 'Mystery')!;
    expect(mystery.usage_percent).toBeGreaterThanOrEqual(80);
    expect(mystery.recommended_upgrade).toBeNull();
  });
});
