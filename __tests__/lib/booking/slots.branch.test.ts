/**
 * Booking Slots Branch Coverage Tests
 *
 * Tests for edge cases and branches to achieve 85%+ branch coverage.
 */

import { describe, it, expect, jest } from '@jest/globals';

describe('booking/slots branch coverage', () => {
  describe('getSlotsForDate', () => {
    it('returns empty array when settings is null', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/booking/settings', () => ({
          getBookingSettings: jest.fn(async () => null),
        }));
        const { getSlotsForDate } = require('@/lib/booking/slots');
        const result = await getSlotsForDate('b1', new Date());
        expect(result).toEqual([]);
      });
    });

    it('returns empty array when booking is disabled', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/booking/settings', () => ({
          getBookingSettings: jest.fn(async () => ({
            isEnabled: false,
          })),
        }));
        const { getSlotsForDate } = require('@/lib/booking/slots');
        const result = await getSlotsForDate('b1', new Date());
        expect(result).toEqual([]);
      });
    });
  });

  describe('isSlotAvailable', () => {
    it('returns unavailable when day is not in available days', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/booking/settings', () => ({
          getBookingSettings: jest.fn(async () => ({
            isEnabled: true,
            leadTimeHours: 0,
            maxDaysAhead: 365,
            bufferMinutes: 0,
            slotDurationMinutes: 60,
            availableDays: [1, 2, 3, 4, 5], // No Sunday (0) or Saturday (6)
            dayStartTime: '08:00',
            dayEndTime: '17:00',
          })),
        }));
        const { isSlotAvailable } = require('@/lib/booking/slots');
        // Create a Sunday date in the future
        const sunday = new Date();
        sunday.setDate(sunday.getDate() + ((7 - sunday.getDay()) % 7 || 7)); // Next Sunday
        sunday.setHours(10, 0, 0, 0);

        const result = await isSlotAvailable('b1', sunday);
        expect(result.available).toBe(false);
        expect(result.reason).toBe('This day is not available for booking');
      });
    });

    it('returns unavailable when time is before business hours', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/booking/settings', () => ({
          getBookingSettings: jest.fn(async () => ({
            isEnabled: true,
            leadTimeHours: 0,
            maxDaysAhead: 365,
            bufferMinutes: 0,
            slotDurationMinutes: 60,
            availableDays: [0, 1, 2, 3, 4, 5, 6],
            dayStartTime: '08:00',
            dayEndTime: '17:00',
          })),
        }));
        const { isSlotAvailable } = require('@/lib/booking/slots');
        const earlyMorning = new Date();
        earlyMorning.setDate(earlyMorning.getDate() + 1);
        earlyMorning.setHours(6, 0, 0, 0); // 6 AM - before 8 AM start

        const result = await isSlotAvailable('b1', earlyMorning);
        expect(result.available).toBe(false);
        expect(result.reason).toBe('This time is outside business hours');
      });
    });

    it('returns unavailable when time is after business hours', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/booking/settings', () => ({
          getBookingSettings: jest.fn(async () => ({
            isEnabled: true,
            leadTimeHours: 0,
            maxDaysAhead: 365,
            bufferMinutes: 0,
            slotDurationMinutes: 60,
            availableDays: [0, 1, 2, 3, 4, 5, 6],
            dayStartTime: '08:00',
            dayEndTime: '17:00',
          })),
        }));
        const { isSlotAvailable } = require('@/lib/booking/slots');
        const lateEvening = new Date();
        lateEvening.setDate(lateEvening.getDate() + 1);
        lateEvening.setHours(18, 0, 0, 0); // 6 PM - after 5 PM end

        const result = await isSlotAvailable('b1', lateEvening);
        expect(result.available).toBe(false);
        expect(result.reason).toBe('This time is outside business hours');
      });
    });

    it('returns unavailable when time slot is already booked', async () => {
      await jest.isolateModulesAsync(async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        futureDate.setHours(10, 0, 0, 0);
        const futureDateStr = futureDate.toISOString().split('T')[0];

        jest.doMock('@/lib/booking/settings', () => ({
          getBookingSettings: jest.fn(async () => ({
            isEnabled: true,
            leadTimeHours: 0,
            maxDaysAhead: 365,
            bufferMinutes: 0,
            slotDurationMinutes: 60,
            availableDays: [0, 1, 2, 3, 4, 5, 6],
            dayStartTime: '08:00',
            dayEndTime: '17:00',
          })),
        }));
        jest.doMock('@/lib/supabase/server', () => ({
          createClient: async () => ({
            from: (table: string) => {
              const makeChain = (data: any[]) => {
                const chain: any = {};
                chain.eq = () => chain;
                chain.in = () => chain;
                chain.gte = () => chain;
                chain.lte = () => ({ data, error: null });
                return chain;
              };
              return {
                select: () => {
                  if (table === 'jobs') {
                    return makeChain([{ scheduled_date: futureDateStr, scheduled_time: '10:00', estimated_duration: 60 }]);
                  }
                  return makeChain([]);
                },
              };
            },
          }),
        }));
        const { isSlotAvailable } = require('@/lib/booking/slots');

        const result = await isSlotAvailable('b1', futureDate);
        expect(result.available).toBe(false);
        expect(result.reason).toBe('This time slot is already booked');
      });
    });

    it('returns available when all conditions are met', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/booking/settings', () => ({
          getBookingSettings: jest.fn(async () => ({
            isEnabled: true,
            leadTimeHours: 0,
            maxDaysAhead: 365,
            bufferMinutes: 0,
            slotDurationMinutes: 60,
            availableDays: [0, 1, 2, 3, 4, 5, 6],
            dayStartTime: '08:00',
            dayEndTime: '17:00',
          })),
        }));
        jest.doMock('@/lib/supabase/server', () => ({
          createClient: async () => ({
            from: () => {
              const makeChain = () => {
                const chain: any = {};
                chain.eq = () => chain;
                chain.in = () => chain;
                chain.gte = () => chain;
                chain.lte = () => ({ data: [], error: null });
                return chain;
              };
              return { select: () => makeChain() };
            },
          }),
        }));
        const { isSlotAvailable } = require('@/lib/booking/slots');
        const validSlot = new Date();
        validSlot.setDate(validSlot.getDate() + 1);
        validSlot.setHours(10, 0, 0, 0);

        const result = await isSlotAvailable('b1', validSlot);
        expect(result.available).toBe(true);
        expect(result.reason).toBeUndefined();
      });
    });

    it('uses default slot duration when not provided', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/booking/settings', () => ({
          getBookingSettings: jest.fn(async () => ({
            isEnabled: true,
            leadTimeHours: 0,
            maxDaysAhead: 365,
            bufferMinutes: 0,
            slotDurationMinutes: 30, // Default duration
            availableDays: [0, 1, 2, 3, 4, 5, 6],
            dayStartTime: '08:00',
            dayEndTime: '17:00',
          })),
        }));
        jest.doMock('@/lib/supabase/server', () => ({
          createClient: async () => ({
            from: () => {
              const makeChain = () => {
                const chain: any = {};
                chain.eq = () => chain;
                chain.in = () => chain;
                chain.gte = () => chain;
                chain.lte = () => ({ data: [], error: null });
                return chain;
              };
              return { select: () => makeChain() };
            },
          }),
        }));
        const { isSlotAvailable } = require('@/lib/booking/slots');
        const validSlot = new Date();
        validSlot.setDate(validSlot.getDate() + 1);
        validSlot.setHours(10, 0, 0, 0);

        // Call without duration - should use default slotDurationMinutes
        const result = await isSlotAvailable('b1', validSlot);
        expect(result.available).toBe(true);
      });
    });
  });

  describe('getExistingAppointments', () => {
    it('processes confirmed bookings', async () => {
      await jest.isolateModulesAsync(async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 2);
        futureDate.setHours(10, 0, 0, 0);
        const futureDateStr = futureDate.toISOString().split('T')[0];

        jest.doMock('@/lib/booking/settings', () => ({
          getBookingSettings: jest.fn(async () => ({
            isEnabled: true,
            leadTimeHours: 0,
            maxDaysAhead: 365,
            bufferMinutes: 0,
            slotDurationMinutes: 60,
            availableDays: [0, 1, 2, 3, 4, 5, 6],
            dayStartTime: '08:00',
            dayEndTime: '17:00',
          })),
        }));
        jest.doMock('@/lib/supabase/server', () => ({
          createClient: async () => ({
            from: (table: string) => {
              const makeChain = (data: any[]) => {
                const chain: any = {};
                chain.eq = () => chain;
                chain.in = () => chain;
                chain.gte = () => chain;
                chain.lte = () => ({ data, error: null });
                return chain;
              };
              return {
                select: () => {
                  if (table === 'booking_requests') {
                    return makeChain([{ confirmed_date: futureDateStr, confirmed_time: '10:00' }]);
                  }
                  return makeChain([]);
                },
              };
            },
          }),
        }));
        const { isSlotAvailable } = require('@/lib/booking/slots');

        const result = await isSlotAvailable('b1', futureDate);
        expect(result.available).toBe(false);
        expect(result.reason).toBe('This time slot is already booked');
      });
    });

    it('skips jobs without scheduled_date or scheduled_time', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/booking/settings', () => ({
          getBookingSettings: jest.fn(async () => ({
            isEnabled: true,
            leadTimeHours: 0,
            maxDaysAhead: 365,
            bufferMinutes: 0,
            slotDurationMinutes: 60,
            availableDays: [0, 1, 2, 3, 4, 5, 6],
            dayStartTime: '08:00',
            dayEndTime: '17:00',
          })),
        }));
        jest.doMock('@/lib/supabase/server', () => ({
          createClient: async () => ({
            from: (table: string) => {
              const makeChain = (data: any[]) => {
                const chain: any = {};
                chain.eq = () => chain;
                chain.in = () => chain;
                chain.gte = () => chain;
                chain.lte = () => ({ data, error: null });
                return chain;
              };
              return {
                select: () => {
                  if (table === 'jobs') {
                    return makeChain([{ scheduled_date: null, scheduled_time: null }]);
                  }
                  return makeChain([]);
                },
              };
            },
          }),
        }));
        const { isSlotAvailable } = require('@/lib/booking/slots');
        const validSlot = new Date();
        validSlot.setDate(validSlot.getDate() + 1);
        validSlot.setHours(10, 0, 0, 0);

        // Should still be available since job has no schedule
        const result = await isSlotAvailable('b1', validSlot);
        expect(result.available).toBe(true);
      });
    });

    it('skips bookings without confirmed_date or confirmed_time', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/booking/settings', () => ({
          getBookingSettings: jest.fn(async () => ({
            isEnabled: true,
            leadTimeHours: 0,
            maxDaysAhead: 365,
            bufferMinutes: 0,
            slotDurationMinutes: 60,
            availableDays: [0, 1, 2, 3, 4, 5, 6],
            dayStartTime: '08:00',
            dayEndTime: '17:00',
          })),
        }));
        jest.doMock('@/lib/supabase/server', () => ({
          createClient: async () => ({
            from: (table: string) => {
              const makeChain = (data: any[]) => {
                const chain: any = {};
                chain.eq = () => chain;
                chain.in = () => chain;
                chain.gte = () => chain;
                chain.lte = () => ({ data, error: null });
                return chain;
              };
              return {
                select: () => {
                  if (table === 'booking_requests') {
                    return makeChain([{ confirmed_date: null, confirmed_time: null }]);
                  }
                  return makeChain([]);
                },
              };
            },
          }),
        }));
        const { isSlotAvailable } = require('@/lib/booking/slots');
        const validSlot = new Date();
        validSlot.setDate(validSlot.getDate() + 1);
        validSlot.setHours(10, 0, 0, 0);

        // Should still be available since booking has no confirmation
        const result = await isSlotAvailable('b1', validSlot);
        expect(result.available).toBe(true);
      });
    });

    it('uses default 60 minutes for jobs without estimated_duration', async () => {
      await jest.isolateModulesAsync(async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        futureDate.setHours(10, 0, 0, 0);
        const futureDateStr = futureDate.toISOString().split('T')[0];

        jest.doMock('@/lib/booking/settings', () => ({
          getBookingSettings: jest.fn(async () => ({
            isEnabled: true,
            leadTimeHours: 0,
            maxDaysAhead: 365,
            bufferMinutes: 0,
            slotDurationMinutes: 60,
            availableDays: [0, 1, 2, 3, 4, 5, 6],
            dayStartTime: '08:00',
            dayEndTime: '17:00',
          })),
        }));
        jest.doMock('@/lib/supabase/server', () => ({
          createClient: async () => ({
            from: (table: string) => {
              const makeChain = (data: any[]) => {
                const chain: any = {};
                chain.eq = () => chain;
                chain.in = () => chain;
                chain.gte = () => chain;
                chain.lte = () => ({ data, error: null });
                return chain;
              };
              return {
                select: () => {
                  if (table === 'jobs') {
                    return makeChain([{ scheduled_date: futureDateStr, scheduled_time: '10:00', estimated_duration: null }]);
                  }
                  return makeChain([]);
                },
              };
            },
          }),
        }));
        const { isSlotAvailable } = require('@/lib/booking/slots');

        const result = await isSlotAvailable('b1', futureDate);
        expect(result.available).toBe(false);
        expect(result.reason).toBe('This time slot is already booked');
      });
    });
  });

  describe('getAvailableSlots', () => {
    it('handles endDate after maxDate', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/booking/settings', () => ({
          getBookingSettings: jest.fn(async () => ({
            isEnabled: true,
            leadTimeHours: 0,
            maxDaysAhead: 7, // Only 7 days ahead
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
        const { getAvailableSlots } = require('@/lib/booking/slots');

        // Request 30 days, but maxDaysAhead is 7
        const start = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
        const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const result = await getAvailableSlots('b1', start, end);
        // Should be limited by maxDaysAhead
        expect(result.days.length).toBeLessThanOrEqual(7);
      });
    });

    it('handles startDate before minDate', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/booking/settings', () => ({
          getBookingSettings: jest.fn(async () => ({
            isEnabled: true,
            leadTimeHours: 48, // 2 days lead time
            maxDaysAhead: 30,
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
        const { getAvailableSlots } = require('@/lib/booking/slots');

        // Request starting today, but leadTimeHours is 48
        const start = new Date();
        const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const result = await getAvailableSlots('b1', start, end);
        // Should start from minDate, not the requested startDate
        expect(result.days.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getAvailabilitySummary', () => {
    it('returns null nextAvailable when no slots are available', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.useFakeTimers().setSystemTime(new Date(2025, 0, 1, 8, 0, 0));
        jest.doMock('@/lib/booking/settings', () => ({
          getBookingSettings: jest.fn(async () => ({
            isEnabled: true,
            leadTimeHours: 0,
            maxDaysAhead: 1,
            bufferMinutes: 0,
            slotDurationMinutes: 60,
            availableDays: [], // No days available
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
        const summary = await getAvailabilitySummary('b1', 7);
        expect(summary.totalSlots).toBe(0);
        expect(summary.availableSlots).toBe(0);
        expect(summary.nextAvailable).toBeNull();
        jest.useRealTimers();
      });
    });
  });

  describe('confirmSlotHold', () => {
    it('returns false when update fails', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => ({
            from: () => ({
              update: () => ({
                eq: () => ({
                  eq: () => ({ error: { message: 'Update failed' } }),
                }),
              }),
            }),
          }),
        }));
        const { confirmSlotHold } = require('@/lib/booking/slots');
        const result = await confirmSlotHold('h1');
        expect(result).toBe(false);
      });
    });
  });

  describe('releaseSlotHold', () => {
    it('returns false when update fails', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => ({
            from: () => ({
              update: () => ({
                eq: () => ({
                  eq: () => ({ error: { message: 'Update failed' } }),
                }),
              }),
            }),
          }),
        }));
        const { releaseSlotHold } = require('@/lib/booking/slots');
        const result = await releaseSlotHold('h1');
        expect(result).toBe(false);
      });
    });
  });

  describe('expireStaleHolds', () => {
    it('returns 0 when data is null', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => ({
            from: () => ({
              update: () => ({
                eq: () => ({
                  lt: () => ({
                    select: () => ({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          }),
        }));
        const { expireStaleHolds } = require('@/lib/booking/slots');
        const count = await expireStaleHolds();
        expect(count).toBe(0);
      });
    });
  });
});
