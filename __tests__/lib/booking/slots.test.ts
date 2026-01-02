import { describe, it, expect, jest } from '@jest/globals';

describe('booking/slots: availability and holds', () => {
  it('getAvailableSlots respects provided range within limits', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/booking/settings', () => ({
        getBookingSettings: jest.fn(async () => ({
          isEnabled: true,
          leadTimeHours: 0,
          maxDaysAhead: 30,
          bufferMinutes: 0,
          slotDurationMinutes: 60,
          availableDays: [0,1,2,3,4,5,6],
          dayStartTime: '08:00',
          dayEndTime: '09:00',
        })),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => ({
          from: (table: string) => ({
            select: () => {
              const chain: any = {};
              chain.eq = () => chain;
              chain.in = () => chain;
              chain.gte = () => chain;
              chain.lte = () => ({ data: [], error: null });
              return chain;
            },
          }),
        }),
      }));
      const { getAvailableSlots } = require('@/lib/booking/slots');
      const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      const res = await getAvailableSlots('b1', start, end);
      expect(res.days.length).toBeGreaterThan(0);
      const expected = new Date(start);
      expected.setHours(0, 0, 0, 0);
      expect(res.days[0].date).toBe(expected.toISOString().split('T')[0]);
    });
  });
  it('getAvailableSlots returns defaults when settings disabled or missing', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/booking/settings', () => ({
        getBookingSettings: jest.fn(async () => null),
      }));
      const { getAvailableSlots } = require('@/lib/booking/slots');
      const res1 = await getAvailableSlots('b1');
      expect(res1.days.length).toBe(0);
      expect(res1.settings.slotDuration).toBe(60);
      expect(res1.settings.leadTimeHours).toBe(24);
      expect(res1.settings.maxDaysAhead).toBe(30);
    });
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/booking/settings', () => ({
        getBookingSettings: jest.fn(async () => ({
          isEnabled: false,
        })),
      }));
      const { getAvailableSlots } = require('@/lib/booking/slots');
      const res2 = await getAvailableSlots('b1');
      expect(res2.days.length).toBe(0);
      expect(res2.settings.slotDuration).toBe(60);
    });
  });

  it('getSlotsForDate returns empty when day not available', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/booking/settings', () => ({
        getBookingSettings: jest.fn(async () => ({
          isEnabled: true,
          leadTimeHours: 0,
          maxDaysAhead: 30,
          bufferMinutes: 0,
          slotDurationMinutes: 60,
          availableDays: [1, 2, 3, 4, 5],
          dayStartTime: '08:00',
          dayEndTime: '17:00',
        })),
      }));
      const { getSlotsForDate } = require('@/lib/booking/slots');
      const sunday = new Date(2025, 0, 5);
      const slots = await getSlotsForDate('b1', sunday);
      expect(slots.length).toBe(0);
    });
  });
  
  it('getSlotsForDate returns empty when slot duration exceeds day window', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/booking/settings', () => ({
        getBookingSettings: jest.fn(async () => ({
          isEnabled: true,
          leadTimeHours: 0,
          maxDaysAhead: 30,
          bufferMinutes: 0,
          slotDurationMinutes: 30,
          availableDays: [0,1,2,3,4,5,6],
          dayStartTime: '08:00',
          dayEndTime: '08:10',
        })),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => ({
          from: () => ({
            select: () => {
              const chain: any = {};
              chain.eq = () => chain;
              chain.in = () => chain;
              chain.gte = () => chain;
              chain.lte = () => ({ data: [], error: null });
              return chain;
            },
          }),
        }),
      }));
      const { getSlotsForDate } = require('@/lib/booking/slots');
      const date = new Date();
      const slots = await getSlotsForDate('b1', date);
      expect(slots.length).toBe(0);
    });
  });

  it('isSlotAvailable enforces lead time, max days, hours, and conflicts', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/booking/settings', () => ({
        getBookingSettings: jest.fn(async () => ({
          isEnabled: true,
          leadTimeHours: 24,
          maxDaysAhead: 30,
          bufferMinutes: 15,
          slotDurationMinutes: 60,
          availableDays: [0, 1, 2, 3, 4, 5, 6],
          dayStartTime: '08:00',
          dayEndTime: '17:00',
        })),
      }));
      jest.doMock('@/lib/supabase/server', () => {
        return {
          createClient: async () => ({
            from: (_table: string) => ({
              select: () => ({
                eq: () => ({
                  in: () => ({
                    gte: () => ({
                      lte: () => ({
                        data: [
                          { scheduled_date: '2025-01-10', scheduled_time: '08:30', estimated_duration: 60 },
                        ],
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      });
      const { isSlotAvailable } = require('@/lib/booking/slots');
      const now = new Date();
      const soon = new Date(now.getTime() + 60 * 60 * 1000);
      const leadRes = await isSlotAvailable('b1', soon, 60);
      expect(leadRes.available).toBe(false);
      const far = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);
      const farRes = await isSlotAvailable('b1', far, 60);
      expect(farRes.available).toBe(false);
      const outsideHours = new Date(now);
      outsideHours.setHours(6, 0, 0, 0);
      const hoursRes = await isSlotAvailable('b1', outsideHours, 60);
      expect(hoursRes.available).toBe(false);
      const conflict = new Date(2025, 0, 10, 8, 30, 0);
      const conflictRes = await isSlotAvailable('b1', conflict, 60);
      expect(conflictRes.available).toBe(false);
    });
  });

  it('isSlotHeld returns false when no active hold', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => ({
          from: () => ({
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    gt: () => ({
                      single: () => ({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }));
      const { isSlotHeld } = require('@/lib/booking/slots');
      const held = await isSlotHeld('b1', new Date(2025, 0, 11, 9, 0, 0));
      expect(held).toBe(false);
    });
  });
  
  it('isSlotHeld returns true when active hold exists', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => ({
          from: () => ({
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    gt: () => ({
                      single: () => ({ data: { id: 'h1' }, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }));
      const { isSlotHeld } = require('@/lib/booking/slots');
      const held = await isSlotHeld('b1', new Date(2025, 0, 11, 9, 0, 0));
      expect(held).toBe(true);
    });
  });

  it('createSlotHold returns error reason for non-duplicate failures', async () => {
    await jest.isolateModulesAsync(async () => {
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
                single: () => ({ data: null, error: { code: 'XX', message: 'db-fail' } }),
              }),
            }),
          }),
        }),
      }));
      const { createSlotHold } = require('@/lib/booking/slots');
      const start = new Date(2025, 0, 12, 9, 0, 0);
      const end = new Date(2025, 0, 12, 10, 0, 0);
      const res = await createSlotHold('b1', start, end, 'conv1');
      expect(res.success).toBe(false);
      expect(res.reason).toBe('db-fail');
    });
  });
  
  it('createSlotHold returns slot_unavailable on unique violation', async () => {
    await jest.isolateModulesAsync(async () => {
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
                single: () => ({ data: null, error: { code: '23505', message: 'dup' } }),
              }),
            }),
          }),
        }),
      }));
      const { createSlotHold } = require('@/lib/booking/slots');
      const start = new Date(2025, 0, 12, 9, 0, 0);
      const end = new Date(2025, 0, 12, 10, 0, 0);
      const res = await createSlotHold('b1', start, end, 'c1');
      expect(res.success).toBe(false);
      expect(res.reason).toBe('slot_unavailable');
    });
  });
  
  it('createSlotHold returns hold on success', async () => {
    await jest.isolateModulesAsync(async () => {
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
                single: () => ({
                  data: {
                    id: 'h1',
                    business_id: 'b1',
                    conversation_id: 'c1',
                    slot_start: new Date(2025,0,12,9,0,0).toISOString(),
                    slot_end: new Date(2025,0,12,10,0,0).toISOString(),
                    status: 'held',
                    expires_at: new Date(2025,0,12,9,5,0).toISOString(),
                    created_at: new Date(2025,0,12,8,55,0).toISOString(),
                  },
                  error: null
                }),
              }),
            }),
          }),
        }),
      }));
      const { createSlotHold } = require('@/lib/booking/slots');
      const start = new Date(2025, 0, 12, 9, 0, 0);
      const end = new Date(2025, 0, 12, 10, 0, 0);
      const res = await createSlotHold('b1', start, end, 'c1');
      expect(res.success).toBe(true);
      expect(res.hold?.status).toBe('held');
      expect(res.hold?.businessId).toBe('b1');
    });
  });
  
  it('confirmSlotHold updates status when held', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: () => ({
            update: () => ({
              eq: () => ({
                eq: () => ({ error: null }),
              }),
            }),
          }),
        }),
      }));
      const { confirmSlotHold } = require('@/lib/booking/slots');
      const ok = await confirmSlotHold('h1');
      expect(ok).toBe(true);
    });
  });
  
  it('releaseSlotHold updates status when held', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: () => ({
            update: () => ({
              eq: () => ({
                eq: () => ({ error: null }),
              }),
            }),
          }),
        }),
      }));
      const { releaseSlotHold } = require('@/lib/booking/slots');
      const ok = await releaseSlotHold('h1');
      expect(ok).toBe(true);
    });
  });

  it('getAvailabilitySummary reports counts and nextAvailable', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.useFakeTimers().setSystemTime(new Date(2025, 0, 1, 8, 0, 0));
      jest.doMock('@/lib/booking/settings', () => ({
        getBookingSettings: jest.fn(async () => ({
          isEnabled: true,
          leadTimeHours: 0,
          maxDaysAhead: 1,
          bufferMinutes: 0,
          slotDurationMinutes: 60,
          availableDays: [0, 1, 2, 3, 4, 5, 6],
          dayStartTime: '08:00',
          dayEndTime: '09:00',
        })),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => ({
          from: () => ({
            select: () => {
              const chain: any = {};
              chain.eq = () => chain;
              chain.in = () => chain;
              chain.gte = () => chain;
              chain.lte = () => ({ data: [], error: null });
              return chain;
            },
          }),
        }),
      }));
      const { getAvailabilitySummary } = require('@/lib/booking/slots');
      const summary = await getAvailabilitySummary('b1', 1);
      expect(summary.totalSlots).toBeGreaterThan(0);
      expect(summary.availableSlots).toBeGreaterThan(0);
      expect(typeof summary.nextAvailable).toBe('string');
      jest.useRealTimers();
    });
  });

  it('getSlotsForDate marks past times as unavailable with reason', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/booking/settings', () => ({
        getBookingSettings: jest.fn(async () => ({
          isEnabled: true,
          leadTimeHours: 0,
          maxDaysAhead: 30,
          bufferMinutes: 0,
          slotDurationMinutes: 60,
          availableDays: [0, 1, 2, 3, 4, 5, 6],
          dayStartTime: '00:00',
          dayEndTime: '01:00',
        })),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => ({
          from: () => ({
            select: () => {
              const chain: any = {};
              chain.eq = () => chain;
              chain.in = () => chain;
              chain.gte = () => chain;
              chain.lte = () => ({ data: [], error: null });
              return chain;
            },
          }),
        }),
      }));
      const { getSlotsForDate } = require('@/lib/booking/slots');
      const today = new Date();
      const early = new Date(today);
      early.setHours(0, 0, 0, 0);
      const slots = await getSlotsForDate('b1', early);
      expect(slots.length).toBeGreaterThan(0);
      // At least one slot should be unavailable due to past time
      expect(slots.some(s => s.reason === 'Past time slot')).toBe(true);
    });
  });
  
  it('getSlotsForDate marks conflicts as already booked', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.useFakeTimers().setSystemTime(new Date(2025, 0, 1, 8, 0, 0));
      jest.doMock('@/lib/booking/settings', () => ({
        getBookingSettings: jest.fn(async () => ({
          isEnabled: true,
          leadTimeHours: 0,
          maxDaysAhead: 30,
          bufferMinutes: 0,
          slotDurationMinutes: 30,
          availableDays: [0,1,2,3,4,5,6],
          dayStartTime: '08:00',
          dayEndTime: '09:00',
        })),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => ({
          from: (table: string) => ({
            select: () => {
              const chain: any = {};
              chain.eq = () => chain;
              chain.in = () => chain;
              chain.gte = () => chain;
              chain.lte = () => ({
                data: table === 'jobs' 
                  ? [{ scheduled_date: new Date().toISOString().split('T')[0], scheduled_time: '08:15', estimated_duration: 30 }]
                  : [],
                error: null
              });
              return chain;
            },
          }),
        }),
      }));
      const { getSlotsForDate } = require('@/lib/booking/slots');
      const date = new Date(2025, 0, 1);
      const slots = await getSlotsForDate('b1', date);
      expect(slots[0].available).toBe(false);
      expect(slots[0].reason).toBe('Already booked');
      jest.useRealTimers();
    });
  });
  
  it('getSlotsForDate marks insufficient lead time for future slots', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.useFakeTimers().setSystemTime(new Date(2025, 0, 1, 9, 0, 0));
      jest.doMock('@/lib/booking/settings', () => ({
        getBookingSettings: jest.fn(async () => ({
          isEnabled: true,
          leadTimeHours: 2,
          maxDaysAhead: 30,
          bufferMinutes: 0,
          slotDurationMinutes: 60,
          availableDays: [0,1,2,3,4,5,6],
          dayStartTime: '09:00',
          dayEndTime: '10:00',
        })),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => ({
          from: () => ({
            select: () => {
              const chain: any = {};
              chain.eq = () => chain;
              chain.in = () => chain;
              chain.gte = () => chain;
              chain.lte = () => ({ data: [], error: null });
              return chain;
            },
          }),
        }),
      }));
      const { getSlotsForDate } = require('@/lib/booking/slots');
      const date = new Date(2025, 0, 1);
      const slots = await getSlotsForDate('b1', date);
      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0].available).toBe(false);
      expect(slots[0].reason).toBe('Insufficient lead time');
      jest.useRealTimers();
    });
  });
  it('slot hold flows: create, confirm, release, check, expire', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => {
        return {
          createAdminClient: () => ({
            from: (_table: string) => ({
              update: (_u: any) => {
                const chain: any = {
                  eq: () => chain,
                  lt: () => ({
                    select: () => ({ data: [], error: null }),
                  }),
                };
                return chain;
              },
              insert: (_i: any) => ({
                select: () => ({
                  single: () => ({
                    data: {
                      id: 'h1',
                      business_id: 'b1',
                      conversation_id: 'conv1',
                      slot_start: new Date(2025, 0, 10, 9, 0, 0).toISOString(),
                      slot_end: new Date(2025, 0, 10, 10, 0, 0).toISOString(),
                      status: 'held',
                      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                      created_at: new Date().toISOString(),
                    },
                    error: null,
                  }),
                }),
              }),
              eq: (_c: string, _id: string) => ({ error: null }),
            }),
          }),
          createClient: async () => ({
            from: (_table: string) => ({
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    eq: () => ({
                      gt: () => ({
                        single: () => ({ data: { id: 'h1' }, error: null }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      });
      const {
        createSlotHold,
        confirmSlotHold,
        releaseSlotHold,
        isSlotHeld,
        expireStaleHolds,
      } = require('@/lib/booking/slots');
      const start = new Date(2025, 0, 10, 9, 0, 0);
      const end = new Date(2025, 0, 10, 10, 0, 0);
      const createRes = await createSlotHold('b1', start, end, 'conv1');
      expect(createRes.success).toBe(true);
      expect(createRes.hold?.id).toBe('h1');
      const confirmRes = await confirmSlotHold('h1');
      expect(confirmRes).toBe(true);
      const releaseRes = await releaseSlotHold('h1');
      expect(releaseRes).toBe(true);
      const held = await isSlotHeld('b1', start);
      expect(held).toBe(true);
      const expired = await expireStaleHolds();
      expect(expired).toBe(0);
    });
  });

  it('createSlotHold returns slot_unavailable on conflict error code 23505', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (_table: string) => ({
            update: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    lt: () => ({ data: [], error: null }),
                  }),
                }),
              }),
            }),
            insert: () => ({
              select: () => ({
                single: () => ({ data: null, error: { code: '23505', message: 'dup' } }),
              }),
            }),
          }),
        }),
      }));
      const { createSlotHold } = require('@/lib/booking/slots');
      const start = new Date(2025, 0, 10, 9, 0, 0);
      const end = new Date(2025, 0, 10, 10, 0, 0);
      const res = await createSlotHold('b1', start, end, 'conv1');
      expect(res.success).toBe(false);
      expect(res.reason).toBe('slot_unavailable');
    });
  });

  it('isSlotAvailable returns disabled reason when booking not enabled', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/booking/settings', () => ({
        getBookingSettings: jest.fn(async () => ({ isEnabled: false })),
      }));
      const { isSlotAvailable } = require('@/lib/booking/slots');
      const res = await isSlotAvailable('b1', new Date());
      expect(res.available).toBe(false);
      expect(res.reason).toBe('Online booking is not enabled');
    });
  });
});
