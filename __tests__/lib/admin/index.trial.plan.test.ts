import { extendTrial, convertTrialToPaid, changePlan } from '@/lib/admin/index';

jest.mock('@/lib/supabase/server', () => {
  const build = () => {
    const m: any = (globalThis as any).__admTrialMock || {};
    return {
      from: (table: string) => {
        const base = (m[table] || []).slice();
        const ctx: any = { updates: null, eqs: {} };
        const chain: any = {
          select: (_fields?: string) => chain,
          update: (updates: any) => { ctx.updates = updates; return chain; },
          eq: (col: string, val: any) => { ctx.eqs[col] = val; return chain; },
          single: () => {
            if (table === 'crm_accounts') {
              if (ctx.updates) {
                const record = { id: ctx.eqs['id'], ...ctx.updates };
                return { data: record, error: null };
              }
              const rows = base.filter(r => (ctx.eqs['id'] ? r.id === ctx.eqs['id'] : true));
              return { data: rows[0] || null, error: null };
            }
            return { data: null, error: null };
          },
        };
        return chain;
      },
    };
  };
  return { createClient: jest.fn(() => build()) };
});

describe('admin index: trial and plan updates', () => {
  beforeEach(() => { (globalThis as any).__admTrialMock = {}; });

  it('extendTrial updates trial_end_date when account on trial', async () => {
    (globalThis as any).__admTrialMock = {
      crm_accounts: [{ id: 'acc1', is_trial: true, trial_end_date: new Date().toISOString() }],
    };
    const res = await extendTrial('acc1', 7);
    expect(res.trial_end_date).toBeTruthy();
  });

  it('extendTrial throws when account not on trial', async () => {
    (globalThis as any).__admTrialMock = {
      crm_accounts: [{ id: 'acc2', is_trial: false, trial_end_date: null }],
    };
    await expect(extendTrial('acc2', 7)).rejects.toThrow(/not on trial/);
  });

  it('convertTrialToPaid updates status and flags', async () => {
    (globalThis as any).__admTrialMock = {
      crm_accounts: [{ id: 'acc3', is_trial: true, plan_type: 'blue_starter' }],
    };
    const res = await convertTrialToPaid('acc3');
    expect(res.plan_status).toBe('active');
    expect(res.is_trial).toBe(false);
    expect(res.trial_converted).toBe(true);
    expect(res.next_billing_date).toBeTruthy();
  });

  it('changePlan updates plan_type and monthly_price', async () => {
    (globalThis as any).__admTrialMock = {
      crm_accounts: [{ id: 'acc4' }],
    };
    const res = await changePlan('acc4', 'blue_pro' as any);
    expect(res.plan_type).toBe('blue_pro');
    expect(res.monthly_price).toBeTruthy();
  });
});
