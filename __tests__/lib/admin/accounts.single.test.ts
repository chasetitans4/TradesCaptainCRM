import { getCrmAccount, getWebCustomer } from '@/lib/admin/accounts';

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(() => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => ({
            data:
              table === 'crm_accounts'
                ? { id: 'a1', business_name: 'Biz' }
                : { id: 'w1', business_name: 'Web' },
            error: null,
          }),
        }),
      }),
    }),
  })),
}));

describe('admin accounts: single fetch', () => {
  it('gets CRM account by id', async () => {
    const acc = await getCrmAccount('a1');
    expect(acc?.id).toBe('a1');
});

describe('admin accounts: update operations', () => {
  it('cancels, suspends, reactivates, and converts trial to paid', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => {
      const store: any = {
        crm_accounts: [{ id: 'acc1', status: 'trial', is_trial: true }],
      };
      const makeChain = (table: string) => ({
        update: (updates: any) => ({
          eq: (col: string, val: any) => ({
            select: () => ({
              single: () => {
                const row = store[table].find((r: any) => r[col] === val) || { id: val };
                const merged = { ...row, ...updates };
                return { data: merged, error: null };
              },
            }),
          }),
        }),
      });
      return {
        from: (table: string) => makeChain(table),
      };
    });
    const { cancelCrmAccount, suspendCrmAccount, reactivateCrmAccount, convertTrialToPaid } = require('@/lib/admin/accounts');
    const cancelled = await cancelCrmAccount('acc1');
    expect(cancelled.status).toBe('cancelled');
    const suspended = await suspendCrmAccount('acc1');
    expect(suspended.status).toBe('suspended');
    const reactivated = await reactivateCrmAccount('acc1');
    expect(reactivated.status).toBe('active');
    const converted = await convertTrialToPaid('acc1');
    expect(converted.is_trial).toBe(false);
    supabase.createAdminClient = original;
  });
});

  it('gets Web customer by id', async () => {
    const cust = await getWebCustomer('w1');
    expect(cust?.id).toBe('w1');
  });

  it('returns null when CRM single fetch errors', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: () => ({
        select: () => ({
          eq: () => ({ single: () => ({ data: null, error: { message: 'bad' } }) }),
        }),
      }),
    }));
    const acc = await getCrmAccount('missing');
    expect(acc).toBeNull();
    supabase.createAdminClient = original;
  });

  it('returns null when Web single fetch errors', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: () => ({
        select: () => ({
          eq: () => ({ single: () => ({ data: null, error: { message: 'bad' } }) }),
        }),
      }),
    }));
    const cust = await getWebCustomer('missing');
    expect(cust).toBeNull();
    supabase.createAdminClient = original;
  });
});
