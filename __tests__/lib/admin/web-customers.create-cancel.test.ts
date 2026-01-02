import { createWebCustomer, cancelWebCustomer } from '@/lib/admin/accounts';

jest.mock('@/lib/supabase/server', () => {
  const state: any = { lastCouponInsert: null, lastWebUpdate: null, customerId: 'w1', lastCrmCancel: null, lastCouponRevoke: null };
  const webTable = {
    insert: (data: any) => {
      return {
        select: () => ({
          single: () => ({ data: { id: state.customerId, ...data }, error: null }),
        }),
      };
    },
    update: (updates: any) => {
      state.lastWebUpdate = updates;
      return {
        eq: () => ({
          select: () => ({
            single: () => ({ data: { id: state.customerId, ...updates }, error: null }),
          }),
        }),
      };
    },
  };
  return {
    createAdminClient: jest.fn(() => ({
      from: (table: string) => {
        if (table === 'web_customers') return webTable as any;
        if (table === 'crm_coupons')
          return {
            insert: (payload: any) => {
              state.lastCouponInsert = payload;
              return {};
            },
            update: (payload: any) => {
              state.lastCouponRevoke = payload;
              return { eq: () => ({ eq: () => ({}) }) };
            },
          } as any;
        if (table === 'crm_accounts')
          return {
            update: (payload: any) => {
              state.lastCrmCancel = payload;
              return { eq: () => ({ eq: () => ({}) }) };
            },
          } as any;
        return {} as any;
      },
    })),
    __state: state,
  };
});

describe('admin web customers: create and cancel', () => {
  it('creates web customer and issues CRM coupon when includeCrmBonus true', async () => {
    const res = await createWebCustomer(
      {
        business_name: 'Web Biz',
        contact_name: 'Owner',
        email: 'owner@example.com',
        plan_type: 'web_pro',
        billing_interval: 'month',
      } as any,
      'agent-1',
      { includeCrmBonus: true }
    );
    expect(res.customer.id).toBe('w1');
    expect(typeof res.couponCode).toBe('string');
    const { __state } = require('@/lib/supabase/server');
    expect(__state.lastCouponInsert?.web_customer_id).toBe('w1');
    expect(__state.lastWebUpdate).toEqual({ crm_coupon_issued: true });
  });

  it('cancels web customer and revokes related promos', async () => {
    const customer = await cancelWebCustomer('w1');
    expect(customer.status).toBe('cancelled');
    expect(customer.cancelled_at).toBeTruthy();
    const { __state } = require('@/lib/supabase/server');
    expect(__state.lastCrmCancel?.status).toBe('cancelled');
    expect(__state.lastCouponRevoke?.status).toBe('revoked');
  });
});
