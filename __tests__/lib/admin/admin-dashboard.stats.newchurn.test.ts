import { getAdminDashboardStats } from '@/lib/admin/accounts';

jest.mock('@/lib/supabase/server', () => {
  return {
    createAdminClient: jest.fn(() => ({
      from: (table: string) => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 2).toISOString();
        if (table === 'crm_accounts') {
          return {
            select: (fields?: string) => ({
              is: (_c: string, _v: any) => ({
                data: [
                  { status: 'active', monthly_amount: 100, created_at: start, is_trial: false, cancelled_at: null },
                  { status: 'cancelled', monthly_amount: 0, created_at: start, is_trial: false, cancelled_at: start },
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
                  { status: 'active', monthly_amount: 50, created_at: start, cancelled_at: null },
                  { status: 'cancelled', monthly_amount: 0, created_at: start, cancelled_at: start },
                ],
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

describe('admin accounts: dashboard new and churn', () => {
  it('computes newThisMonth and churnedThisMonth counts', async () => {
    const stats = await getAdminDashboardStats();
    expect(stats.newThisMonth).toBeGreaterThanOrEqual(2);
    expect(stats.churnedThisMonth).toBeGreaterThanOrEqual(2);
    expect(stats.mrr).toBe(150);
  });
});
