import { getAdminDashboardStats } from '@/lib/admin/accounts';

jest.mock('@/lib/supabase/server', () => {
  return {
    createAdminClient: jest.fn(() => ({
      from: (table: string) => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        if (table === 'crm_accounts') {
          return {
            select: (fields?: string) => ({
              is: (_c: string, _v: any) => ({
                data: [
                  { status: 'active', monthly_amount: 100, created_at: start, is_trial: false, trial_converted: true },
                  { status: 'active', monthly_amount: 200, created_at: start, is_trial: true, trial_converted: false },
                ],
              }),
            }),
          } as any;
        }
        if (table === 'web_customers') {
          return {
            select: (fields?: string) => ({
              is: (_c: string, _v: any) => ({
                data: [],
              }),
            }),
          } as any;
        }
        if (table === 'commissions') {
          return { select: () => ({ eq: () => ({ data: [] }) }) } as any;
        }
        if (table === 'admin_users') {
          return { select: (_f?: string, _o?: any) => ({ eq: () => ({ eq: () => ({ count: 1 }) }) }) } as any;
        }
        return {} as any;
      },
    })),
  };
});

describe('admin accounts: dashboard conversions', () => {
  it('computes trialConversionRate > 0 when conversions exist', async () => {
    const stats = await getAdminDashboardStats();
    expect(stats.trialConversionRate).toBeGreaterThan(0);
    expect(stats.mrr).toBe(300);
  });
});
