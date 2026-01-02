import { getAdminDashboardStats } from '@/lib/admin/accounts';

jest.mock('@/lib/supabase/server', () => {
  return {
    createAdminClient: jest.fn(() => ({
      from: (table: string) => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        if (table === 'crm_accounts') {
          return {
            select: (fields?: string) => ({
              is: () => ({
                data: [
                  { status: 'trial', is_trial: true, monthly_amount: 0, created_at: startOfMonth },
                  { status: 'paused', is_trial: false, monthly_amount: 150, created_at: startOfMonth },
                ],
              }),
            }),
          } as any;
        }
        if (table === 'web_customers') {
          return {
            select: (fields?: string) => ({
              is: () => ({
                data: [
                  { status: 'cancelled', monthly_amount: 0, created_at: startOfMonth, cancelled_at: startOfMonth },
                ],
              }),
            }),
          } as any;
        }
        if (table === 'commissions') {
          return {
            select: (fields?: string) => ({
              eq: () => ({ data: [] }),
            }),
          } as any;
        }
        if (table === 'admin_users') {
          return {
            select: (_fields?: string, _opts?: any) => ({ eq: () => ({ eq: () => ({ count: 1 }) }) }),
          } as any;
        }
        return {} as any;
      },
    })),
  };
});

describe('admin accounts: dashboard additional branches', () => {
  it('computes trialConversionRate 0 with trials and no conversions; churn web-only; pending commissions 0', async () => {
    const stats = await getAdminDashboardStats();
    expect(stats.trialConversionRate).toBe(0);
    expect(stats.churnedThisMonth).toBe(1);
    expect(stats.pendingCommissions).toBe(0);
  });
});
