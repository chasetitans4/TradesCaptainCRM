import { describe, it, expect, jest } from '@jest/globals';

describe('booking/slots holds', () => {
  it('expireStaleHolds returns count of expired', async () => {
    jest.resetModules();
    jest.doMock('@/lib/supabase/server', () => ({
      createAdminClient: () => ({
        from: () => ({
          update: () => ({
            eq: () => ({
              lt: () => ({
                select: () => ({ data: [{ id: '1' }, { id: '2' }], error: null }),
              }),
            }),
          }),
        }),
      }),
    }));
    const { expireStaleHolds } = require('@/lib/booking/slots');
    const count = await expireStaleHolds();
    expect(count).toBe(2);
  });

  it('createSlotHold returns slot_unavailable on unique violation', async () => {
    jest.resetModules();
    jest.doMock('@/lib/supabase/server', () => ({
      createAdminClient: () => ({
        from: () => ({
          update: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  lt: () => ({}),
                }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: async () => ({ data: null, error: { code: '23505', message: 'unique' } }),
            }),
          }),
        }),
      }),
    }));
    const { createSlotHold } = require('@/lib/booking/slots');
    const now = new Date();
    const res = await createSlotHold('b1', now, new Date(now.getTime() + 60 * 60 * 1000));
    expect(res.success).toBe(false);
    expect(res.reason).toBe('slot_unavailable');
  });

  it('createSlotHold returns success with hold', async () => {
    jest.resetModules();
    jest.doMock('@/lib/supabase/server', () => ({
      createAdminClient: () => ({
        from: () => ({
          update: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  lt: () => ({}),
                }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: {
                  id: 'h1',
                  business_id: 'b1',
                  conversation_id: null,
                  slot_start: new Date().toISOString(),
                  slot_end: new Date(Date.now() + 60_000).toISOString(),
                  status: 'held',
                  expires_at: new Date(Date.now() + 60_000).toISOString(),
                  created_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    }));
    const { createSlotHold } = require('@/lib/booking/slots');
    const now = new Date();
    const res = await createSlotHold('b1', now, new Date(now.getTime() + 60 * 60 * 1000));
    expect(res.success).toBe(true);
    expect(res.hold?.id).toBe('h1');
  });
});

