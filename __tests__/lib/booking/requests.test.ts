import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('@/lib/twilio/sms', () => ({
  formatPhoneE164: (p: string) => `+1${p.replace(/\D/g, '')}`,
}));

jest.mock('@/lib/logger', () => {
  const noop = jest.fn();
  const mockLogger = {
    child: jest.fn(() => mockLogger),
    info: noop,
    error: noop,
    warn: noop,
    debug: noop,
    fatal: noop,
  };
  return {
    logger: mockLogger,
    apiLogger: mockLogger,
    syncLogger: mockLogger,
  };
});

jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn(async () => {}),
}));

const supabaseState: any = {};

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      const api: any = { _table: table };
      api.select = () => api;
      api.eq = () => api;
      api.or = () => api;
      api.order = () => api;
      api.gte = () => api;
      api.lte = () => api;
      api.limit = () => api;
      api.range = () => api;
      api.update = (_data: any) => ({ eq: () => ({ error: supabaseState.updateError || null }) });
      api.insert = (data: any) => {
        supabaseState.lastInsert = data;
        if (api._table === 'jobs') {
          return {
            select: () => ({
              single: async () => ({
                data: supabaseState.job || { id: 'job1' },
                error: supabaseState.jobError || null,
              }),
            }),
          };
        }
        return {
          select: () => ({
            single: async () => ({
              data: supabaseState.insertData || { id: 'br1', service_type: data.service_type },
              error: supabaseState.insertError || null,
            }),
          }),
        };
      };
      api.single = async () => {
        if (table === 'customers') {
          return { data: supabaseState.customer || null, error: null };
        }
        if (table === 'booking_requests') {
          return { data: supabaseState.request || null, error: null };
        }
        if (table === 'jobs') {
          return { data: supabaseState.job || { id: 'job1' }, error: supabaseState.jobError || null };
        }
        return { data: null, error: null };
      };
      api.then = async (resolve: any) =>
        resolve({ data: supabaseState.queryData || [], count: supabaseState.queryCount || 0, error: null });
      return api;
    },
  }),
}));

