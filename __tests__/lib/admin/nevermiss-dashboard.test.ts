import { getNevermissDashboardSummary, getNevermissClients, getNevermissAlerts, getSmsUsageOverview } from '@/lib/admin/nevermiss-dashboard';

jest.mock('@/lib/supabase/server', () => {
  return {
    createAdminClient: jest.fn(() => ({
      from: (table: string) => {
        const m: any = (globalThis as any).__nmMock || {};
        if (table === 'crm_accounts') {
          return {
            select: (fields?: string) => {
              if (fields && fields.includes('id, business_name') && m.clients) {
                return {
                  eq: () => ({
                    in: () => ({ data: m.clients }),
                  }),
                };
              }
              if (fields && fields.includes('id, business_name, plan_type') && m.clientsWithPlans) {
                return {
                  eq: () => ({
                    eq: () => ({
                      in: () => ({ data: m.clientsWithPlans }),
                    }),
                  }),
                };
              }
              if (fields && fields.includes('id, business_name, plan_type') && m.nullClients) {
                return {
                  eq: () => ({
                    eq: () => ({
                      in: () => ({ data: null, error: null }),
                    }),
                  }),
                };
              }
              if (fields && fields.includes('id, business_name, plan_type, phone') && m.clientById) {
                return {
                  eq: (_col: string, id: string) => ({
                    single: () => {
                      const d = m.clientById[id] || null;
                      return { data: d };
                    },
                  }),
                };
              }
              if (fields === 'created_at' && m.createdAtByClient) {
                return {
                  eq: (_col: string, id: string) => ({
                    single: () => ({
                      data: { created_at: m.createdAtByClient[id] },
                    }),
                  }),
                };
              }
              return {
                eq: () => ({
                  in: () => ({ data: [] }),
                }),
              };
            },
          } as any;
        }
        if (table === 'nevermiss_conversations') {
          return {
            select: (fields?: string) => {
              if (fields && fields.includes('id, status') && m.convData) {
                return {
                  in: () => ({
                    gte: () => ({
                      lte: () => {
                        const idx = m.convCallIndex || 0;
                        const arr = (m.convData && m.convData[idx]) || [];
                        m.convCallIndex = idx + 1;
                        (globalThis as any).__nmMock = m;
                        return { data: arr };
                      },
                    }),
                  }),
                };
              }
              if (fields && fields.includes('id, status, started_at, last_message_at') && m.convsByClient) {
                return {
                  eq: (_col: string, id: string) => ({
                    gte: () => {
                      const arr = m.convsByClient[id] || [];
                      return { data: arr };
                    },
                  }),
                };
              }
              if (fields && fields.includes('messages:nevermiss_messages') && (m.fullConvsByClient || m.fullConvById)) {
                return {
                  eq: (_col: string, val: string) => ({
                    order: () => ({
                      range: (_s: number, _e: number) => {
                        if (m.nullConvs) return { data: null, error: null };
                        const arr = (m.fullConvsByClient && m.fullConvsByClient[val]) || [];
                        return { data: arr, error: null };
                      },
                    }),
                    single: () => {
                      if (m.nullConvSingle) {
                        return { data: null, error: null };
                      }
                      const d = (m.fullConvById && m.fullConvById[val]) || null;
                      return { data: d, error: d ? null : { message: 'not found' } };
                    },
                  }),
                };
              }
              return {};
            },
          } as any;
        }
        if (table === 'client_sms_usage') {
          return {
            select: (_fields?: string) => ({
              eq: (_col: string, clientId: string) => ({
                eq: (_col2: string, periodStart: string) => ({
                  single: () => {
                    const byClient = m.smsUsage || {};
                    const d = byClient[clientId]?.[periodStart] || null;
                    return { data: d };
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

describe('nevermiss dashboard: summary', () => {
  beforeEach(() => {
    (globalThis as any).__nmMock = {};
  });

  it('computes portfolio summary for current month', async () => {
    const now = new Date();
    const thisStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const thisEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
    (globalThis as any).__nmMock = {
      clients: [
        { id: 'c1', business_name: 'A' },
        { id: 'c2', business_name: 'B' },
      ],
      convData: [
        [
          { id: 'x1', status: 'booked', started_at: thisStart },
          { id: 'x2', status: 'captured', started_at: thisStart },
          { id: 'x3', status: 'no_response', started_at: thisEnd },
        ],
        [
          { id: 'p1', status: 'captured', started_at: prevStart },
          { id: 'p2', status: 'no_response', started_at: prevEnd },
        ],
      ],
      convCallIndex: 0,
    };
    const res = await getNevermissDashboardSummary('agent-1', 'this_month');
    expect(res.total_missed_calls).toBe(3);
    expect(res.total_leads_captured).toBe(2);
    expect(res.total_appointments_booked).toBe(1);
    expect(res.response_rate).toBe(67);
    expect(typeof res.missed_calls_change).toBe('number');
  });

  it('returns zeros when no clients', async () => {
    (globalThis as any).__nmMock = {
      clients: [],
      convData: [],
      convCallIndex: 0,
    };
    const res = await getNevermissDashboardSummary('agent-1', 'this_month');
    expect(res.total_missed_calls).toBe(0);
    expect(res.total_leads_captured).toBe(0);
    expect(res.total_appointments_booked).toBe(0);
    expect(res.response_rate).toBe(0);
    expect(res.missed_calls_change).toBe(0);
  });

  it('computes portfolio summary for last month branch', async () => {
    const now = new Date();
    const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const lastEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString();
    const prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0).toISOString();
    (globalThis as any).__nmMock = {
      clients: [
        { id: 'c1', business_name: 'A' },
      ],
      convData: [
        [
          { id: 'x1', status: 'booked', started_at: lastStart },
          { id: 'x2', status: 'no_response', started_at: lastEnd },
        ],
        [
          { id: 'p1', status: 'captured', started_at: prevStart },
          { id: 'p2', status: 'captured', started_at: prevEnd },
        ],
      ],
      convCallIndex: 0,
    };
    const res = await getNevermissDashboardSummary('agent-1', 'last_month');
    expect(res.total_missed_calls).toBe(2);
    expect(res.total_leads_captured).toBe(1);
  });
});

describe('nevermiss dashboard: clients', () => {
  beforeEach(() => {
    (globalThis as any).__nmMock = {};
  });

  it('lists clients with usage and status and supports filtering', async () => {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    (globalThis as any).__nmMock = {
      clientsWithPlans: [
        { id: 'c1', business_name: 'A', plan_type: 'nevermiss' },
        { id: 'c2', business_name: 'B', plan_type: 'blue_pro' },
        { id: 'c3', business_name: 'C', plan_type: 'gold_pro' },
        { id: 'c4', business_name: 'D', plan_type: 'blue_enterprise' },
      ],
      smsUsage: {
        c1: { [periodStart]: { sms_sent: 800, sms_cap: 700, leads_captured: 10 } },
        c2: { [periodStart]: { sms_sent: 850, sms_cap: 1000, leads_captured: 8 } },
        c3: { [periodStart]: { sms_sent: 100, sms_cap: 1000, leads_captured: 2 } },
        c4: { [periodStart]: { sms_sent: 300, sms_cap: 1500, leads_captured: 4 } },
      },
    };
    const all = await getNevermissClients('agent-1', 'all');
    expect(all.length).toBe(4);
    expect(all[0].status).toBe('over_cap');
    expect(all[1].status).toBe('near_cap');
    expect(all[2].status).toBe('healthy');
    expect(all[3].status).toBe('low_usage');
    const filtered = await getNevermissClients('agent-1', 'near_cap');
    expect(filtered.length).toBe(1);
    expect(filtered[0].client_id).toBe('c2');
  });
  it('returns empty list when client fetch returns null data', async () => {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    (globalThis as any).__nmMock = {
      nullClients: true,
      smsUsage: {
        c1: { [periodStart]: { sms_sent: 0, sms_cap: 0, leads_captured: 0 } },
      },
    };
    const all = await getNevermissClients('agent-1', 'all');
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBe(0);
  });
});

describe('nevermiss dashboard: alerts', () => {
  beforeEach(() => {
    (globalThis as any).__nmMock = {};
  });

  it('generates over_cap, near_cap, low_usage, and declining rate alerts', async () => {
    const now = new Date();
    const thisPeriod = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastPeriod = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const createdAtPast = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString();
    (globalThis as any).__nmMock = {
      clientsWithPlans: [
        { id: 'c1', business_name: 'A', plan_type: 'nevermiss' },
        { id: 'c2', business_name: 'B', plan_type: 'blue_pro' },
        { id: 'c3', business_name: 'C', plan_type: 'gold_pro' },
      ],
      smsUsage: {
        c1: { [thisPeriod]: { sms_sent: 800, leads_captured: 10 }, [lastPeriod]: { sms_sent: 100, leads_captured: 60 } },
        c2: { [thisPeriod]: { sms_sent: 850, leads_captured: 8 }, [lastPeriod]: { sms_sent: 100, leads_captured: 90 } },
        c3: { [thisPeriod]: { sms_sent: 100, leads_captured: 2 }, [lastPeriod]: { sms_sent: 100, leads_captured: 80 } },
      },
      createdAtByClient: { c3: createdAtPast },
    };
    const alerts = await getNevermissAlerts('agent-1');
    const types = alerts.map(a => a.type);
    expect(types).toContain('over_cap');
    expect(types).toContain('near_cap');
    expect(types).toContain('low_usage');
    expect(types).toContain('declining_rate');
  });
  it('generates declining rate alert at exact 15% drop boundary', async () => {
    const now = new Date();
    const thisPeriod = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastPeriod = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    (globalThis as any).__nmMock = {
      clientsWithPlans: [{ id: 'c1', business_name: 'A', plan_type: 'nevermiss' }],
      smsUsage: {
        c1: {
          [thisPeriod]: { sms_sent: 100, leads_captured: 5 },   // 5%
          [lastPeriod]: { sms_sent: 100, leads_captured: 20 },  // 20%
        },
      },
      createdAtByClient: { c1: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString() },
    };
    const alerts = await getNevermissAlerts('agent-1');
    expect(alerts.some(a => a.type === 'declining_rate')).toBe(true);
  });
  it('does not generate declining rate alert when last month sms <= 50', async () => {
    const now = new Date();
    const thisPeriod = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastPeriod = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    (globalThis as any).__nmMock = {
      clientsWithPlans: [{ id: 'c2', business_name: 'B', plan_type: 'nevermiss' }],
      smsUsage: {
        c2: {
          [thisPeriod]: { sms_sent: 100, leads_captured: 10 },
          [lastPeriod]: { sms_sent: 50, leads_captured: 40 },
        },
      },
      createdAtByClient: { c2: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString() },
    };
    const alerts = await getNevermissAlerts('agent-1');
    expect(alerts.some(a => a.client_id === 'c2' && a.type === 'declining_rate')).toBe(false);
  });
  it('handles zero SMS this month yielding 0% rate', async () => {
    const now = new Date();
    const thisPeriod = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastPeriod = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    (globalThis as any).__nmMock = {
      clientsWithPlans: [{ id: 'c3', business_name: 'C', plan_type: 'nevermiss' }],
      smsUsage: {
        c3: {
          [thisPeriod]: { sms_sent: 0, leads_captured: 0 },     // 0%
          [lastPeriod]: { sms_sent: 200, leads_captured: 60 },  // 30%
        },
      },
      createdAtByClient: { c3: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString() },
    };
    const alerts = await getNevermissAlerts('agent-1');
    expect(alerts.some(a => a.client_id === 'c3' && a.type === 'declining_rate')).toBe(true);
  });
});

describe('nevermiss dashboard: sms usage overview', () => {
  it('aggregates totals and status breakdown', async () => {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    (globalThis as any).__nmMock = {
      clientsWithPlans: [
        { id: 'c1', business_name: 'A', plan_type: 'nevermiss' },
        { id: 'c2', business_name: 'B', plan_type: 'blue_pro' },
        { id: 'c3', business_name: 'C', plan_type: 'gold_pro' },
        { id: 'c4', business_name: 'D', plan_type: 'blue_enterprise' },
      ],
      smsUsage: {
        c1: { [periodStart]: { sms_sent: 800, leads_captured: 10 } },
        c2: { [periodStart]: { sms_sent: 850, leads_captured: 8 } },
        c3: { [periodStart]: { sms_sent: 100, leads_captured: 2 } },
        c4: { [periodStart]: { sms_sent: 300, leads_captured: 4 } },
      },
    };
    const res = await getSmsUsageOverview('agent-1');
    expect(res.total_clients).toBe(4);
    expect(res.total_sms_sent).toBe(2050);
    expect(res.total_sms_capacity).toBe(4200);
    expect(res.by_status.over_cap).toBe(1);
    expect(res.by_status.near_cap).toBe(1);
    expect(res.by_status.low_usage).toBe(1);
    expect(res.by_status.healthy).toBe(1);
  });
  it('returns zero overall usage percent when no clients', async () => {
    (globalThis as any).__nmMock = {
      clientsWithPlans: [],
    };
    const res = await getSmsUsageOverview('agent-1');
    expect(res.total_clients).toBe(0);
    expect(res.total_sms_capacity).toBe(0);
    expect(res.overall_usage_percent).toBe(0);
  });
});

describe('nevermiss dashboard: client detail', () => {
  beforeEach(() => { (globalThis as any).__nmMock = {}; });
  it('returns null when client not found', async () => {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    (globalThis as any).__nmMock = {
      clientById: {},
      smsUsage: { x: { [periodStart]: { sms_sent: 0 } } },
      convsByClient: { x: [] },
    };
    const mod = require('@/lib/admin/nevermiss-dashboard');
    const detail = await mod.getNevermissClientDetail('x');
    expect(detail).toBeNull();
  });
  it('computes usage, stats, quality, and trend data', async () => {
    const now = new Date();
    const thisStartStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthKeys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString().split('T')[0];
      monthKeys.push(d);
    }
    (globalThis as any).__nmMock = {
      clientById: { c9: { id: 'c9', business_name: 'ZZ', plan_type: 'unknown_plan', phone: '(555) 000-0000' } },
      smsUsage: {
        c9: {
          [thisStartStr]: { sms_sent: 350, leads_captured: 12, appointments_booked: 4 },
          [monthKeys[0]]: { sms_sent: 100 },
          [monthKeys[1]]: { sms_sent: 200 },
          [monthKeys[2]]: { sms_sent: 300 },
          [monthKeys[3]]: { sms_sent: 400 },
          [monthKeys[4]]: { sms_sent: 500 },
          [monthKeys[5]]: { sms_sent: 600 },
        },
      },
      convsByClient: {
        c9: [
          { id: 'a', status: 'captured', started_at: new Date().toISOString(), last_message_at: new Date(Date.now() + 5000).toISOString() },
          { id: 'b', status: 'booked', started_at: new Date().toISOString(), last_message_at: new Date(Date.now() + 3000).toISOString() },
          { id: 'c', status: 'no_response', started_at: new Date().toISOString() },
        ],
      },
    };
    const mod = require('@/lib/admin/nevermiss-dashboard');
    const detail = await mod.getNevermissClientDetail('c9');
    expect(detail?.client.id).toBe('c9');
    expect(detail?.usage.sms_cap).toBe(700);
    expect(detail?.stats.missed_calls).toBe(3);
    expect(detail?.quality_breakdown.no_response).toBe(1);
    expect(detail?.quality_breakdown.needs_callback).toBe(1);
    expect(Array.isArray(detail?.trend_data)).toBe(true);
    expect(detail?.trend_data.length).toBe(6);
  });
  it('returns empty conversations list when fetch returns null data', async () => {
    (globalThis as any).__nmMock = {
      fullConvsByClient: { c7: [] },
      nullConvs: true,
    };
    const mod = require('@/lib/admin/nevermiss-dashboard');
    const list = await mod.getNevermissConversations('c7', 10, 0);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(0);
  });
  it('returns null for single conversation when data is null', async () => {
    (globalThis as any).__nmMock = {
      fullConvById: {},
      nullConvSingle: true,
    };
    const mod = require('@/lib/admin/nevermiss-dashboard');
    const one = await mod.getNevermissConversation('convY');
    expect(one).toBeNull();
  });
});

describe('nevermiss dashboard: conversations', () => {
  beforeEach(() => { (globalThis as any).__nmMock = {}; });
  it('lists conversations and sorts messages by sent_at', async () => {
    (globalThis as any).__nmMock = {
      fullConvsByClient: {
        c7: [
          { id: 'conv1', client_id: 'c7', messages: [
            { id: 'm2', sent_at: '2024-01-02T00:00:00.000Z' },
            { id: 'm1', sent_at: '2024-01-01T00:00:00.000Z' },
          ]},
        ],
      },
    };
    const mod = require('@/lib/admin/nevermiss-dashboard');
    const list = await mod.getNevermissConversations('c7', 10, 0);
    expect(list.length).toBe(1);
    expect(list[0].messages.map((m: any) => m.id)).toEqual(['m1', 'm2']);
  });
  it('handles conversations with missing messages array', async () => {
    (globalThis as any).__nmMock = {
      fullConvsByClient: {
        c8: [
          { id: 'convZ', client_id: 'c8' },
        ],
      },
    };
    const mod = require('@/lib/admin/nevermiss-dashboard');
    const list = await mod.getNevermissConversations('c8', 10, 0);
    expect(list.length).toBe(1);
    expect(Array.isArray(list[0].messages)).toBe(true);
    expect(list[0].messages.length).toBe(0);
  });
  it('gets single conversation with sorted messages and returns null when not found', async () => {
    (globalThis as any).__nmMock = {
      fullConvById: {
        convX: { id: 'convX', client_id: 'c7', messages: [
          { id: 'm3', sent_at: '2024-01-03T00:00:00.000Z' },
          { id: 'm1', sent_at: '2024-01-01T00:00:00.000Z' },
          { id: 'm2', sent_at: '2024-01-02T00:00:00.000Z' },
        ]},
      },
    };
    const mod = require('@/lib/admin/nevermiss-dashboard');
    const one = await mod.getNevermissConversation('convX');
    expect(one?.messages.map((m: any) => m.id)).toEqual(['m1', 'm2', 'm3']);
    const none = await mod.getNevermissConversation('unknown');
    expect(none).toBeNull();
  });
});
