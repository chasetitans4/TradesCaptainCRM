import * as Admin from '@/lib/admin';

jest.mock('@/lib/supabase/server', () => {
  const accounts = [
    { id: 'a1', plan_status: 'active', monthly_price: 99, is_trial: false, trial_converted: false },
    { id: 'a2', plan_status: 'trial', monthly_price: 0, is_trial: true, trial_end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), trial_converted: false, plan_type: 'blue_pro' },
    { id: 'a3', plan_status: 'cancelled', monthly_price: 0, is_trial: false, trial_converted: false },
    { id: 'a4', plan_status: 'active', monthly_price: 49, is_trial: false, trial_converted: true, plan_type: 'blue_starter' },
    { id: 'a5', plan_status: 'active', monthly_price: 149, is_trial: false, trial_converted: false, plan_type: 'blue_enterprise' },
  ];
  const founders = { total_slots: 100, slots_used: 5, is_open: true, id: 'founders-1' };
  return {
    createClient: jest.fn(() => ({
      from: (table: string) => {
        if (table === 'crm_accounts') {
          return {
            select: () => ({ data: accounts, error: null }),
          } as any;
        }
        if (table === 'founders_program') {
          return {
            select: () => ({ single: () => ({ data: founders, error: null }) }),
            insert: () => ({ select: () => ({ single: () => ({ data: founders, error: null }) }) }),
            update: () => ({ eq: () => ({}) }),
          } as any;
        }
        if (table === 'agent_submissions') {
          return {
            select: (_: any, opts: any) => ({
              in: () => ({ count: opts?.count === 'exact' ? 2 : undefined }),
            }),
          } as any;
        }
        if (table === 'admin_activity_log') {
          return { insert: () => ({}) } as any;
        }
        return {} as any;
      },
    })),
  };
});

describe('admin index: misc helpers', () => {
  it('validates web invoice format', async () => {
    const invalid = await Admin.validateWebInvoice('BAD-123');
    expect(invalid.valid).toBe(false);
    const valid = await Admin.validateWebInvoice('WEB-123');
    expect(valid.valid).toBe(true);
    expect(valid.planStatus).toBe('active');
  });

  it('creates and validates impersonation token', async () => {
    const token = await Admin.createImpersonationToken('admin-1', 'acc-1');
    expect(token.startsWith('imp_')).toBe(true);
    const res = await Admin.validateImpersonationToken(token);
    expect(res.valid).toBe(true);
    expect(res.adminId).toBe('admin-1');
    expect(res.accountId).toBe('acc-1');
  });

  it('rejects expired impersonation token', async () => {
    const payload = Buffer.from(JSON.stringify({ accountId: 'acc-x', adminId: 'admin-x', expires: new Date(Date.now() - 1000).toISOString() })).toString('base64');
    const res = await Admin.validateImpersonationToken(`imp_${payload}`);
    expect(res.valid).toBe(false);
  });

  it('computes dashboard stats', async () => {
    const stats = await Admin.getDashboardStats();
    expect(stats.totalAccounts).toBe(5);
    expect(stats.activePaying).toBe(3);
    expect(stats.trialsEndingSoon).toBe(1);
    expect(stats.foundersRemaining).toBe(95);
    expect(stats.mrr).toBe(297);
    expect(stats.trialConversionRate).toBe(50);
    expect(stats.churnRate).toBe(20);
    expect(stats.pendingSubmissions).toBe(2);
  });
});
