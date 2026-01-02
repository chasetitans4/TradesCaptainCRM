import { getCrmAccounts, getWebCustomers, cancelCrmAccount, suspendCrmAccount, convertTrialToPaid } from '@/lib/admin/accounts';

jest.mock('@/lib/supabase/server', () => {
  const state: any = { eqCalls: [], updates: [] };
  function makeList(items: any[], count: number) {
    return { data: items, error: null, count };
  }
  const crmTable = {
    select: () => crmQuery,
    update: (updates: any) => {
      state.updates.push({ table: 'crm_accounts', updates });
      return {
        eq: () => ({
          select: () => ({
            single: () => ({ data: { id: 'crm-1', ...updates }, error: null }),
          }),
        }),
      };
    },
  };
  const webTable = {
    select: () => webQuery,
  };
  const crmQuery = {
    is: () => crmQuery,
    order: () => crmQuery,
    eq: (c: string, v: any) => {
      state.eqCalls.push([c, v]);
      return crmQuery;
    },
    or: () => crmQuery,
    range: () => makeList([{ id: 'crm-1', status: 'active' }], 1),
  };
  const webQuery = {
    is: () => webQuery,
    order: () => webQuery,
    eq: (c: string, v: any) => {
      state.eqCalls.push([c, v]);
      return webQuery;
    },
    or: () => webQuery,
    range: () => makeList([{ id: 'web-1', status: 'active' }], 1),
  };
  return {
    createAdminClient: jest.fn(() => ({
      from: (table: string) => {
        if (table === 'crm_accounts') return crmTable as any;
        if (table === 'web_customers') return webTable as any;
        return {} as any;
      },
    })),
    __state: state,
  };
});

