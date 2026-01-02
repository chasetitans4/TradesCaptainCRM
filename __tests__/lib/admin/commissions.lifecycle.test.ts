import { approveCommission, batchApproveCommissions, markCommissionPaid, batchPayCommissions, forfeitCommission, forfeitSubscriptionCommissions } from '@/lib/admin/commissions';

jest.mock('@/lib/supabase/server', () => {
  const state: any = { updates: [], lastSelect: null };
  const commissionsTable = {
    update: (updates: any) => {
      state.updates.push(updates);
      const chain = {
        eq: () => chain,
        in: () => chain,
        select: () => ({
          single: () => ({ data: { id: 'c1', ...updates }, error: null }),
        }),
      };
      return chain;
    },
    select: () => ({
      eq: () => ({
        select: () => ({
          single: () => ({ data: { id: 'c1' }, error: null }),
        }),
      }),
    }),
  };
  return {
    createAdminClient: jest.fn(() => ({
      from: (table: string) => {
        if (table === 'commissions') return commissionsTable as any;
        return {} as any;
      },
    })),
    __state: state,
  };
});

describe('admin commissions: lifecycle functions', () => {
  it('approves commission', async () => {
    const res = await approveCommission('c1', 'admin-1');
    expect(res.status).toBe('approved');
    expect(res.approved_by).toBe('admin-1');
  });
 
  it('approveCommission throws when update select returns error', async () => {
    const supabase = require('@/lib/supabase/server');
    const client = supabase.createAdminClient();
    const table = client.from('commissions');
    const spy = jest.spyOn(table, 'update').mockImplementation((_updates: any) => {
      return {
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: () => ({ data: null, error: new Error('bad') }),
            }),
          }),
        }),
      } as any;
    });
    await expect(approveCommission('c1', 'admin-1')).rejects.toBeTruthy();
    spy.mockRestore();
  });

  it('batch approves commissions', async () => {
    const res = await batchApproveCommissions(['c1', 'c2'], 'admin-1');
    expect(res.success).toBe(2);
  });

  it('marks commission paid', async () => {
    const res = await markCommissionPaid('c1', 'manual', 'ref');
    expect(res.status).toBe('paid');
    expect(res.paid_via).toBe('manual');
    expect(res.payment_reference).toBe('ref');
  });
 
  it('markCommissionPaid throws when update select returns error', async () => {
    const supabase = require('@/lib/supabase/server');
    const client = supabase.createAdminClient();
    const table = client.from('commissions');
    const spy = jest.spyOn(table, 'update').mockImplementation((_updates: any) => {
      return {
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: () => ({ data: null, error: new Error('bad') }),
            }),
          }),
        }),
      } as any;
    });
    await expect(markCommissionPaid('c1', 'manual', 'ref')).rejects.toBeTruthy();
    spy.mockRestore();
  });

  it('batch pays commissions', async () => {
    const res = await batchPayCommissions(['c1', 'c2'], 'manual', 'ref');
    expect(res.success).toBe(2);
    expect(res.totalAmount).toBeGreaterThanOrEqual(0);
  });
 
  it('batch pays commissions counts failures when underlying update throws', async () => {
    const supabase = require('@/lib/supabase/server');
    const client = supabase.createAdminClient();
    const table = client.from('commissions');
    const originalUpdate = table.update;
    jest.spyOn(table, 'update').mockImplementationOnce((_updates: any) => {
      throw new Error('fail');
    });
    jest.spyOn(table, 'update').mockImplementationOnce((updates: any) => {
      const chain: any = {
        eq: () => chain,
        select: () => ({
          single: () => ({ data: { id: 'c2', commission_amount: 50, ...updates }, error: null }),
        }),
      };
      return chain;
    });
    const res = await batchPayCommissions(['c1', 'c2'], 'manual', 'ref');
    expect(res.failed).toBe(1);
    expect(res.success).toBe(1);
    expect(res.totalAmount).toBe(50);
    table.update = originalUpdate;
  });

  it('forfeits commission', async () => {
    await forfeitCommission('c1', 'customer_cancelled');
    const { __state } = require('@/lib/supabase/server');
    const last = __state.updates[__state.updates.length - 1];
    expect(last.status).toBe('forfeited');
    expect(last.forfeiture_reason).toBe('customer_cancelled');
  });

  it('forfeits subscription commissions returns count', async () => {
    const supabase = require('@/lib/supabase/server');
    const client = supabase.createAdminClient();
    const table = client.from('commissions');
    jest.spyOn(table, 'update').mockImplementation((updates: any) => {
      return {
        eq: () => ({
          in: () => ({
            select: () => [{ id: 'c1' }, { id: 'c2' }],
          }),
        }),
      } as any;
    });
    const res = await forfeitSubscriptionCommissions('sub_1', 'customer_cancelled');
    expect(res).toBe(2);
  });
 
  it('forfeits subscription commissions when select returns {data}', async () => {
    const supabase = require('@/lib/supabase/server');
    const client = supabase.createAdminClient();
    const table = client.from('commissions');
    jest.spyOn(table, 'update').mockImplementation((updates: any) => {
      return {
        eq: () => ({
          in: () => ({
            select: () => ({ data: [{ id: 'x1' }, { id: 'x2' }, { id: 'x3' }] }),
          }),
        }),
      } as any;
    });
    const res = await forfeitSubscriptionCommissions('sub_2', 'refunded');
    expect(res).toBe(3);
  });
 
  it('forfeits subscription commissions when select returns {data:null}', async () => {
    const supabase = require('@/lib/supabase/server');
    const client = supabase.createAdminClient();
    const table = client.from('commissions');
    jest.spyOn(table, 'update').mockImplementation((_updates: any) => {
      return {
        eq: () => ({
          in: () => ({
            select: () => ({ data: null }),
          }),
        }),
      } as any;
    });
    const res = await forfeitSubscriptionCommissions('sub_3', 'chargeback');
    expect(res).toBe(0);
  });

  it('forfeits subscription commissions returns 0 when select returns empty array', async () => {
    const supabase = require('@/lib/supabase/server');
    const client = supabase.createAdminClient();
    const table = client.from('commissions');
    const originalUpdate = table.update;
    jest.spyOn(table, 'update').mockImplementationOnce((_updates: any) => {
      return {
        eq: () => ({
          in: () => ({
            select: () => [],
          }),
        }),
      } as any;
    });
    const res = await forfeitSubscriptionCommissions('sub_4', 'clawback');
    expect(res).toBe(0);
    table.update = originalUpdate;
  });
});
