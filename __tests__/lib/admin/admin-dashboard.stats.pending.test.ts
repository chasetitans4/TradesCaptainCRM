import { getAdminDashboardStats } from '@/lib/admin/accounts';

jest.mock('@/lib/supabase/server', () => {
  return {
    createAdminClient: jest.fn(() => ({
      from: (table: string) => {
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        if (table === 'crm_accounts') {
          return {
            select: (_fields?: string) => Promise.resolve({
              data: [
                { status: 'active', monthly_amount: 100, created_at: thisMonthStart, is_trial: false, cancelled_at: null },
              ],
              error: null,
            }),
          } as any;
        }
        if (table === 'web_customers') {
          return {
            select: (_fields?: string) => Promise.resolve({
              data: [
                { status: 'active', monthly_amount: 200, created_at: thisMonthStart, cancelled_at: null },
              ],
              error: null,
            }),
          } as any;
        }
        if (table === 'commissions') {
          return {
            select: (_fields?: string) => ({
              eq: (_c: string, _v: any) => Promise.resolve({
                data: [{ commission_amount: 75, status: 'eligible' }],
                error: null,
              }),
            }),
          } as any;
        }
        if (table === 'admin_users') {
          return {
            select: (_f?: string, _opts?: any) => ({
              eq: () => ({ eq: () => Promise.resolve({ count: 2, error: null }) }),
            }),
          } as any;
        }
        return {} as any;
      },
    })),
  };
});

describe('admin accounts: dashboard pending commissions', () => {
  it('computes pending commissions and agent count', async () => {
    const stats = await getAdminDashboardStats();
    expect(stats.pendingCommissions).toBe(75);
    expect(stats.agentCount).toBe(2);
    expect(stats.mrr).toBe(300);
  });
});
