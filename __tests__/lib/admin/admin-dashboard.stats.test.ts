import { getAdminDashboardStats, getAgentDashboardStats } from '@/lib/admin/accounts';

jest.mock('@/lib/supabase/server', () => {
  const statsState: any = {};
  return {
    createAdminClient: jest.fn(() => ({
      from: (table: string) => {
        if (table === 'crm_accounts') {
          return {
            select: (fields?: string) => {
              if (fields?.includes('status, monthly_amount, created_at, is_trial, cancelled_at')) {
                const now = new Date();
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 10);
                return {
                  is: () => ({
                    data: [
                      { status: 'active', monthly_amount: 100, created_at: lastMonth.toISOString(), is_trial: false },
                      { status: 'trial', monthly_amount: 0, created_at: new Date().toISOString(), is_trial: true, trial_end_date: new Date().toISOString() },
                      { status: 'cancelled', monthly_amount: 0, created_at: lastMonth.toISOString(), is_trial: false, cancelled_at: new Date().toISOString() },
                    ],
                  }),
                };
              }
              // getAgentDashboardStats: select('monthly_amount') and select('status')
              return {
                eq: () => ({
                  gte: () => ({ data: [{ monthly_amount: 99 }] }),
                }),
              };
            },
          } as any;
        }
        if (table === 'web_customers') {
          return {
            select: (fields?: string) => {
              if (fields?.includes('status, monthly_amount, created_at, cancelled_at')) {
                return {
                  is: () => ({
                    data: [
                      { status: 'active', monthly_amount: 200, created_at: new Date().toISOString() },
                      { status: 'cancelled', monthly_amount: 0, created_at: new Date().toISOString(), cancelled_at: new Date().toISOString() },
                    ],
                  }),
                };
              }
              return {
                eq: () => ({
                  gte: () => ({ data: [{ monthly_amount: 49 }] }),
                }),
              };
            },
          } as any;
        }
        if (table === 'commissions') {
          return {
            select: (fields?: string) => {
              if (fields === 'commission_amount') {
                return {
                  eq: () => ({ data: [{ commission_amount: 50 }, { commission_amount: 75 }] }),
                };
              }
              return {
                eq: () => ({
                  data: [
                    { commission_amount: 20, status: 'eligible' },
                    { commission_amount: 30, status: 'paid', paid_at: new Date().toISOString() },
                    { commission_amount: 40, status: 'paid', paid_at: new Date(new Date().getFullYear() - 1, 1, 1).toISOString() },
                  ],
                }),
              };
            },
          } as any;
        }
        if (table === 'admin_users') {
          return {
            select: (_fields?: string, opts?: any) => ({
              eq: () => ({
                eq: () => ({ count: 3 }),
              }),
            }),
          } as any;
        }
        if (table === 'tc_leads') {
          return {
            select: (_fields?: string, opts?: any) => ({
              eq: () => ({
                not: () => ({ count: 5 }),
              }),
            }),
          } as any;
        }
        return {} as any;
      },
    })),
    __state: statsState,
  };
});

describe('admin accounts: dashboard stats', () => {
  it('computes admin dashboard metrics', async () => {
    const stats = await getAdminDashboardStats();
    expect(stats.mrr).toBe(300);
    expect(typeof stats.mrrChange).toBe('number');
    expect(stats.activeCrmAccounts).toBe(1);
    expect(stats.activeWebCustomers).toBe(1);
    expect(typeof stats.trialConversionRate).toBe('number');
    expect(typeof stats.newThisMonth).toBe('number');
    expect(typeof stats.churnedThisMonth).toBe('number');
    expect(stats.pendingCommissions).toBe(125);
    expect(stats.agentCount).toBe(3);
  });

  it('computes agent dashboard metrics', async () => {
    const stats = await getAgentDashboardStats('agent-1');
    expect(stats.dealsThisMonth).toBeGreaterThan(0);
    expect(stats.revenueThisMonth).toBeGreaterThan(0);
    expect(stats.commissionsEligible).toBeGreaterThanOrEqual(20);
    expect(stats.commissionsPaidYtd).toBeGreaterThanOrEqual(30);
    expect(stats.activeLeads).toBe(5);
    expect(typeof stats.retentionRate).toBe('number');
    expect(stats.dealProgress.goal).toBe(10);
  });
});

describe('admin accounts: dashboard stats additional branches', () => {
  it('computes admin metrics when lastMonthCrmActive is zero (mrrChange=0)', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 5).toISOString();
    supabase.createAdminClient = jest.fn(() => ({
      from: (table: string) => {
        if (table === 'crm_accounts') {
          return {
            select: (fields?: string) => ({
              is: (_c: string, _v: any) => ({
                data: [
                  { status: 'active', monthly_amount: 100, created_at: thisMonth, is_trial: false },
                ],
              }),
            }),
          } as any;
        }
        if (table === 'web_customers') {
          return {
            select: (fields?: string) => ({
              is: (_c: string, _v: any) => ({
                data: [
                  { status: 'active', monthly_amount: 50, created_at: thisMonth },
                ],
              }),
            }),
          } as any;
        }
        if (table === 'commissions') {
          return { select: () => ({ eq: () => ({ data: [] }) }) } as any;
        }
        if (table === 'admin_users') {
          return { select: (_f: string, _o: any) => ({ eq: () => ({ eq: () => ({ count: 0 }) }) }) } as any;
        }
        return {} as any;
      },
    }));
    const { getAdminDashboardStats } = require('@/lib/admin/accounts');
    const stats = await getAdminDashboardStats();
    expect(stats.mrr).toBe(150);
    expect(stats.mrrChange).toBe(0);
    expect(stats.trialConversionRate).toBe(0);
    supabase.createAdminClient = original;
  });
});
