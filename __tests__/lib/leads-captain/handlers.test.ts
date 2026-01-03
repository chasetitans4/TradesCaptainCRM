import { describe, it, expect, jest } from '@jest/globals';

describe('lib/leads-captain handlers', () => {
  it('handleLeadsCaptainInboundSMS sends AI reply and updates conversation', async () => {
    await jest.isolateModulesAsync(async () => {
      const twilioCreate = jest.fn(async () => ({ sid: 'sid-reply' }));
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: { messages: { create: twilioCreate } },
      }));
      jest.doMock('@/lib/leads-captain/conversation-engine', () => ({
        generateAIResponse: jest.fn(async () => ({
          response: {
            reply_text: 'Thanks, we can help.',
            state: 'capturing_need',
            extracted: {
              service_needed: 'plumbing',
              address: null,
              urgency: 'medium',
              urgency_reason: null,
              preferred_time: null,
              customer_name: 'John',
              additional_notes: null,
            },
            actions: {
              notify_owner: false,
              notify_urgency: null,
              offer_slots: false,
              end_conversation: false,
              handoff_reason: null,
            },
            confidence: {},
          },
          success: true,
        })),
        generateGreeting: jest.fn(),
        mergeExtractedInfo: (a: any, b: any) => ({ ...a, ...b }),
        isAfterHours: jest.fn(() => false),
        hasRequiredFields: jest.fn(() => false),
        hasExceededMaxMessages: jest.fn(() => false),
        hasTooManyUnansweredMessages: jest.fn(() => false),
      }));
      const saveMessage = jest.fn(async () => ({ id: 'm1', role: 'customer', content: 'hello' }));
      const updateConversation = jest.fn(async () => ({}));
      const createCapturedLead = jest.fn(async () => ({ leadId: 'l1' }));
      const notifyOwner = jest.fn(async () => ({ sent: ['sms'] }));
      const findOrCreateConversation = jest.fn(async () => ({
        conversation: {
          id: 'c1',
          customerId: null,
          messages: [],
          extracted: {},
          messageCount: 0,
          aiMessagesSinceResponse: 0,
          isEmergency: false,
        },
      }));
      const findCustomerByPhone = jest.fn(async () => ({ id: 'cust1', name: 'John' }));
      const getBusinessSettings = jest.fn(async () => ({
        ownerName: 'Owner',
        afterHoursNotify: false,
        maxMessages: 5,
        autoCreateJobs: false,
      }));
      jest.doMock('@/lib/leads-captain/conversation-service', () => ({
        saveMessage,
        updateConversation,
        createCapturedLead,
        notifyOwner,
        findOrCreateConversation,
        findCustomerByPhone,
        getBusinessSettings,
        createJobFromLead: jest.fn(),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          rpc: jest.fn(async () => ({})),
          from: (table: string) => {
            if (table === 'sms_usage') {
              return {
                select: () => ({
                  eq: jest.fn().mockReturnThis(),
                  single: async () => ({
                    data: {
                      id: 'u1',
                      sms_sent: 1,
                      sms_received: 1,
                      sms_limit: 700,
                      notified_80_percent: false,
                      notified_100_percent: false,
                      notified_150_percent: false,
                      period_start: new Date().toISOString(),
                    },
                  }),
                }),
                update: jest.fn(async () => ({})),
              };
            }
            if (table === 'businesses') {
              return {
                select: () => ({
                  eq: jest.fn().mockReturnThis(),
                  single: async () => ({ data: { plan_type: 'gold' } }),
                }),
              };
            }
            if (table === 'plan_leads_captain_features') {
              return {
                select: () => ({
                  eq: jest.fn().mockReturnThis(),
                  single: async () => ({ data: { sms_included: 700 } }),
                }),
              };
            }
            return { select: () => ({ eq: jest.fn().mockReturnThis(), single: async () => ({ data: null }) }) };
          },
        }),
      }));
      const { handleLeadsCaptainInboundSMS } = require('@/lib/leads-captain');
      const res = await handleLeadsCaptainInboundSMS(
        {
          MessageSid: 'SMX',
          SmsSid: 'SMX',
          AccountSid: 'ACX',
          From: '+15551234567',
          To: '+15551112222',
          Body: 'hello',
          NumMedia: '0',
          NumSegments: '1',
        },
        'biz1'
      );
      expect(res.success).toBe(true);
      expect(res.replySent).toBe(true);
      expect(twilioCreate).toHaveBeenCalled();
      expect(saveMessage).toHaveBeenCalled();
      expect(updateConversation).toHaveBeenCalled();
      expect(findCustomerByPhone).toHaveBeenCalled();
    });
  });

  it('handleLeadsCaptainInboundSMS respects max messages path', async () => {
    await jest.isolateModulesAsync(async () => {
      const twilioCreate = jest.fn(async () => ({ sid: 'sid-max' }));
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: { messages: { create: twilioCreate } },
      }));
      jest.doMock('@/lib/leads-captain/conversation-engine', () => ({
        generateAIResponse: jest.fn(),
        generateGreeting: jest.fn(),
        mergeExtractedInfo: (a: any, b: any) => ({ ...a, ...b }),
        isAfterHours: jest.fn(() => false),
        hasRequiredFields: jest.fn(() => false),
        hasExceededMaxMessages: jest.fn(() => true),
        hasTooManyUnansweredMessages: jest.fn(() => false),
      }));
      jest.doMock('@/lib/leads-captain/notifications', () => ({
        notifyOwner: jest.fn(async () => ({ sent: ['sms'] })),
        queueNotificationForMorning: jest.fn(async () => ({})),
      }));
      const saveMessage = jest.fn(async () => ({ id: 'm2', role: 'customer', content: 'hello' }));
      const updateConversation = jest.fn(async () => ({}));
      const findOrCreateConversation = jest.fn(async () => ({
        conversation: {
          id: 'c2',
          customerId: null,
          messages: [],
          extracted: {},
          messageCount: 5,
          aiMessagesSinceResponse: 0,
          isEmergency: false,
        },
      }));
      jest.doMock('@/lib/leads-captain/conversation-service', () => ({
        saveMessage,
        updateConversation,
        createCapturedLead: jest.fn(async () => ({ leadId: 'l2' })),
        notifyOwner: jest.fn(async () => ({ sent: ['sms'] })),
        findOrCreateConversation,
        findCustomerByPhone: jest.fn(async () => null),
        getBusinessSettings: jest.fn(async () => ({
          ownerName: 'Owner',
          afterHoursNotify: false,
          maxMessages: 5,
          autoCreateJobs: false,
        })),
        createJobFromLead: jest.fn(),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          rpc: jest.fn(async () => ({})),
          from: (table: string) => ({
            select: () => ({
              eq: jest.fn().mockReturnThis(),
              single: async () => ({ data: null }),
            }),
            update: jest.fn(async () => ({})),
          }),
        }),
      }));
      const { handleLeadsCaptainInboundSMS } = require('@/lib/leads-captain');
      const res = await handleLeadsCaptainInboundSMS(
        {
          MessageSid: 'SMY',
          SmsSid: 'SMY',
          AccountSid: 'ACY',
          From: '+15550000001',
          To: '+15551112222',
          Body: 'more',
          NumMedia: '0',
          NumSegments: '1',
        },
        'biz2'
      );
      expect(res.success).toBe(true);
      expect(res.replySent).toBe(true);
      expect(twilioCreate).toHaveBeenCalled();
      expect(updateConversation).toHaveBeenCalled();
    });
  });

  it('handleMissedCall sends greeting and tracks usage', async () => {
    await jest.isolateModulesAsync(async () => {
      const twilioCreate = jest.fn(async () => ({ sid: 'sid-greet' }));
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: { messages: { create: twilioCreate } },
      }));
      jest.doMock('@/lib/leads-captain/conversation-engine', () => ({
        generateGreeting: jest.fn(() => 'Hello'),
        isAfterHours: jest.fn(() => false),
      }));
      const findOrCreateConversation = jest.fn(async () => ({
        conversation: {
          id: 'c3',
          messages: [],
        },
        isNew: true,
      }));
      jest.doMock('@/lib/leads-captain/conversation-service', () => ({
        findOrCreateConversation,
        saveMessage: jest.fn(async () => ({ id: 'm3' })),
        updateConversation: jest.fn(async () => ({})),
        logWebhookEvent: jest.fn(async () => ({ isNew: true })),
        markEventProcessed: jest.fn(async () => ({})),
        getBusinessSettings: jest.fn(async () => ({
          businessName: 'Biz',
          ownerName: 'Owner',
          businessHoursStart: '08:00',
          businessHoursEnd: '17:00',
          businessDays: [1,2,3,4,5],
          maxMessages: 5,
          greetingStyle: 'apologetic',
          tone: 'friendly',
          servicesOffered: ['plumbing'],
          serviceArea: 'City',
        })),
        findBusinessByPhone: jest.fn(async () => 'biz3'),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          rpc: jest.fn(async () => ({})),
          from: (table: string) => ({
            select: () => ({
              eq: jest.fn().mockReturnThis(),
              single: async () => {
                if (table === 'sms_suppression_list') return { data: null };
                if (table === 'businesses') return { data: { id: 'biz3', name: 'Biz' } };
                return { data: null };
              },
            }),
          }),
        }),
      }));
      const { handleMissedCall } = require('@/lib/leads-captain');
      const res = await handleMissedCall({
        CallSid: 'CS1',
        AccountSid: 'AC1',
        From: '+15551230000',
        To: '+15551112222',
        CallStatus: 'no-answer',
        Direction: 'inbound',
        Timestamp: new Date().toISOString(),
      });
      expect(res.success).toBe(true);
      expect(twilioCreate).toHaveBeenCalled();
      expect(findOrCreateConversation).toHaveBeenCalled();
    });
  });

  it('handleMissedCall returns error when business not found', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/leads-captain/conversation-service', () => ({
        findBusinessByPhone: jest.fn(async () => null),
      }));
      const { handleMissedCall } = require('@/lib/leads-captain');
      const res = await handleMissedCall({
        CallSid: 'CSX',
        AccountSid: 'ACX',
        From: '+15550000001',
        To: '+15551112222',
        CallStatus: 'no-answer',
        Direction: 'inbound',
        Timestamp: new Date().toISOString(),
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Business not found');
    });
  });

  it('handleMissedCall returns error when event already processed', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/leads-captain/conversation-service', () => ({
        findBusinessByPhone: jest.fn(async () => 'bizX'),
        logWebhookEvent: jest.fn(async () => ({ isNew: false })),
      }));
      const { handleMissedCall } = require('@/lib/leads-captain');
      const res = await handleMissedCall({
        CallSid: 'CSY',
        AccountSid: 'ACY',
        From: '+15550000002',
        To: '+15551112222',
        CallStatus: 'no-answer',
        Direction: 'inbound',
        Timestamp: new Date().toISOString(),
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('already processed');
    });
  });

  it('handleMissedCall returns error when phone suppressed', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/leads-captain/conversation-service', () => ({
        findBusinessByPhone: jest.fn(async () => 'bizS'),
        logWebhookEvent: jest.fn(async () => ({ isNew: true })),
        getBusinessSettings: jest.fn(async () => ({ })),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => ({
            select: () => ({
              eq: jest.fn().mockReturnThis(),
              single: async () => ({ data: table === 'sms_suppression_list' ? { id: 'sup' } : null }),
            }),
          }),
        }),
      }));
      const { handleMissedCall } = require('@/lib/leads-captain');
      const res = await handleMissedCall({
        CallSid: 'CSZ',
        AccountSid: 'ACZ',
        From: '+15550000003',
        To: '+15551112222',
        CallStatus: 'no-answer',
        Direction: 'inbound',
        Timestamp: new Date().toISOString(),
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('suppressed');
    });
  });

  it('handleMissedCall returns early for existing conversation', async () => {
    await jest.isolateModulesAsync(async () => {
      const markEventProcessed = jest.fn(async () => ({}));
      const twilioCreate = jest.fn();
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: { messages: { create: twilioCreate } },
      }));
      jest.doMock('@/lib/leads-captain/conversation-service', () => ({
        findBusinessByPhone: jest.fn(async () => 'bizE'),
        logWebhookEvent: jest.fn(async () => ({ isNew: true })),
        getBusinessSettings: jest.fn(async () => ({ })),
        findOrCreateConversation: jest.fn(async () => ({
          conversation: { id: 'cE', messages: [{ id: 'm' }] },
          isNew: false,
        })),
        markEventProcessed,
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => ({
            select: () => ({
              eq: jest.fn().mockReturnThis(),
              single: async () => ({ data: null }),
            }),
          }),
        }),
      }));
      const { handleMissedCall } = require('@/lib/leads-captain');
      const res = await handleMissedCall({
        CallSid: 'CSA',
        AccountSid: 'ACA',
        From: '+15550000004',
        To: '+15551112222',
        CallStatus: 'no-answer',
        Direction: 'inbound',
        Timestamp: new Date().toISOString(),
      });
      expect(res.success).toBe(true);
      expect(res.conversationId).toBe('cE');
      expect(markEventProcessed).toHaveBeenCalled();
      expect(twilioCreate).not.toHaveBeenCalled();
    });
  });

  it('handleLeadsCaptainInboundSMS returns error when settings missing', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/leads-captain/conversation-service', () => ({
        getBusinessSettings: jest.fn(async () => null),
      }));
      const { handleLeadsCaptainInboundSMS } = require('@/lib/leads-captain');
      const res = await handleLeadsCaptainInboundSMS(
        {
          MessageSid: 'SMZ',
          SmsSid: 'SMZ',
          AccountSid: 'ACZ',
          From: '+15550000010',
          To: '+15551112222',
          Body: 'hello',
          NumMedia: '0',
          NumSegments: '1',
        },
        'bizZ'
      );
      expect(res.success).toBe(false);
      expect(res.replySent).toBe(false);
      expect(res.error).toContain('settings not found');
    });
  });

  it('handleLeadsCaptainInboundSMS queues morning notification when after hours', async () => {
    await jest.isolateModulesAsync(async () => {
      const queueNotificationForMorning = jest.fn(async () => ({}));
      const notifyOwner = jest.fn(async () => ({ sent: ['sms'] }));
      jest.doMock('@/lib/leads-captain/notifications', () => ({
        notifyOwner,
        queueNotificationForMorning,
      }));
      jest.doMock('@/lib/leads-captain/conversation-engine', () => ({
        generateAIResponse: jest.fn(async () => ({
          response: {
            reply_text: 'We can help.',
            state: 'capturing_need',
            extracted: { service_needed: 'plumbing' },
            actions: {
              notify_owner: true,
              notify_urgency: null,
              end_conversation: false,
            },
            confidence: {},
          },
          success: true,
        })),
        mergeExtractedInfo: (a: any, b: any) => ({ ...a, ...b }),
        isAfterHours: jest.fn(() => true),
        hasRequiredFields: jest.fn(() => false),
        hasExceededMaxMessages: jest.fn(() => false),
      }));
      const updateConversation = jest.fn(async () => ({}));
      const saveMessage = jest.fn(async () => ({ id: 'mX', role: 'customer', content: 'hello' }));
      jest.doMock('@/lib/leads-captain/conversation-service', () => ({
        saveMessage,
        updateConversation,
        findOrCreateConversation: jest.fn(async () => ({
          conversation: {
            id: 'cX',
            customerId: null,
            messages: [],
            extracted: {},
            messageCount: 0,
            aiMessagesSinceResponse: 0,
            isEmergency: false,
            ownerNotified: false,
          },
        })),
        findCustomerByPhone: jest.fn(async () => null),
        getBusinessSettings: jest.fn(async () => ({
          afterHoursNotify: false,
          maxMessages: 5,
          autoCreateJobs: false,
        })),
        createCapturedLead: jest.fn(async () => ({ leadId: 'lX' })),
        createJobFromLead: jest.fn(),
      }));
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: { messages: { create: jest.fn(async () => ({ sid: 'sidX' })) } },
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          rpc: jest.fn(async () => ({})),
          from: (table: string) => ({
            select: () => ({
              eq: jest.fn().mockReturnThis(),
              single: async () => ({ data: null }),
            }),
            update: jest.fn(async () => ({})),
          }),
        }),
      }));
      const { handleLeadsCaptainInboundSMS } = require('@/lib/leads-captain');
      const res = await handleLeadsCaptainInboundSMS(
        {
          MessageSid: 'SMN',
          SmsSid: 'SMN',
          AccountSid: 'ACN',
          From: '+15550000011',
          To: '+15551112222',
          Body: 'details',
          NumMedia: '0',
          NumSegments: '1',
        },
        'bizN'
      );
      expect(res.success).toBe(true);
      expect(queueNotificationForMorning).toHaveBeenCalled();
      expect(notifyOwner).not.toHaveBeenCalled();
      expect(updateConversation).toHaveBeenCalled();
    });
  });
});
