import {
  getCommissionRules,
  createRetentionCommission,
  createUpfrontCommission,
  createRecurringCommission,
  createAnnualCommission,
  markCommissionEligible,
  getRetentionTracking,
  upsertRetentionTracking,
  completeMonth3Call,
  sendMonth3Audit,
  setSaleAttribution,
  calculatePerformanceBonus,
  getRetentionTasks,
} from '@/lib/admin/commissions';

jest.mock('@/lib/supabase/server', () => {
  const state: any = {
    commission_rules: [
      {
        id: 'rule1',
        plan_type: 'pro_month',
        plan_tier: 'standard',
        billing_interval: 'month',
        is_active: true,
        effective_from: '2024-01-01T00:00:00.000Z',
        month_3_call_bonus: 50,
        recurring_rate: 0.2,
        annual_rate: 0.35,
      },
    ],
    commissions: [] as any[],
    perfCommissions: [
      { agent_id: 'agent-1', commission_type: 'upfront', sale_amount: 1000, sale_date: new Date().toISOString() },
      { agent_id: 'agent-1', commission_type: 'annual_onetime', sale_amount: 1500, sale_date: new Date().toISOString() },
    ],
    retention_tracking: [
      {
        id: 'rt1',
        crm_account_id: 'acct-crm-1',
        agent_id: 'agent-1',
        month_3_call_completed: false,
        month_3_bonus_paid: false,
      },
    ],
    crm_accounts: [
      { id: 'acct-crm-1', plan_type: 'pro_month', stripe_subscription_id: 'sub_crm_1', status: 'active', billing_interval: 'month', created_at: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1).toISOString() },
    ],
    web_customers: [
      { id: 'acct-web-1', plan_type: 'pro_month', stripe_subscription_id: 'sub_web_1', status: 'active', billing_interval: 'month', created_at: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1).toISOString() },
    ],
    sales_attribution_log: [] as any[],
    updates: [] as any[],
    upserts: [] as any[],
  };
  const getRows = (table: string) => (state as any)[table] || [];
  const setRowById = (table: string, idField: string, id: any, updates: any) => {
    const arr = getRows(table);
    const idx = arr.findIndex((r: any) => r[idField] === id);
    if (idx !== -1) arr[idx] = { ...arr[idx], ...updates };
  };
  const commissionsTable = {
    insert: (payload: any) => ({
      select: () => ({
        single: () => {
          const rec = { id: 'c' + (state.commissions.length + 1), ...payload };
          state.commissions.push(rec);
          return { data: rec, error: null };
        },
      }),
    }),
    update: (updates: any) => {
      const chain: any = {
        eq: (_col: string, _val: any) => chain,
        in: (_col: string, _vals: any[]) => chain,
        select: () => ({
          single: () => ({ data: { id: 'cX', ...updates }, error: null }),
        }),
      };
      state.updates.push({ table: 'commissions', updates });
      return chain;
    },
    select: (fields?: string) => {
      if (fields === 'sale_amount') {
        const chain: any = {
          eq: (_col: string, _val: any) => chain,
          in: (_col: string, _vals: any[]) => chain,
          gte: (_col: string, _val: any) => chain,
          lte: (_col: string, _val: any) => ({
            then: (resolve: any) => {
              resolve({ data: state.perfCommissions });
            },
          }),
        };
        return chain;
      }
      return {
        eq: (_col: string, _val: any) => ({
          order: () => ({ data: [{ id: 'cx1' }], error: null }),
        }),
      };
    },
  };
  const rulesTable = {
    select: () => ({
      eq: (_col: string, _val: any) => ({
        eq: (_col2: string, _val2: any) => ({
          eq: (_col3: string, _val3: any) => ({
            order: () => ({
              limit: () => ({
                eq: (_col4?: string, _val4?: any) => ({
                  single: () => {
                    return { data: state.commission_rules[0], error: null };
                  },
                }),
                single: () => ({ data: state.commission_rules[0], error: null }),
              }),
            }),
          }),
        }),
      }),
    }),
  };
  const retentionTable = {
    select: () => ({
      eq: (col: string, val: any) => ({
        single: () => {
          if (col === 'id') {
            const rec = state.retention_tracking.find((r: any) => r.id === val);
            return { data: rec || null, error: rec ? null : { message: 'not found' } };
          }
          const field = col;
          const rec = state.retention_tracking.find((r: any) => r[field] === val);
          return { data: rec || null, error: rec ? null : { message: 'not found' } };
        },
      }),
    }),
    update: (updates: any) => ({
      eq: (_col: string, id: any) => {
        setRowById('retention_tracking', 'id', id, updates);
        return {};
      },
    }),
    upsert: (payload: any, _opts: any) => ({
      select: () => ({
        single: () => {
          // upsert by crm_account_id or web_customer_id
          const idField = payload.crm_account_id ? 'crm_account_id' : 'web_customer_id';
          const id = payload[idField];
          const existingIdx = state.retention_tracking.findIndex((r: any) => r[idField] === id);
          const record = {
            id: 'rt' + (state.retention_tracking.length + 1),
            ...payload,
          };
          if (existingIdx !== -1) {
            state.retention_tracking[existingIdx] = { ...state.retention_tracking[existingIdx], ...payload };
          } else {
            state.retention_tracking.push(record);
          }
          state.upserts.push({ table: 'retention_tracking', payload });
          return { data: record, error: null };
        },
      }),
    }),
  };
  const crmAccounts = {
    select: (fields?: string) => {
      if (fields?.includes('retention:retention_tracking')) {
        const q: any = { filters: [] };
        const api: any = {
          eq: (col: string, val: any) => { q.filters.push({ col, val }); return api; },
          then: (resolve: any) => {
            let rows = [...state.crm_accounts];
            for (const f of q.filters) {
              rows = rows.filter((r: any) => r[f.col] === f.val);
            }
            const result = rows.map((a: any) => ({
              ...a,
              retention: state.retention_tracking.filter((r: any) => r.crm_account_id === a.id),
            }));
            resolve({ data: result });
          },
        };
        return api;
      }
      return {
        eq: (_col: string, id: any) => ({
          single: () => {
            const rec = state.crm_accounts.find((a: any) => a.id === id);
            return { data: rec || null, error: rec ? null : { message: 'not found' } };
          },
        }),
      };
    },
    update: (updates: any) => ({
      eq: (_col: string, id: any) => {
        setRowById('crm_accounts', 'id', id, updates);
        return {};
      },
    }),
  };
  const webCustomers = {
    select: () => ({
      eq: (_col: string, id: any) => ({
        single: () => {
          const rec = state.web_customers.find((a: any) => a.id === id);
          return { data: rec || null, error: rec ? null : { message: 'not found' } };
        },
      }),
    }),
    update: (updates: any) => ({
      eq: (_col: string, id: any) => {
        setRowById('web_customers', 'id', id, updates);
        return {};
      },
    }),
  };
  const salesAttributionLog = {
    insert: (payload: any) => {
      state.sales_attribution_log.push(payload);
      return {};
    },
  };
  return {
    createAdminClient: jest.fn(() => ({
      from: (table: string) => {
        if (table === 'commissions') return commissionsTable as any;
        if (table === 'commission_rules') return rulesTable as any;
        if (table === 'retention_tracking') return retentionTable as any;
        if (table === 'crm_accounts') return crmAccounts as any;
        if (table === 'web_customers') return webCustomers as any;
        if (table === 'sales_attribution_log') return salesAttributionLog as any;
        return {} as any;
      },
    })),
    __state: state,
  };
});