describe('admin accounts: filters and lifecycle', () => {
  it('filters CRM accounts by status, planType, and search', async () => {
    const res = await getCrmAccounts({ status: 'active' as any, planType: 'blue_starter', search: 'Biz' });
    expect(res.total).toBe(1);
    const { __state } = require('@/lib/supabase/server');
    expect(__state.eqCalls.some(([c, v]: any[]) => c === 'status' && v === 'active')).toBe(true);
    expect(__state.eqCalls.some(([c, v]: any[]) => c === 'plan_type' && v === 'blue_starter')).toBe(true);
  });

  it('filters Web customers by status and planType', async () => {
    const res = await getWebCustomers({ status: 'active' as any, planType: 'web_starter' });
    expect(res.total).toBe(1);
    const { __state } = require('@/lib/supabase/server');
    expect(__state.eqCalls.some(([c, v]: any[]) => c === 'status' && v === 'active')).toBe(true);
  });
  it('filters Web customers by search and agentId', async () => {
    const res = await getWebCustomers({ agentId: 'agent-1', search: 'Biz' });
    expect(res.total).toBe(1);
    const { __state } = require('@/lib/supabase/server');
    expect(__state.eqCalls.some(([c, v]: any[]) => c === 'agent_id' && v === 'agent-1')).toBe(true);
  });

  it('filters CRM accounts by agentId', async () => {
    const res = await getCrmAccounts({ agentId: 'agent-9' });
    expect(res.total).toBe(1);
    const { __state } = require('@/lib/supabase/server');
    expect(__state.eqCalls.some(([c, v]: any[]) => c === 'agent_id' && v === 'agent-9')).toBe(true);
  });

  it('throws when getCrmAccounts query errors', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: () => ({
        select: () => ({
          is: () => ({
            order: () => ({
              eq: () => ({
                or: () => ({
                  range: () => ({ data: null, error: new Error('bad'), count: 0 }),
                }),
              }),
            }),
          }),
        }),
      }),
    }));
    await expect(getCrmAccounts({ search: 'x' })).rejects.toBeTruthy();
    supabase.createAdminClient = original;
  });

  it('throws when getWebCustomers query errors', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: () => ({
        select: () => ({
          is: () => ({
            order: () => ({
              eq: () => ({
                or: () => ({
                  range: () => ({ data: null, error: new Error('bad'), count: 0 }),
                }),
              }),
            }),
          }),
        }),
      }),
    }));
    await expect(getWebCustomers({ search: 'x' })).rejects.toBeTruthy();
    supabase.createAdminClient = original;
  });

  it('cancels CRM account sets cancelled_at and status', async () => {
    const res = await cancelCrmAccount('crm-1');
    expect(res.status).toBe('cancelled');
    expect(res.cancelled_at).toBeTruthy();
  });

  it('suspends CRM account', async () => {
    const res = await suspendCrmAccount('crm-1');
    expect(res.status).toBe('suspended');
  });

  it('converts trial to paid', async () => {
    const res = await convertTrialToPaid('crm-1');
    expect(res.status).toBe('active');
    expect(res.is_trial).toBe(false);
  });

  it('updates a web customer via updateWebCustomer', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: (table: string) => {
        if (table === 'web_customers') {
          return {
            update: (updates: any) => ({
              eq: (_col: string, _val: any) => ({
                select: () => ({
                  single: () => ({ data: { id: 'web-2', ...updates }, error: null }),
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      },
    }));
    const mod = require('@/lib/admin/accounts');
    const updated = await mod.updateWebCustomer('web-2', { status: 'paused' });
    expect(updated.status).toBe('paused');
    expect(updated.updated_at).toBeTruthy();
    supabase.createAdminClient = original;
  });

  it('cancels a web customer and revokes promos', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: (table: string) => {
        if (table === 'crm_accounts') {
          return {
            update: (_u: any) => ({
              eq: (_c: string, _v: any) => ({
                eq: (_c2: string, _v2: any) => ({}),
              }),
            }),
          } as any;
        }
        if (table === 'crm_coupons') {
          return {
            update: (_u: any) => ({
              eq: (_c: string, _v: any) => ({
                eq: (_c2: string, _v2: any) => ({}),
              }),
            }),
          } as any;
        }
        if (table === 'web_customers') {
          return {
            update: (updates: any) => ({
              eq: (_c: string, _v: any) => ({
                select: () => ({
                  single: () => ({ data: { id: 'web-3', ...updates }, error: null }),
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      },
    }));
    const mod = require('@/lib/admin/accounts');
    const res = await mod.cancelWebCustomer('web-3');
    expect(res.status).toBe('cancelled');
    expect(res.cancelled_at).toBeTruthy();
    supabase.createAdminClient = original;
  });

  it('computes agent dashboard stats with no data defaults', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: (table: string) => {
        if (table === 'tc_leads') {
          return {
            select: (_fields?: any, _opts?: any) => ({
              eq: (_c: string, _v: any) => ({
                not: (_c2: string, _op: string, _list: string) => ({ count: 0 }),
              }),
            }),
          } as any;
        }
        return {
          select: (fields?: any, _opts?: any) => ({
            eq: (_c: string, _v: any) => {
              if (fields === 'monthly_amount') {
                return { gte: () => ({ data: [] }) };
              }
              if (fields === 'status') {
                return { data: [] };
              }
              return { gte: () => ({ data: [] }) };
            },
            is: () => ({ data: [] }),
          }),
        } as any;
      },
    }));
    const mod = require('@/lib/admin/accounts');
    const res = await mod.getAgentDashboardStats('agent-1');
    expect(res.dealsThisMonth).toBe(0);
    expect(res.revenueThisMonth).toBe(0);
    expect(res.commissionsEligible).toBe(0);
    expect(res.commissionsPaidYtd).toBe(0);
    expect(res.activeLeads).toBe(0);
    expect(res.retentionRate).toBe(100);
    supabase.createAdminClient = original;
  });

  it('computes agent dashboard stats with mixed data', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const ytdStart = new Date(now.getFullYear(), 0, 1).toISOString();
    supabase.createAdminClient = jest.fn(() => ({
      from: (table: string) => {
        if (table === 'crm_accounts') {
          return {
            select: (fields?: any) => ({
              eq: (_c: string, _v: any) => {
                if (fields === 'monthly_amount') {
                  return {
                    gte: (_c2: string, _v2: string) => ({
                      data: [{ monthly_amount: 200 }],
                    }),
                  };
                }
                if (fields === 'status') {
                  return { data: [{ status: 'active' }, { status: 'cancelled' }] };
                }
                return { gte: (_c2: string, _v2: string) => ({ data: [{ monthly_amount: 200 }] }) };
              },
            }),
          } as any;
        }
        if (table === 'web_customers') {
          return {
            select: (fields?: any) => ({
              eq: (_c: string, _v: any) => ({
                gte: (_c2: string, _v2: string) => ({
                  data: [{ monthly_amount: 150 }],
                }),
              }),
            }),
          } as any;
        }
        if (table === 'commissions') {
          return {
            select: (_fields?: any) => ({
              eq: (_c: string, _v: any) => ({
                data: [
                  { commission_amount: 50, status: 'eligible' },
                  { commission_amount: 75, status: 'paid', paid_at: ytdStart },
                ],
              }),
            }),
          } as any;
        }
        if (table === 'tc_leads') {
          return {
            select: (_fields?: any, _opts?: any) => ({
              eq: (_c: string, _v: any) => ({
                not: (_c2: string, _op: string, _list: string) => ({ count: 3 }),
              }),
            }),
          } as any;
        }
        return {} as any;
      },
    }));
    const mod = require('@/lib/admin/accounts');
    const res = await mod.getAgentDashboardStats('agent-2');
    expect(res.dealsThisMonth).toBe(2);
    expect(res.revenueThisMonth).toBe(350);
    expect(res.commissionsEligible).toBe(50);
    expect(res.commissionsPaidYtd).toBe(75);
    expect(res.activeLeads).toBe(3);
    expect(res.retentionRate).toBe(50);
    supabase.createAdminClient = original;
  });
});
