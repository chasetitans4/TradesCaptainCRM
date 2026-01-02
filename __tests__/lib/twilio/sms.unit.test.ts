import { describe, it, expect, jest } from '@jest/globals';

describe('lib/twilio/sms', () => {
  it('formats phone numbers to E.164', async () => {
    await jest.isolateModulesAsync(async () => {
      const mod = require('@/lib/twilio/sms');
      expect(mod.formatPhoneE164('555-123-4567')).toBe('+15551234567');
      expect(mod.formatPhoneE164('+1 (555) 123-4567')).toBe('+15551234567');
      expect(mod.formatPhoneE164('15551234567')).toBe('+15551234567');
      expect(mod.formatPhoneE164('+44 20 7946 0958')).toBe('+442079460958');
    });
  });

  it('sends SMS and logs with conversation provided', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: { messages: { create: jest.fn(async () => ({ sid: 'SMX', from: '+15551112222' })) } },
        messagingServiceSid: undefined,
        getWebhookUrl: (p: string) => 'https://app' + p,
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return { select: () => ({ eq: () => ({ single: async () => ({ data: { twilio_phone_number: '+15551112222' } }) }) }) };
            }
            if (table === 'sms_messages') {
              return { insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'msg1' } }) }) }) };
            }
            return { insert: jest.fn(async () => ({})), update: jest.fn(async () => ({})) };
          },
          rpc: jest.fn(async () => ({})),
        }),
      }));
      const { sendSMS } = require('@/lib/twilio/sms');
      const res = await sendSMS({
        to: '555-123-4567',
        body: 'hello',
        businessId: 'biz1',
        conversationId: 'conv1',
        senderId: 'u1',
        isAIResponse: true,
      });
      expect(res.success).toBe(true);
      expect(res.twilioSid).toBe('SMX');
      expect(res.fromNumber).toBe('+15551112222');
    });
  });

  it('handles Twilio API failure and returns error', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: { messages: { create: jest.fn(async () => { throw new Error('rate limit'); }) } },
        messagingServiceSid: undefined,
        getWebhookUrl: (p: string) => 'https://app' + p,
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return { select: () => ({ eq: () => ({ single: async () => ({ data: { twilio_phone_number: '+15551112222' } }) }) }) };
            }
            if (table === 'sms_messages') {
              return { insert: jest.fn(async () => ({ data: {}, error: null })) };
            }
            return { insert: jest.fn(async () => ({ data: {}, error: null })), update: jest.fn(async () => ({})) };
          },
          rpc: jest.fn(async () => ({})),
        }),
      }));
      const { sendSMS } = require('@/lib/twilio/sms');
      const res = await sendSMS({
        to: '555-123-4567',
        body: 'hello',
        businessId: 'biz1',
        conversationId: 'conv1',
      });
      expect(res.success).toBe(false);
      expect((res.error || '').length).toBeGreaterThan(0);
    });
  });

  it('updates message status with priority rules', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => ({
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: { id: 'm1', status: 'sent' },
                }),
              }),
            }),
            update: jest.fn(() => ({
              eq: jest.fn(async () => ({ data: {}, error: null })),
            })),
          }),
        }),
      }));
      const { updateMessageStatus } = require('@/lib/twilio/sms');
      const applied = await updateMessageStatus('SMX', 'delivered', undefined);
      expect(applied.applied).toBe(true);
      jest.resetModules();
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => ({
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: { id: 'm1', status: 'delivered' },
                }),
              }),
            }),
            update: jest.fn(() => ({
              eq: jest.fn(async () => ({ data: {}, error: null })),
            })),
          }),
        }),
      }));
      const { updateMessageStatus: update2 } = require('@/lib/twilio/sms');
      const applied2 = await update2('SMX', 'failed', 'error');
      expect(applied2.applied).toBe(false);
      expect(applied2.reason).toBe('not_higher_priority');
    });
  });
});
