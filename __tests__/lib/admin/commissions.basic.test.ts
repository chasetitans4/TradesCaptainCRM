import * as commissions from '@/lib/admin/commissions';

jest.mock('@/lib/supabase/server', () => {
  const state: any = { lastUpdate: null };
  const rulesTable = {
    select: () => rulesQuery,
  };
  const rulesQuery = {
    eq: () => rulesQuery,
    order: () => rulesQuery,
    limit: () => rulesQuery,
    single: () => ({
      data: {
        plan_type: 'blue_starter',
        plan_tier: 'individual',
        billing_interval: 'month',
        upfront_amount: 100,
        recurring_rate: 0.1,
        annual_rate: 0.35,
        month_3_call_bonus: 25,
        is_active: true,
      },
      error: null,
    }),
  };
  const commissionsTable = {
    insert: (data: any) => ({
      select: () => ({
        single: () => ({ data: { id: 'c1', ...data }, error: null }),
      }),
    }),
    update: (updates: any) => {
      state.lastUpdate = updates;
      const chain = {
        eq: () => chain,
        in: () => chain,
        select: () => ({
          single: () => ({ data: { id: 'c1', ...updates }, error: null }),
        }),
      };
      return chain;
    },
  };
  return {
    createAdminClient: jest.fn(() => ({
      from: (table: string) => {
        if (table === 'commission_rules') return rulesTable as any;
        if (table === 'commissions') return commissionsTable as any;
        return {} as any;
      },
    })),
    __state: state,
  };
});

describe('admin commissions: rules and lifecycle', () => {
  it('fetches commission rules for plan', async () => {
    const rules = await commissions.getCommissionRules('blue_starter', 'month', 'individual');
    expect(rules?.upfront_amount).toBe(100);
    expect(rules?.recurring_rate).toBe(0.1);
  });
 
  it('fetches commission rules without plan tier', async () => {
    const rules = await commissions.getCommissionRules('blue_starter', 'month');
    expect(rules).toBeTruthy();
    expect(rules?.plan_type).toBe('blue_starter');
  });

  it('marks commission eligible', async () => {
    await commissions.markCommissionEligible('c1');
    const { __state } = require('@/lib/supabase/server');
    expect(__state.lastUpdate.status).toBe('eligible');
    expect(__state.lastUpdate.eligible_at).toBeTruthy();
  });

  it('approves commission', async () => {
    const res = await commissions.approveCommission('c1', 'admin-1');
    expect(res.status).toBe('approved');
    expect(res.approved_by).toBe('admin-1');
  });
 
  it('createUpfrontCommission throws when upfront_amount missing', async () => {
    const rules: any = {
      plan_type: 'blue_starter',
      plan_tier: 'individual',
      billing_interval: 'month',
      // upfront_amount omitted intentionally
    };
    await expect(
      commissions.createUpfrontCommission('agent-1', 'acc-1', 'crm', 'sub-1', rules, 1000, new Date())
    ).rejects.toThrow('No upfront amount defined for this plan');
  });

  it('creates recurring commission and flags eligible', async () => {
    const rules: any = {
      plan_type: 'blue_starter',
      plan_tier: 'individual',
      billing_interval: 'month',
      recurring_rate: 0.1,
    };
    const commission = await commissions.createRecurringCommission(
      'agent-1',
      'acc-1',
      'crm',
      'sub-1',
      rules,
      200,
      3,
      new Date()
    );
    expect(commission.commission_type).toBe('recurring');
    const { __state } = require('@/lib/supabase/server');
    expect(__state.lastUpdate.status).toBe('eligible');
  });
});