describe('admin commissions: rules and retention flows', () => {
  beforeEach(() => {
    const supabase = require('@/lib/supabase/server');
    supabase.__state.commissions = [];
    supabase.__state.sales_attribution_log = [];
    supabase.__state.updates = [];
    supabase.__state.upserts = [];
    if (Array.isArray(supabase.__state.commission_rules) && supabase.__state.commission_rules[0]) {
      supabase.__state.commission_rules[0].month_3_call_bonus = 50;
    }
    supabase.__state.retention_tracking = [
      {
        id: 'rt1',
        crm_account_id: 'acct-crm-1',
        agent_id: 'agent-1',
        month_3_call_completed: false,
        month_3_bonus_paid: false,
      },
    ];
    // reset sample accounts creation dates around milestones
    const now = new Date();
    supabase.__state.crm_accounts = [
      { id: 'acct-crm-1', plan_type: 'pro_month', stripe_subscription_id: 'sub_crm_1', status: 'active', billing_interval: 'month', created_at: new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString() },
      { id: 'acct-crm-2', plan_type: 'pro_month', stripe_subscription_id: 'sub_crm_2', status: 'active', billing_interval: 'month', created_at: new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).toISOString() },
      { id: 'acct-crm-3', plan_type: 'pro_month', stripe_subscription_id: 'sub_crm_3', status: 'active', billing_interval: 'month', created_at: new Date(now.getFullYear(), now.getMonth() - 12, now.getDate()).toISOString() },
    ];
  });

  it('gets commission rules with optional plan tier', async () => {
    const rule = await getCommissionRules('pro_month', 'month', 'standard');
    expect(rule?.month_3_call_bonus).toBe(50);
  });

  it('creates retention commission (options object) and marks eligible', async () => {
    const supabase = require('@/lib/supabase/server');
    const commission = await createRetentionCommission({
      agentId: 'agent-1',
      crmAccountId: 'acct-crm-1',
      milestone: 'month_3_call',
      bonusAmount: 50,
      planType: 'pro_month',
      billingInterval: 'month',
    });
    expect(commission.retention_milestone).toBe('month_3_call');
    const update = supabase.__state.updates.find((u: any) => u.table === 'commissions' && u.updates?.status === 'eligible');
    expect(update).toBeDefined();
  });

  it('creates retention commission (legacy positional) and marks eligible', async () => {
    const supabase = require('@/lib/supabase/server');
    const commission = await createRetentionCommission(
      'agent-2',
      'acct-web-1',
      'web',
      'sub_web_1',
      'month_3_call',
      75,
      new Date()
    );
    expect(commission.retention_milestone).toBe('month_3_call');
    const update = supabase.__state.updates.find((u: any) => u.table === 'commissions' && u.updates?.status === 'eligible');
    expect(update).toBeDefined();
  });

  it('completes Month 3 call using trackingId', async () => {
    const supabase = require('@/lib/supabase/server');
    await completeMonth3Call('rt1', 'notes go here');
    const rt = supabase.__state.retention_tracking.find((r: any) => r.id === 'rt1');
    expect(rt.month_3_call_completed).toBe(true);
    expect(rt.month_3_call_notes).toBe('notes go here');
  });
 
  it('completeMonth3Call throws when tracking record missing', async () => {
    await expect(completeMonth3Call('rt-missing', 'notes')).rejects.toThrow('Retention tracking not found');
  });

  it('completes Month 3 call using account details (upsert)', async () => {
    const supabase = require('@/lib/supabase/server');
    await completeMonth3Call('acct-crm-1', 'crm', 'agent-1', 'follow-up');
    const upsert = supabase.__state.upserts.find((u: any) => u.table === 'retention_tracking');
    expect(upsert).toBeDefined();
  });

  it('sends Month 3 audit using trackingId and pays bonus', async () => {
    const supabase = require('@/lib/supabase/server');
    // ensure call completed
    await completeMonth3Call('rt1', 'done');
    const beforeCount = supabase.__state.commissions.length;
    await sendMonth3Audit('rt1');
    expect(supabase.__state.commissions.length).toBeGreaterThan(beforeCount);
    const rt = supabase.__state.retention_tracking.find((r: any) => r.id === 'rt1');
    expect(rt.month_3_bonus_paid).toBe(true);
  });
 
  it('sendMonth3Audit throws when tracking record missing', async () => {
    await expect(sendMonth3Audit('rt-missing')).rejects.toThrow('Retention tracking not found');
  });
 
  it('throws when sending Month 3 audit before call completion (trackingId path)', async () => {
    const supabase = require('@/lib/supabase/server');
    // ensure tracking shows call not completed
    supabase.__state.retention_tracking[0].month_3_call_completed = false;
    await expect(sendMonth3Audit('rt1')).rejects.toThrow('Must complete Month 3 call before sending audit');
  });
 
  it('sends Month 3 audit with no bonus when rules missing', async () => {
    const supabase = require('@/lib/supabase/server');
    await completeMonth3Call('rt1', 'done');
    supabase.__state.commission_rules[0].month_3_call_bonus = undefined;
    const before = supabase.__state.commissions.length;
    await sendMonth3Audit('rt1');
    expect(supabase.__state.commissions.length).toBe(before);
    const rt = supabase.__state.retention_tracking.find((r: any) => r.id === 'rt1');
    expect(rt.month_3_bonus_paid).toBe(false);
  });

  it('sends Month 3 audit using account details and pays bonus', async () => {
    const supabase = require('@/lib/supabase/server');
    // ensure call completed on existing tracking for account path
    await completeMonth3Call('rt1', 'done');
    await sendMonth3Audit('acct-crm-1', 'crm', 'agent-1');
    const upsert = supabase.__state.upserts.find((u: any) => u.table === 'retention_tracking' && u.payload?.month_3_bonus_paid === true);
    expect(upsert).toBeDefined();
  });
 
  it('throws when sending Month 3 audit before call completion (account path)', async () => {
    const supabase = require('@/lib/supabase/server');
    // ensure tracking shows call not completed
    supabase.__state.retention_tracking[0].month_3_call_completed = false;
    await expect(sendMonth3Audit('acct-crm-1', 'crm', 'agent-1')).rejects.toThrow('Must complete Month 3 call before sending audit');
  });

  it('sets sale attribution to company and agent', async () => {
    const supabase = require('@/lib/supabase/server');
    await setSaleAttribution('crm', 'acct-crm-1', 'company', 'admin-1', 1000, 'pro_month', 'notes');
    const a1 = supabase.__state.crm_accounts.find((a: any) => a.id === 'acct-crm-1');
    expect(a1.company_sale).toBe(true);
    await setSaleAttribution('crm', 'acct-crm-1', 'agent-9', 'admin-1');
    const a2 = supabase.__state.crm_accounts.find((a: any) => a.id === 'acct-crm-1');
    expect(a2.agent_id).toBe('agent-9');
    const logs = supabase.__state.sales_attribution_log;
    expect(logs.length).toBeGreaterThanOrEqual(2);
  });

  it('sets sale attribution for web customer path', async () => {
    const supabase = require('@/lib/supabase/server');
    await setSaleAttribution('web', 'acct-web-1', 'company', 'admin-2');
    const w1 = supabase.__state.web_customers.find((a: any) => a.id === 'acct-web-1');
    expect(w1.company_sale).toBe(true);
    await setSaleAttribution('web', 'acct-web-1', 'agent-11', 'admin-2');
    const w2 = supabase.__state.web_customers.find((a: any) => a.id === 'acct-web-1');
    expect(w2.agent_id).toBe('agent-11');
    const logWeb = supabase.__state.sales_attribution_log.find((l: any) => l.web_customer_id === 'acct-web-1');
    expect(logWeb).toBeDefined();
  });

  it('gets retention tracking by trackingId and by accountId', async () => {
    const byId = await getRetentionTracking('rt1');
    expect(byId?.id).toBe('rt1');
    const byAccount = await getRetentionTracking('acct-crm-1', 'crm');
    expect(byAccount?.crm_account_id).toBe('acct-crm-1');
  });

  it('upserts retention tracking for CRM account', async () => {
    const supabase = require('@/lib/supabase/server');
    const rec = await upsertRetentionTracking('acct-crm-1', 'crm', 'agent-2', { month_3_call_completed: true });
    expect(rec.agent_id).toBe('agent-2');
    const upsert = supabase.__state.upserts.find((u: any) => u.table === 'retention_tracking');
    expect(upsert).toBeDefined();
  });

  it('creates upfront, recurring, and annual commissions and marks eligible', async () => {
    const supabase = require('@/lib/supabase/server');
    const upfront = await createUpfrontCommission(
      'agent-1',
      'acct-crm-1',
      'crm',
      'sub_crm_1',
      { plan_type: 'pro_month', plan_tier: 'standard', upfront_amount: 200 } as any,
      1000,
      new Date()
    );
    expect(upfront.commission_type).toBe('upfront');
    const recurring = await createRecurringCommission(
      'agent-1',
      'acct-crm-1',
      'crm',
      'sub_crm_1',
      { plan_type: 'pro_month', plan_tier: 'standard', recurring_rate: 0.2 } as any,
      1000,
      1,
      new Date()
    );
    expect(recurring.commission_type).toBe('recurring');
    const annual = await createAnnualCommission(
      'agent-1',
      'acct-crm-1',
      'crm',
      'sub_crm_1',
      { plan_type: 'pro_month', plan_tier: 'standard', annual_rate: 0.35 } as any,
      12000,
      new Date()
    );
    expect(annual.commission_type).toBe('annual_onetime');
    const eligibleUpdates = supabase.__state.updates.filter((u: any) => u.updates?.status === 'eligible');
    expect(eligibleUpdates.length).toBeGreaterThanOrEqual(2);
  });

  it('calculates performance bonus metrics', async () => {
    const res = await calculatePerformanceBonus('agent-1', new Date().getFullYear(), new Date().getMonth() + 1);
    expect(res.dealCount).toBe(2);
    expect(res.eligible).toBe(false);
    expect(res.revenueGenerated).toBeGreaterThan(0);
  });
 
  it('calculates performance bonus eligibility true at 10 deals', async () => {
    const supabase = require('@/lib/supabase/server');
    const now = new Date();
    supabase.__state.perfCommissions = Array.from({ length: 10 }).map((_, i) => ({
      agent_id: 'agent-1',
      commission_type: i % 2 === 0 ? 'upfront' : 'annual_onetime',
      sale_amount: 1000,
      sale_date: now.toISOString(),
    }));
    const res = await calculatePerformanceBonus('agent-1', now.getFullYear(), now.getMonth() + 1);
    expect(res.dealCount).toBe(10);
    expect(res.eligible).toBe(true);
    expect(res.bonusAmount).toBeGreaterThan(0);
  });

  it('gets retention tasks due for an agent', async () => {
    const tasks = await getRetentionTasks('agent-1');
    expect(Array.isArray(tasks.month3Calls)).toBe(true);
    expect(Array.isArray(tasks.month6Checks)).toBe(true);
    expect(Array.isArray(tasks.month12Checks)).toBe(true);
  });
 
  it('gets retention tasks due without agent filter', async () => {
    const tasks = await getRetentionTasks();
    expect(Array.isArray(tasks.month3Calls)).toBe(true);
    expect(Array.isArray(tasks.month6Checks)).toBe(true);
    expect(Array.isArray(tasks.month12Checks)).toBe(true);
  });
});