describe('booking/requests', () => {
  beforeEach(() => {
    for (const k of Object.keys(supabaseState)) delete supabaseState[k];
    jest.resetModules();
  });

  it('createBookingRequest returns error when booking disabled', async () => {
    jest.doMock('@/lib/booking/settings', () => ({
      getBookingSettings: jest.fn(async () => null),
    }));
    const { createBookingRequest } = require('@/lib/booking/requests');
    const res = await createBookingRequest('b1', {
      customerName: 'Alice',
      customerEmail: 'alice@example.com',
      customerPhone: '555-111-2222',
      serviceType: 'install',
      preferredDate: '2025-01-01',
      address: '1 Main St',
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe('Online booking is not available');
  });

  it('createBookingRequest validates enabled services', async () => {
    jest.doMock('@/lib/booking/settings', () => ({
      getBookingSettings: jest.fn(async () => ({
        isEnabled: true,
        enabledServices: ['repair'],
        autoConfirm: false,
        notifyEmail: null,
      })),
    }));
    const { createBookingRequest } = require('@/lib/booking/requests');
    const res = await createBookingRequest('b1', {
      customerName: 'Bob',
      customerEmail: 'bob@example.com',
      customerPhone: '555-333-4444',
      serviceType: 'install',
      preferredDate: '2025-01-02',
      address: '2 Main St',
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe('This service is not available for online booking');
  });

  it('createBookingRequest inserts and returns success', async () => {
    jest.doMock('@/lib/booking/settings', () => ({
      getBookingSettings: jest.fn(async () => ({
        isEnabled: true,
        enabledServices: ['install', 'repair'],
        autoConfirm: true,
        notifyEmail: null,
      })),
    }));
    const { createBookingRequest } = require('@/lib/booking/requests');
    const res = await createBookingRequest('b1', {
      customerName: 'Carl',
      customerEmail: 'carl@example.com',
      customerPhone: '555-999-0000',
      serviceType: 'install',
      preferredDate: '2025-01-03',
      preferredTimeSlot: '10:00',
      address: '3 Main St',
    });
    expect(res.success).toBe(true);
    expect(res.requestId).toBeDefined();
  });

  it('createBookingRequest handles insert error', async () => {
    jest.doMock('@/lib/booking/settings', () => ({
      getBookingSettings: jest.fn(async () => ({
        isEnabled: true,
        enabledServices: ['install'],
        autoConfirm: false,
        notifyEmail: null,
      })),
    }));
    supabaseState.insertError = { message: 'db error' };
    const { createBookingRequest } = require('@/lib/booking/requests');
    const res = await createBookingRequest('b1', {
      customerName: 'Dana',
      customerEmail: 'dana@example.com',
      customerPhone: '555-777-8888',
      serviceType: 'install',
      preferredDate: '2025-01-04',
      address: '4 Main St',
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe('Failed to create booking request');
  });

  it('createBookingRequest auto-confirms specific time and sends notification', async () => {
    jest.doMock('@/lib/booking/settings', () => ({
      getBookingSettings: jest.fn(async () => ({
        isEnabled: true,
        enabledServices: ['install'],
        autoConfirm: true,
        notifyEmail: 'owner@example.com',
      })),
    }));
    const emailMod = require('@/lib/email');
    const { createBookingRequest } = require('@/lib/booking/requests');
    const res = await createBookingRequest('b1', {
      customerName: 'Ella',
      customerEmail: 'ella@example.com',
      customerPhone: '555-121-3434',
      serviceType: 'install',
      preferredDate: '2025-01-05',
      preferredTimeSlot: '10:30',
      address: '5 Main St',
    });
    expect(res.success).toBe(true);
    expect(supabaseState.lastInsert.confirmed_date).toBe('2025-01-05');
    expect(supabaseState.lastInsert.confirmed_time).toBe('10:30');
    expect(emailMod.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('createBookingRequest assigns existing customer_id when found', async () => {
    jest.doMock('@/lib/booking/settings', () => ({
      getBookingSettings: jest.fn(async () => ({
        isEnabled: true,
        enabledServices: ['install', 'repair'],
        autoConfirm: false,
        notifyEmail: null,
      })),
    }));
    supabaseState.customer = { id: 'cust-1' };
    const { createBookingRequest } = require('@/lib/booking/requests');
    const res = await createBookingRequest('b1', {
      customerName: 'Frank',
      customerEmail: 'frank@example.com',
      customerPhone: '555-444-5555',
      serviceType: 'install',
      preferredDate: '2025-01-06',
      address: '6 Main St',
    });
    expect(res.success).toBe(true);
    expect(supabaseState.lastInsert.customer_id).toBe('cust-1');
  });

  it('createBookingRequest auto-confirms without specific time slot', async () => {
    jest.doMock('@/lib/booking/settings', () => ({
      getBookingSettings: jest.fn(async () => ({
        isEnabled: true,
        enabledServices: ['install'],
        autoConfirm: true,
        notifyEmail: null,
      })),
    }));
    const { createBookingRequest } = require('@/lib/booking/requests');
    const res = await createBookingRequest('b1', {
      customerName: 'Gina',
      customerEmail: 'gina@example.com',
      customerPhone: '555-666-7777',
      serviceType: 'install',
      preferredDate: '2025-01-07',
      address: '7 Main St',
    });
    expect(res.success).toBe(true);
    expect(supabaseState.lastInsert.status).toBe('confirmed');
    expect(supabaseState.lastInsert.confirmed_date).toBeUndefined();
    expect(supabaseState.lastInsert.confirmed_time).toBeUndefined();
  });

  it('createBookingRequest auto-confirms with non-specific slot label', async () => {
    jest.doMock('@/lib/booking/settings', () => ({
      getBookingSettings: jest.fn(async () => ({
        isEnabled: true,
        enabledServices: ['install'],
        autoConfirm: true,
        notifyEmail: null,
      })),
    }));
    const { createBookingRequest } = require('@/lib/booking/requests');
    const res = await createBookingRequest('b1', {
      customerName: 'Hank',
      customerEmail: 'hank@example.com',
      customerPhone: '555-888-9999',
      serviceType: 'install',
      preferredDate: '2025-01-08',
      preferredTimeSlot: 'morning',
      address: '8 Main St',
    });
    expect(res.success).toBe(true);
    expect(supabaseState.lastInsert.status).toBe('confirmed');
    expect(supabaseState.lastInsert.preferred_time_slot).toBe('morning');
    expect(supabaseState.lastInsert.confirmed_date).toBeUndefined();
    expect(supabaseState.lastInsert.confirmed_time).toBeUndefined();
  });
  it('confirmBookingRequest returns not found', async () => {
    supabaseState.request = null;
    const { confirmBookingRequest } = require('@/lib/booking/requests');
    const res = await confirmBookingRequest('req1', 'u1', '2025-02-01', '11:00');
    expect(res.success).toBe(false);
    expect(res.error).toBe('Booking request not found');
  });

  it('confirmBookingRequest returns unavailable when slot blocked', async () => {
    supabaseState.request = { business_id: 'b1', customer_email: 'x@example.com', customer_name: 'X' };
    jest.doMock('@/lib/booking/slots', () => ({
      isSlotAvailable: jest.fn(async () => ({ available: false, reason: 'busy' })),
    }));
    const { confirmBookingRequest } = require('@/lib/booking/requests');
    const res = await confirmBookingRequest('req1', 'u1', '2025-02-02', '13:00');
    expect(res.success).toBe(false);
    expect(res.error).toBe('busy');
  });

  it('confirmBookingRequest success updates and sends email', async () => {
    supabaseState.request = { business_id: 'b1', customer_email: 'y@example.com', customer_name: 'Y' };
    jest.doMock('@/lib/booking/slots', () => ({
      isSlotAvailable: jest.fn(async () => ({ available: true })),
    }));
    const emailMod = require('@/lib/email');
    const { confirmBookingRequest } = require('@/lib/booking/requests');
    const res = await confirmBookingRequest('req2', 'u2', '2025-02-03', '14:00');
    expect(res.success).toBe(true);
    expect(emailMod.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('confirmBookingRequest returns error on update failure', async () => {
    supabaseState.request = { business_id: 'b1', customer_email: 'z@example.com', customer_name: 'Z' };
    supabaseState.updateError = { message: 'fail' };
    jest.doMock('@/lib/booking/slots', () => ({
      isSlotAvailable: jest.fn(async () => ({ available: true })),
    }));
    const { confirmBookingRequest } = require('@/lib/booking/requests');
    const res = await confirmBookingRequest('req2', 'u2', '2025-02-03', '14:00');
    expect(res.success).toBe(false);
    expect(res.error).toBe('Failed to confirm booking');
  });

  it('declineBookingRequest returns success even when request missing', async () => {
    supabaseState.request = null;
    supabaseState.updateError = null;
    const { declineBookingRequest } = require('@/lib/booking/requests');
    const res = await declineBookingRequest('reqX', 'busy');
    expect(res.success).toBe(true);
  });
  
  it('declineBookingRequest sends email when request present', async () => {
    supabaseState.request = {
      id: 'reqD',
      business_id: 'b1',
      customer_email: 'decline@example.com',
      customer_name: 'Declined User',
    };
    supabaseState.updateError = null;
    const emailMod = require('@/lib/email');
    const { declineBookingRequest } = require('@/lib/booking/requests');
    const res = await declineBookingRequest('reqD', 'no availability');
    expect(res.success).toBe(true);
    expect(emailMod.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('convertToJob returns error when request not confirmed', async () => {
    supabaseState.request = {
      id: 'req-2',
      business_id: 'b1',
      status: 'pending',
    };
    const { convertToJob } = require('@/lib/booking/requests');
    const res = await convertToJob('req-2', 'u1');
    expect(res.success).toBe(false);
    expect(res.error).toBe('Only confirmed bookings can be converted to jobs');
  });

  it('convertToJob returns failure when job insert errors', async () => {
    supabaseState.request = {
      id: 'req-3',
      business_id: 'b1',
      status: 'confirmed',
      customer_id: null,
      customer_name: 'N',
      customer_email: 'n@example.com',
      customer_phone: '+15550000000',
      service_type: 'install',
      description: null,
      urgency: 'normal',
      confirmed_date: '2025-03-01',
      confirmed_time: '10:00',
      address: 'A',
      city: null,
      state: null,
      zip: null,
    };
    supabaseState.jobError = { message: 'job fail' };
    const { convertToJob } = require('@/lib/booking/requests');
    const res = await convertToJob('req-3', 'u2');
    expect(res.success).toBe(false);
    expect(res.error).toBe('Failed to create job');
  });

  it('cancelBookingRequest success', async () => {
    supabaseState.updateError = null;
    const { cancelBookingRequest } = require('@/lib/booking/requests');
    const res = await cancelBookingRequest('req3', 'later');
    expect(res.success).toBe(true);
  });

  it('cancelBookingRequest failure on db error', async () => {
    supabaseState.updateError = { message: 'fail' };
    const { cancelBookingRequest } = require('@/lib/booking/requests');
    const res = await cancelBookingRequest('req4', 'reason');
    expect(res.success).toBe(false);
    expect(res.error).toBe('Failed to cancel booking');
  });

  it('updateBookingNotes updates notes', async () => {
    const { updateBookingNotes } = require('@/lib/booking/requests');
    await expect(updateBookingNotes('req5', 'note')).resolves.toBeUndefined();
  });

  it('convertToJob succeeds with existing customer and emergency priority using default duration', async () => {
    supabaseState.request = {
      id: 'req-4',
      business_id: 'b1',
      status: 'confirmed',
      customer_id: 'cust-9',
      customer_name: 'Emergency User',
      customer_email: 'e@example.com',
      customer_phone: '+15551112222',
      service_type: 'repair',
      description: 'Burst pipe',
      urgency: 'emergency',
      confirmed_date: '2025-03-02',
      confirmed_time: '09:00',
      address: '99 Water St',
      city: 'Seattle',
      state: 'WA',
      zip: '98101',
    };
    const { convertToJob } = require('@/lib/booking/requests');
    const res = await convertToJob('req-4', 'u4');
    expect(res.success).toBe(true);
    expect(res.jobId).toBeDefined();
    expect(supabaseState.lastInsert.priority).toBe('high');
    expect(supabaseState.lastInsert.assigned_user_id).toBeNull();
    expect(supabaseState.lastInsert.scheduled_time_start).toBe('09:00');
    expect(supabaseState.lastInsert.scheduled_time_end).toBe('10:00');
  });

  it('convertToJob sets assigned_to and computes end time from estimatedDuration', async () => {
    supabaseState.request = {
      id: 'req-5',
      business_id: 'b1',
      status: 'confirmed',
      customer_id: null,
      customer_name: 'Pro User',
      customer_email: 'pro@example.com',
      customer_phone: '+15553334444',
      service_type: 'install',
      description: 'New unit',
      urgency: 'normal',
      confirmed_date: '2025-03-03',
      confirmed_time: '09:00',
      address: '100 Tech Rd',
      city: 'San Jose',
      state: 'CA',
      zip: '95110',
    };
    supabaseState.insertData = { id: 'cust-2' };
    const { convertToJob } = require('@/lib/booking/requests');
    const res = await convertToJob('req-5', 'u5', { assignedTo: 'tech-7', estimatedDuration: 90, notes: 'Bring parts' });
    expect(res.success).toBe(true);
    expect(res.jobId).toBeDefined();
    expect(supabaseState.lastInsert.assigned_user_id).toBe('tech-7');
    expect(supabaseState.lastInsert.notes).toBe('Bring parts');
    expect(supabaseState.lastInsert.scheduled_time_start).toBe('09:00');
    expect(supabaseState.lastInsert.scheduled_time_end).toBe('10:30');
  });

  it('getBookingRequests applies filters and returns mapped results', async () => {
    supabaseState.queryData = [
      {
        id: 'r1',
        business_id: 'b1',
        customer_id: null,
        customer_name: 'A',
        customer_email: 'a@example.com',
        customer_phone: '+15550000000',
        service_type: 'install',
        description: null,
        urgency: 'normal',
        preferred_date: '2025-01-02',
        preferred_time_slot: null,
        alternate_date: null,
        alternate_time_slot: null,
        address: 'Addr',
        city: null,
        state: null,
        zip: null,
        status: 'pending',
        confirmed_date: null,
        confirmed_time: null,
        confirmed_by: null,
        decline_reason: null,
        job_id: null,
        source: 'website',
        internal_notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    supabaseState.queryCount = 1;
    const { getBookingRequests } = require('@/lib/booking/requests');
    const result = await getBookingRequests('b1', {
      status: 'pending',
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      limit: 5,
      offset: 0,
    });
    expect(result.total).toBe(1);
    expect(result.requests.length).toBe(1);
    expect(result.requests[0].businessId).toBe('b1');
  });

  it('getBookingRequests returns empty when no options', async () => {
    supabaseState.queryData = [];
    supabaseState.queryCount = 0;
    const { getBookingRequests } = require('@/lib/booking/requests');
    const result = await getBookingRequests('b1');
    expect(result.total).toBe(0);
    expect(result.requests.length).toBe(0);
  });
});
