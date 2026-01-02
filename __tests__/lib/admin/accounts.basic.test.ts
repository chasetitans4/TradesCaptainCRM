import { createCrmAccount, reactivateCrmAccount, updateCrmAccount } from '@/lib/admin/accounts';

jest.mock('@/lib/supabase/server', () => {
  const state: any = { lastInsert: null, lastUpdate: null, accountId: 'acc1' };
  const crmTable = {
    insert: (data: any) => {
      state.lastInsert = data;
      return {
        select: () => ({
          single: () => ({ data: { id: state.accountId, ...data }, error: null }),
        }),
      };
    },
    update: (updates: any) => {
      state.lastUpdate = updates;
      return {
        eq: () => ({
          select: () => ({
            single: () => ({ data: { id: state.accountId, ...updates }, error: null }),
          }),
        }),
      };
    },
  };
  return {
    createAdminClient: jest.fn(() => ({
      from: (table: string) => {
        if (table === 'crm_accounts') return crmTable as any;
        return {} as any;
      },
    })),
  };
});

describe('admin accounts: create/reactivate CRM account', () => {
  it('creates CRM account with trial status when isTrial true', async () => {
    const account = await createCrmAccount(
      {
        business_name: 'Biz',
        contact_name: 'Owner',
        email: 'owner@example.com',
        plan_type: 'blue_starter',
        billing_interval: 'month',
      } as any,
      'agent-1',
      { isTrial: true }
    );
    expect(account.status).toBe('trial');
    expect(account.trial_ends_at).toBeTruthy();
  });

  it('computes monthly_amount from annual pricing for yearly billing', async () => {
    const account = await createCrmAccount(
      {
        business_name: 'Biz',
        contact_name: 'Owner',
        email: 'owner@example.com',
        plan_type: 'blue_starter',
        billing_interval: 'year',
      } as any,
      'agent-1',
      {}
    );
    expect(account.monthly_amount).toBeCloseTo(441 / 12, 5);
  });

  it('reactivates cancelled CRM account', async () => {
    const account = await reactivateCrmAccount('acc1');
    expect(account.status).toBe('active');
    expect(account.cancelled_at).toBeUndefined();
  });

  it('throws for unknown plan type without custom quote', async () => {
    await expect(
      createCrmAccount(
        {
          business_name: 'Biz',
          contact_name: 'Owner',
          email: 'owner@example.com',
          plan_type: 'unknown_plan',
          billing_interval: 'month',
        } as any,
        'agent-1',
        {}
      )
    ).rejects.toThrow('Unknown plan type: unknown_plan');
  });

  it('creates CRM account with free_with_web promo sets promo_ends_at', async () => {
    const account = await createCrmAccount(
      {
        business_name: 'Biz',
        contact_name: 'Owner',
        email: 'owner@example.com',
        plan_type: 'blue_starter',
        billing_interval: 'month',
      } as any,
      'agent-1',
      { promoType: 'free_with_web' }
    );
    expect(account.promo_type).toBe('free_with_web');
    expect(typeof account.promo_ends_at).toBe('string');
  });

  it('sets plan_tier teams when plan_type includes teams', async () => {
    const account = await createCrmAccount(
      {
        business_name: 'Biz',
        contact_name: 'Owner',
        email: 'owner@example.com',
        plan_type: 'blue_starter_teams',
        billing_interval: 'month',
      } as any,
      'agent-1',
      {}
    );
    expect(account.plan_tier).toBe('teams');
  });

  it('sets plan_tier custom when plan_type includes custom', async () => {
    const account = await createCrmAccount(
      {
        business_name: 'Biz',
        contact_name: 'Owner',
        email: 'owner@example.com',
        plan_type: 'custom_enterprise',
        billing_interval: 'month',
        custom_quote_amount: 1000,
      } as any,
      'agent-1',
      {}
    );
    expect(account.plan_tier).toBe('custom');
  });

  it('throws when updateCrmAccount returns error', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: () => ({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => ({ data: null, error: { message: 'bad' } }),
            }),
          }),
        }),
      }),
    }));
    await expect(updateCrmAccount('acc1', { status: 'active' } as any)).rejects.toBeTruthy();
    supabase.createAdminClient = original;
  });
});
