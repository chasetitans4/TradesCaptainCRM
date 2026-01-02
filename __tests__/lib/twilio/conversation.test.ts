import { describe, it, expect, jest } from '@jest/globals';

describe('twilio/sms conversation helpers', () => {
  it('getOrCreateConversation returns existing conversation', async () => {
    jest.resetModules();
    jest.doMock('@/lib/supabase/server', () => ({
      createAdminClient: () => ({
        from: (table: string) => ({
          select: () => ({
            eq: (col: string, _val: any) => ({
              eq: () => ({
                eq: () => ({
                  single: async () =>
                    table === 'sms_conversations'
                      ? { data: { id: 'c1', customer_id: 'cust1' }, error: null }
                      : { data: null, error: null },
                }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: 'c2' }, error: null }),
            }),
          }),
        }),
      }),
    }));
    const { getOrCreateConversation } = require('@/lib/twilio/sms');
    const res = await getOrCreateConversation('+15551234567', 'b1');
    expect(res.isNew).toBe(false);
    expect(res.id).toBe('c1');
  });

  it('getOrCreateConversation creates new with or without customer', async () => {
    jest.resetModules();
    jest.doMock('@/lib/supabase/server', () => ({
      createAdminClient: () => ({
        from: (table: string) => ({
          select: () => {
            const chain: any = {};
            chain.eq = () => chain;
            chain.single = async () => {
              if (table === 'sms_conversations') {
                return { data: null, error: null };
              }
              if (table === 'customers') {
                return { data: { id: 'cust1' }, error: null };
              }
              return { data: null, error: null };
            };
            return chain;
          },
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: 'c3' }, error: null }),
            }),
          }),
        }),
      }),
    }));
    const { getOrCreateConversation } = require('@/lib/twilio/sms');
    const res = await getOrCreateConversation('5551234567', 'b1');
    expect(res.isNew).toBe(true);
    expect(res.id).toBe('c3');
  });
});
