import { getPendingCommissions, getAgentCommissionSummary } from '@/lib/admin/commissions';

jest.mock('@/lib/supabase/server', () => {
  const state: any = { lastQuery: null };
  return {
    createAdminClient: jest.fn(() => ({
      from: (table: string) => {
        if (table === 'commissions') {
          return {
            select: (fields?: string, _opts?: any) => {
              if (fields?.includes('status, commission_amount, paid_at')) {
                return {
                  eq: () => Promise.resolve({
                    data: [
                      { status: 'pending', commission_amount: 10 },
                      { status: 'eligible', commission_amount: 20 },
                      { status: 'paid', commission_amount: 30, paid_at: new Date().toISOString() },
                      { status: 'paid', commission_amount: 40, paid_at: new Date(new Date().getFullYear() - 1, 1, 1).toISOString() },
                    ],
                    error: null,
                  }),
                };
              }
              return {
                eq: () => ({
                  order: () => Promise.resolve({ data: [{ id: 'c1' }, { id: 'c2' }], error: null }),
                }),
              };
            },
            order: () => Promise.resolve({ data: [{ id: 'c1' }, { id: 'c2' }], error: null }),
          } as any;
        }
        return {} as any;
      },
    })),
    __state: state,
  };
});

describe('admin commissions: summary and pending', () => {
  it('fetches pending commissions', async () => {
    const res = await getPendingCommissions();
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(2);
  });
 
  it('getPendingCommissions returns empty array when query errors', async () => {
    // Note: getPendingCommissions handles errors gracefully and returns []
    // instead of throwing, to support cases where the table might not exist
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient.getMockImplementation
      ? supabase.createAdminClient.getMockImplementation()
      : undefined;
    supabase.createAdminClient.mockImplementation(() => ({
      from: (_table: string) => ({
        select: (_fields?: string, _opts?: any) => ({
          eq: () => ({
            order: () => Promise.resolve({ data: null, error: new Error('bad') }),
          }),
        }),
      }),
    }));
    const result = await getPendingCommissions();
    expect(result).toEqual([]);
    if (original) supabase.createAdminClient.mockImplementation(original);
  });

  it('computes agent commission summary', async () => {
    const summary = await getAgentCommissionSummary('agent-1');
    expect(summary.pending).toBe(10);
    expect(summary.eligible).toBe(20);
    expect(summary.paidThisMonth).toBeGreaterThanOrEqual(30);
    expect(summary.paidYtd).toBeGreaterThanOrEqual(30);
    expect(summary.totalEarned).toBeGreaterThanOrEqual(70);
  });
});
