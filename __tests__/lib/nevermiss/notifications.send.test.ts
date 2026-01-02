import { describe, it, expect, jest } from '@jest/globals';

describe('NeverMiss owner notifications sending', () => {
  it('notifyOwner sends sms, email, and push with mocks', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: {
          messages: {
            create: jest.fn(async () => ({ sid: 'SM123' })),
          },
        },
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => ({
          from: () => ({
            insert: async () => ({ error: null }),
          }),
        }),
      }));
      const { notifyOwner, queueNotificationForMorning } = require('@/lib/nevermiss/notifications');
      const lead = {
        leadId: 'L10',
        businessId: 'B1',
        capturedAt: new Date(),
        source: 'inbound_sms',
        customer: { phone: '+15559876543', name: 'Eve', optedOut: false },
        serviceRequest: {
          serviceNeeded: 'Leak repair',
          address: { raw: '10 Oak St, Smalltown, TX', street: '10 Oak St', city: 'Smalltown', state: 'TX', zip: '75001' },
          urgency: 'high',
          urgencyReason: 'today',
          preferredTime: null,
          additionalNotes: null,
        },
        conversation: {
          id: 'C10',
          messageCount: 1,
          durationSeconds: 60,
          smsCount: 1,
          startedAt: new Date(),
          endedAt: new Date(),
          messages: [{ id: 'm1', role: 'customer', content: 'Help please', timestamp: new Date(), twilioSid: undefined, status: 'sent' }],
        },
        status: 'new',
        ownerNotificationMethod: ['sms', 'email', 'push'],
      };
      const settings = {
        businessId: 'B1',
        businessName: 'BizCo',
        ownerName: 'Bob',
        servicesOffered: ['Plumbing'],
        serviceArea: 'Metro',
        phoneNumber: '+15550001111',
        forwardTo: '+15550002222',
        tone: 'friendly',
        greetingStyle: 'direct',
        greetingMessage: 'Hello',
        useOwnerName: true,
        maxMessages: 10,
        businessHoursStart: '09:00',
        businessHoursEnd: '17:00',
        businessDays: [1, 2, 3, 4, 5],
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        timezone: 'UTC',
        afterHoursEnabled: true,
        afterHoursMessage: 'We will contact you',
        emergencyKeywords: ['burst pipe'],
        emergencyAlwaysNotify: true,
        afterHoursNotify: true,
        notifySms: true,
        notifyEmail: true,
        notifyPush: true,
        calendarBookingEnabled: true,
        crmIntegrationEnabled: true,
        autoCreateJobs: false,
      };
      const res = await notifyOwner(lead, settings);
      expect(res.sent).toEqual(expect.arrayContaining(['sms', 'email', 'push']));
      expect(res.failed.length).toBe(0);

      const queued = await queueNotificationForMorning(lead, settings);
      expect(queued.success).toBe(true);
      expect(queued.scheduledFor instanceof Date).toBe(true);
    });
  });

  it('notifyOwner returns failure when forward number missing', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: {
          messages: {
            create: jest.fn(async () => ({ sid: 'SM123' })),
          },
        },
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => ({
          from: () => ({
            insert: async () => ({ error: null }),
          }),
        }),
      }));
      const { notifyOwner } = require('@/lib/nevermiss/notifications');
      const lead = {
        leadId: 'L11',
        businessId: 'B1',
        capturedAt: new Date(),
        source: 'inbound_sms',
        customer: { phone: '+15559876543', name: 'Eve', optedOut: false },
        serviceRequest: {
          serviceNeeded: 'Leak repair',
          address: { raw: '10 Oak St, Smalltown, TX', street: '10 Oak St', city: 'Smalltown', state: 'TX', zip: '75001' },
          urgency: 'high',
          urgencyReason: 'today',
          preferredTime: null,
          additionalNotes: null,
        },
        conversation: {
          id: 'C11',
          messageCount: 1,
          durationSeconds: 60,
          smsCount: 1,
          startedAt: new Date(),
          endedAt: new Date(),
          messages: [{ id: 'm1', role: 'customer', content: 'Help please', timestamp: new Date(), twilioSid: undefined, status: 'sent' }],
        },
        status: 'new',
        ownerNotificationMethod: ['sms'],
      };
      const settings = {
        businessId: 'B1',
        businessName: 'BizCo',
        ownerName: 'Bob',
        servicesOffered: ['Plumbing'],
        serviceArea: 'Metro',
        phoneNumber: '+15550001111',
        forwardTo: '', // missing phone
        tone: 'friendly',
        greetingStyle: 'direct',
        greetingMessage: 'Hello',
        useOwnerName: true,
        maxMessages: 10,
        businessHoursStart: '09:00',
        businessHoursEnd: '17:00',
        businessDays: [1, 2, 3, 4, 5],
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        timezone: 'UTC',
        afterHoursEnabled: true,
        afterHoursMessage: 'We will contact you',
        emergencyKeywords: ['burst pipe'],
        emergencyAlwaysNotify: true,
        afterHoursNotify: true,
        notifySms: true,
        notifyEmail: false,
        notifyPush: false,
        calendarBookingEnabled: true,
        crmIntegrationEnabled: true,
        autoCreateJobs: false,
      };
      const res = await notifyOwner(lead, settings);
      expect(res.sent).not.toContain('sms');
      expect(res.failed.find(f => f.type === 'sms')?.error).toBeDefined();
    });
  });

  it('notifyOwner prioritizes SMS and push for emergencies even when disabled', async () => {
    await jest.isolateModulesAsync(async () => {
      const createMock = jest.fn(async () => ({ sid: 'SM999' }));
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: {
          messages: { create: createMock },
        },
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => ({
          from: () => ({ insert: async () => ({ error: null }) }),
        }),
      }));
      const { notifyOwner } = require('@/lib/nevermiss/notifications');
      const lead = {
        leadId: 'LEMERG',
        businessId: 'B1',
        capturedAt: new Date(),
        source: 'inbound_sms',
        customer: { phone: '+15550101010', name: 'Tim', optedOut: false },
        serviceRequest: {
          serviceNeeded: 'Burst pipe',
          address: { raw: '1 Main, Town, TX', street: '1 Main', city: 'Town', state: 'TX', zip: '75001' },
          urgency: 'emergency',
          urgencyReason: 'flooding',
          preferredTime: null,
          additionalNotes: null,
        },
        conversation: { id: 'C-EM', messageCount: 0, durationSeconds: 0, smsCount: 0, startedAt: new Date(), endedAt: new Date(), messages: [] },
        status: 'new',
        ownerNotificationMethod: [],
      };
      const settings = {
        businessId: 'B1',
        phoneNumber: '+15550000000',
        forwardTo: '+15550009999',
        notifySms: false,
        notifyEmail: false,
        notifyPush: false,
      };
      const res = await notifyOwner(lead as any, settings as any);
      expect(res.sent).toEqual(expect.arrayContaining(['sms', 'push']));
      expect(createMock).toHaveBeenCalled();
    });
  });

  it('notifyOwner records SMS failure when Twilio send throws', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: {
          messages: {
            create: jest.fn(async () => {
              throw new Error('twilio failed');
            }),
          },
        },
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => ({
          from: () => ({ insert: async () => ({ error: null }) }),
        }),
      }));
      const { notifyOwner } = require('@/lib/nevermiss/notifications');
      const lead = {
        leadId: 'L-FAIL',
        businessId: 'B1',
        capturedAt: new Date(),
        source: 'inbound_sms',
        customer: { phone: '+15559876543', name: 'Eve', optedOut: false },
        serviceRequest: { serviceNeeded: 'Leak', address: { raw: 'x', street: 'x', city: 'y', state: 'TX', zip: '75001' }, urgency: 'high' },
        conversation: { id: 'C-FAIL', messageCount: 0, durationSeconds: 0, smsCount: 0, startedAt: new Date(), endedAt: new Date(), messages: [] },
        status: 'new',
        ownerNotificationMethod: [],
      };
      const settings = {
        businessId: 'B1',
        phoneNumber: '+15550001111',
        forwardTo: '+15550002222',
        notifySms: true,
        notifyEmail: false,
        notifyPush: false,
      };
      const res = await notifyOwner(lead as any, settings as any);
      expect(res.failed.find((f) => f.type === 'sms')?.error).toBeDefined();
    });
  });

  it('notifyOwner records Email failure when queue insert errors', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: {
          messages: { create: jest.fn(async () => ({ sid: 'SMX' })) },
        },
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => ({
          from: () => ({
            insert: async () => ({ error: { message: 'insert failed' } }),
          }),
        }),
      }));
      const { notifyOwner } = require('@/lib/nevermiss/notifications');
      const lead = {
        leadId: 'L-EMAIL-FAIL',
        businessId: 'B1',
        capturedAt: new Date(),
        source: 'inbound_sms',
        customer: { phone: '+15550101010', name: 'N', optedOut: false },
        serviceRequest: { serviceNeeded: 'Repair', address: { raw: 'addr', street: 'addr', city: 'c', state: 'TX', zip: '75001' }, urgency: 'medium' },
        conversation: { id: 'C-EF', messageCount: 0, durationSeconds: 0, smsCount: 0, startedAt: new Date(), endedAt: new Date(), messages: [] },
        status: 'new',
        ownerNotificationMethod: [],
      };
      const settings = {
        businessId: 'B1',
        phoneNumber: '+1',
        forwardTo: '+2',
        notifySms: false,
        notifyEmail: true,
        notifyPush: false,
      };
      const res = await notifyOwner(lead as any, settings as any);
      expect(res.failed.find((f) => f.type === 'email')?.error).toBeDefined();
    });
  });

  it('queueNotificationForMorning returns error when insert fails', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => ({
          from: () => ({ insert: async () => ({ error: { message: 'fail' } }) }),
        }),
      }));
      const { queueNotificationForMorning } = require('@/lib/nevermiss/notifications');
      const lead = {
        leadId: 'Q1',
        businessId: 'B1',
        capturedAt: new Date(),
        source: 'inbound_sms',
        customer: { phone: '+1', name: 'A', optedOut: false },
        serviceRequest: { serviceNeeded: 'x', address: { raw: 'y', street: 'y', city: 'c', state: 'TX', zip: '75001' }, urgency: 'low' },
        conversation: { id: 'C-Q', messageCount: 0, durationSeconds: 0, smsCount: 0, startedAt: new Date(), endedAt: new Date(), messages: [] },
        status: 'new',
        ownerNotificationMethod: [],
      };
      const settings = { businessId: 'B1', forwardTo: '+2', businessHoursStart: '09:00' };
      const res = await queueNotificationForMorning(lead as any, settings as any);
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  it('notifyOwner records Push failure when push send throws', async () => {
    await jest.isolateModulesAsync(async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {
        throw new Error('push broke');
      });
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: {
          messages: { create: jest.fn(async () => ({ sid: 'SMX' })) },
        },
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => ({
          from: () => ({ insert: async () => ({ error: null }) }),
        }),
      }));
      const { notifyOwner } = require('@/lib/nevermiss/notifications');
      const lead = {
        leadId: 'L-PUSH-FAIL',
        businessId: 'B1',
        capturedAt: new Date(),
        source: 'inbound_sms',
        customer: { phone: '+15550101010', name: 'N', optedOut: false },
        serviceRequest: { serviceNeeded: 'Repair', address: { raw: 'addr', street: 'addr', city: 'c', state: 'TX', zip: '75001' }, urgency: 'medium' },
        conversation: { id: 'C-PF', messageCount: 0, durationSeconds: 0, smsCount: 0, startedAt: new Date(), endedAt: new Date(), messages: [] },
        status: 'new',
        ownerNotificationMethod: [],
      };
      const settings = {
        businessId: 'B1',
        phoneNumber: '+1',
        forwardTo: '+2',
        notifySms: false,
        notifyEmail: false,
        notifyPush: true,
      };
      const res = await notifyOwner(lead as any, settings as any);
      expect(res.failed.find((f) => f.type === 'push')?.error).toBeDefined();
      logSpy.mockRestore();
    });
  });
});
