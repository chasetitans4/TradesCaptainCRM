import { describe, it, expect, jest } from '@jest/globals';

describe('lib/leads-captain core', () => {
  it('handles STOP compliance and updates suppression and conversations', async () => {
    await jest.isolateModulesAsync(async () => {
      const upsert = jest.fn(() => ({}));
      const update = jest.fn(() => ({
        eq: jest.fn().mockReturnThis(),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => ({
            upsert,
            update,
            select: () => ({
              eq: () => ({ single: async () => ({ data: null }) }),
            }),
            eq: () => ({
              single: async () => ({ data: null }),
            }),
          }),
        }),
      }));
      const { handleComplianceKeywords } = require('@/lib/leads-captain');
      const result = await handleComplianceKeywords('STOP', '+15551234567', 'biz1', 'Biz');
      expect(result.handled).toBe(true);
      expect(result.response).toContain('Reply START');
      expect(upsert).toHaveBeenCalled();
      expect(update).toHaveBeenCalled();
  });
});

describe('lib/leads-captain inbound SMS branches', () => {
  it('handleLeadsCaptainInboundSMS triggers max messages path and notifies owner', async () => {
    await jest.isolateModulesAsync(async () => {
      const createMock = jest.fn(async () => ({ sid: 'SMSG1' }));
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: {
          messages: { create: createMock },
        },
      }));
      const updateConversation = jest.fn(async () => ({}));
      const saveMessage = jest.fn(async () => ({
        id: 'm1',
        role: 'assistant',
        content: 'max reached',
        timestamp: new Date(),
        status: 'queued',
      }));
      const createCapturedLead = jest.fn(async () => ({
        leadId: 'lead1',
        ownerNotificationMethod: [],
      }));
      jest.doMock('@/lib/leads-captain/conversation-service', () => ({
        getBusinessSettings: async () => ({
          ownerName: 'Owner',
          timezone: 'UTC',
          maxMessages: 1,
          afterHoursNotify: true,
          autoCreateJobs: false,
        }),
        findOrCreateConversation: async () => ({
          conversation: {
            id: 'conv-max',
            businessId: 'biz1',
            customerPhone: '+1555',
            businessPhone: '+1444',
            state: 'active',
            previousStates: [],
            extracted: { serviceNeeded: null, address: null, urgency: null, urgencyReason: null, preferredTime: null, customerName: null, additionalNotes: null },
            messages: [],
            messageCount: 10,
            aiMessagesSinceResponse: 0,
            startedAt: new Date(),
            isAfterHours: false,
            isEmergency: false,
            ownerNotified: false,
          },
          isNew: false,
        }),
        findCustomerByPhone: async () => null,
        saveMessage,
        updateConversation,
        createCapturedLead,
      }));
      const notifyOwner = jest.fn(async () => ({ sent: ['sms'] }));
      jest.doMock('@/lib/leads-captain/notifications', () => ({
        notifyOwner,
        queueNotificationForMorning: jest.fn(async () => ({})),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          rpc: jest.fn(async () => ({})),
          from: (_table: string) => ({
            select: () => ({
              eq: jest.fn().mockReturnThis(),
              single: async () => ({
                data: {
                  id: 'u1',
                  sms_sent: 0,
                  sms_received: 0,
                  sms_limit: 700,
                  notified_80_percent: false,
                  notified_100_percent: false,
                  notified_150_percent: false,
                  period_start: new Date().toISOString(),
                },
              }),
            }),
            update: jest.fn(async () => ({})),
          }),
        }),
      }));
      jest.doMock('@/lib/leads-captain/conversation-engine', () => ({
        hasExceededMaxMessages: () => true,
        isAfterHours: () => false,
        generateGreeting: () => 'Hi',
        mergeExtractedInfo: (a: any) => a,
      }));

      const { handleLeadsCaptainInboundSMS } = require('@/lib/leads-captain');
      const res = await handleLeadsCaptainInboundSMS(
        { MessageSid: 'MSX', From: '+15550001111', To: '+15551112222', Body: 'Hi' },
        'biz1'
      );
      expect(res.success).toBe(true);
      expect(res.replySent).toBe(true);
      expect(createMock).toHaveBeenCalled();
      expect(createCapturedLead).toHaveBeenCalled();
      expect(notifyOwner).toHaveBeenCalled();
      expect(updateConversation).toHaveBeenCalled();
    });
  });

  it('handleLeadsCaptainInboundSMS queues notification for morning when after hours and non-emergency', async () => {
    await jest.isolateModulesAsync(async () => {
      const createMock = jest.fn(async () => ({ sid: 'SMSG2' }));
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: {
          messages: { create: createMock },
        },
      }));
      const updateConversation = jest.fn(async () => ({}));
      const saveMessage = jest.fn(async () => ({
        id: 'm2',
        role: 'assistant',
        content: 'AI reply',
        timestamp: new Date(),
        status: 'queued',
      }));
      const createCapturedLead = jest.fn(async () => ({
        leadId: 'lead2',
        ownerNotificationMethod: [],
      }));
      const createJobFromLead = jest.fn(async () => 'job1');
      jest.doMock('@/lib/leads-captain/conversation-service', () => ({
        getBusinessSettings: async () => ({
          ownerName: 'Owner',
          timezone: 'UTC',
          maxMessages: 10,
          afterHoursNotify: false,
          autoCreateJobs: true,
        }),
        findOrCreateConversation: async () => ({
          conversation: {
            id: 'conv-ah',
            businessId: 'biz1',
            customerPhone: '+1555',
            businessPhone: '+1444',
            state: 'active',
            previousStates: [],
            extracted: { serviceNeeded: null, address: null, urgency: null, urgencyReason: null, preferredTime: null, customerName: null, additionalNotes: null },
            messages: [],
            messageCount: 1,
            aiMessagesSinceResponse: 0,
            startedAt: new Date(),
            isAfterHours: true,
            isEmergency: false,
            ownerNotified: false,
          },
          isNew: false,
        }),
        findCustomerByPhone: async () => null,
        saveMessage,
        updateConversation,
        createCapturedLead,
        createJobFromLead,
      }));
      const queueNotificationForMorning = jest.fn(async () => ({}));
      const notifyOwner = jest.fn(async () => ({ sent: ['sms'] }));
      jest.doMock('@/lib/leads-captain/notifications', () => ({
        notifyOwner,
        queueNotificationForMorning,
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          rpc: jest.fn(async () => ({})),
          from: (_table: string) => ({
            select: () => ({
              eq: jest.fn().mockReturnThis(),
              single: async () => ({
                data: {
                  id: 'u1',
                  sms_sent: 0,
                  sms_received: 0,
                  sms_limit: 700,
                  notified_80_percent: false,
                  notified_100_percent: false,
                  notified_150_percent: false,
                  period_start: new Date().toISOString(),
                },
              }),
            }),
            update: jest.fn(async () => ({})),
          }),
        }),
      }));
      jest.doMock('@/lib/leads-captain/conversation-engine', () => ({
        hasExceededMaxMessages: () => false,
        isAfterHours: () => true,
        mergeExtractedInfo: (a: any, b: any) => ({ ...a, ...b }),
        hasRequiredFields: (extracted: any) => Boolean(extracted?.serviceNeeded) && Boolean(extracted?.address),
        generateAIResponse: async () => ({
          success: true,
          response: {
            reply_text: 'Thanks! Can you share the address?',
            state: 'capturing_address',
            extracted: { service_needed: 'Leak', address: null, urgency: 'medium', urgency_reason: null, preferred_time: null, customer_name: null, additional_notes: null },
            actions: { notify_owner: true, notify_urgency: null, offer_slots: false, end_conversation: false, handoff_reason: null, create_job: false },
            confidence: {},
          },
        }),
      }));

      const { handleLeadsCaptainInboundSMS } = require('@/lib/leads-captain');
      const res = await handleLeadsCaptainInboundSMS(
        { MessageSid: 'MSY', From: '+15550002222', To: '+15551113333', Body: 'I need help' },
        'biz1'
      );
      expect(res.success).toBe(true);
      expect(res.replySent).toBe(true);
      expect(createMock).toHaveBeenCalled();
      expect(queueNotificationForMorning).toHaveBeenCalled();
      expect(notifyOwner).not.toHaveBeenCalled();
      expect(createJobFromLead).toHaveBeenCalled();
      expect(updateConversation).toHaveBeenCalledWith('conv-ah', expect.objectContaining({ ownerNotified: true }));
    });
  });
});

  it('handles HELP compliance and returns info', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: () => ({
            upsert: jest.fn(),
            update: jest.fn(),
            select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }),
            eq: () => ({ single: async () => ({ data: null }) }),
          }),
        }),
      }));
      const { handleComplianceKeywords } = require('@/lib/leads-captain');
      const result = await handleComplianceKeywords('HELP', '+15551234567', 'biz1', 'Biz');
      expect(result.handled).toBe(true);
      expect(result.response).toContain('Reply STOP');
    });
  });

  it('handles START compliance and disables suppression', async () => {
    await jest.isolateModulesAsync(async () => {
      const update = jest.fn(() => ({
        eq: jest.fn().mockReturnThis(),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: () => ({
            update,
            select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }),
            eq: () => ({ single: async () => ({ data: null }) }),
          }),
        }),
      }));
      const { handleComplianceKeywords } = require('@/lib/leads-captain');
      const result = await handleComplianceKeywords('START', '+15551234567', 'biz1', 'Biz');
      expect(result.handled).toBe(true);
      expect(result.response).toContain("You're resubscribed");
      expect(update).toHaveBeenCalled();
    });
  });

  it('checks suppression list', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: () => ({
            select: () => ({
              eq: jest.fn().mockReturnThis(),
              single: async () => ({ data: { id: 's1' } }),
            }),
          }),
        }),
      }));
      const { isPhoneSuppressed } = require('@/lib/leads-captain');
      const suppressed = await isPhoneSuppressed('biz1', '+15551234567');
      expect(suppressed).toBe(true);
    });
  });

  it('detects emergency urgency and negation', async () => {
    await jest.isolateModulesAsync(async () => {
      const { detectUrgency } = require('@/lib/leads-captain');
      const emergency = detectUrgency('Burst pipe with flooding');
      expect(emergency.level).toBe('emergency');
      const negated = detectUrgency('not urgent, no rush');
      expect(negated.level).toBe('high');
    });
  });

  it('tracks SMS usage and soft caps', async () => {
    await jest.isolateModulesAsync(async () => {
      const rpc = jest.fn(async () => ({}));
      const update = jest.fn(async () => ({}));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          rpc,
          from: (table: string) => {
            if (table === 'sms_usage') {
              return {
                select: () => ({
                  eq: jest.fn().mockReturnThis(),
                  single: async () => ({
                    data: {
                      id: 'u1',
                      sms_sent: 500,
                      sms_received: 200,
                      sms_limit: 700,
                      notified_80_percent: false,
                      notified_100_percent: false,
                      notified_150_percent: false,
                      period_start: new Date().toISOString(),
                    },
                  }),
                }),
                update,
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
      const { incrementSMSUsage } = require('@/lib/leads-captain');
      await incrementSMSUsage('biz1', 'sent');
      await new Promise((r) => setTimeout(r, 10));
      expect(rpc).toHaveBeenCalled();
      expect(update).toHaveBeenCalled();
    });
  });

  it('checks plan features and access', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return {
                select: () => ({
                  eq: () => ({ single: async () => ({ data: { plan_type: 'silver', ai_sms_enabled: true, has_leads_captain_addon: true } }) }),
                }),
              };
            }
            if (table === 'plan_leads_captain_features') {
              return {
                select: () => ({
                  eq: () => ({ single: async () => ({ data: { includes_leads_captain: true, can_book_calendar: true, sms_included: 800 } }) }),
                }),
              };
            }
            return { select: () => ({}) };
          },
        }),
      }));
      const { hasLeadsCaptainAccess, canBookCalendar, getSMSLimit } = require('@/lib/leads-captain');
      const access = await hasLeadsCaptainAccess('biz1');
      expect(access).toBe(true);
      const canBook = await canBookCalendar('biz1');
      expect(canBook).toBe(true);
      const limit = await getSMSLimit('biz1');
      expect(limit).toBe(800);
    });
  });

  it('evaluates quiet hours including overnight window', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-01T22:30:00Z'));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: () => ({
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: { timezone: 'UTC', quiet_hours_start: '21:00', quiet_hours_end: '07:00' },
                }),
              }),
            }),
          }),
        }),
      }));
      const { isQuietHours } = require('@/lib/leads-captain');
      const qh = await isQuietHours('biz1');
      expect(qh).toBe(true);
      jest.useRealTimers();
    });
  });

  it('detects abuse patterns and blocks when violations present', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'sms_messages') {
              return {
                select: () => ({
                  eq: () => ({
                    eq: () => ({
                      gte: () => Promise.resolve({ count: 25 }),
                    }),
                  }),
                }),
              };
            }
            return { select: () => ({}) };
          },
        }),
      }));
      const { checkForAbuse } = require('@/lib/leads-captain');
      const message = 'This is a threat to kill you, fuck you! https://malicious.example';
      const res = await checkForAbuse('conv1', message);
      expect(res.isAbusive).toBe(true);
      expect(res.violations).toEqual(expect.arrayContaining(['violence_threat', 'harassment']));
      expect(res.suspicions).toEqual(expect.arrayContaining(['contains_url']));
      expect(res.shouldBlock).toBe(true);
    });
  });

  it('flags emoji-only messages as suspicious but does not block alone', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: () => ({
            select: () => ({
              eq: () => ({
                eq: () => ({
                  gte: () => Promise.resolve({ count: 0 }),
                }),
              }),
            }),
          }),
        }),
      }));
      const { checkForAbuse } = require('@/lib/leads-captain');
      const res = await checkForAbuse('conv2', '😊😊😊');
      expect(res.isAbusive).toBe(false);
      expect(res.suspicions).toEqual(expect.arrayContaining(['emoji_only']));
      expect(res.shouldBlock).toBe(false);
    });
  });

  it('blocks conversation and adds suppression when abusive', async () => {
    await jest.isolateModulesAsync(async () => {
      const update = jest.fn(() => ({ eq: jest.fn().mockReturnThis() }));
      const upsert = jest.fn(async () => ({}));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'sms_conversations') {
              return { update };
            }
            if (table === 'sms_suppression_list') {
              return { upsert };
            }
            return { select: () => ({}) };
          },
        }),
      }));
      const { blockForAbuse } = require('@/lib/leads-captain');
      await blockForAbuse('conv3', 'biz1', '+15550001111', 'spam');
      expect(update).toHaveBeenCalled();
      expect(upsert).toHaveBeenCalled();
    });
  });

  it('handleMissedCall returns early when business not found', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/leads-captain/conversation-service', () => ({
        findBusinessByPhone: async () => null,
      }));
      const { handleMissedCall } = require('@/lib/leads-captain');
      const res = await handleMissedCall({ CallSid: 'CS1', From: '+15550002222', To: '+15551112222', CallStatus: 'completed' });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Business not found');
    });
  });

  it('handleMissedCall returns early when event already processed', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/leads-captain/conversation-service', () => ({
        findBusinessByPhone: async () => 'biz1',
        logWebhookEvent: async () => ({ isNew: false }),
      }));
      const { handleMissedCall } = require('@/lib/leads-captain');
      const res = await handleMissedCall({ CallSid: 'CS2', From: '+15550002222', To: '+15551112222', CallStatus: 'completed' });
      expect(res.success).toBe(false);
      expect(res.error).toContain('already processed');
    });
  });

  it('handleLeadsCaptainInboundSMS returns error when settings missing', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/leads-captain/conversation-service', () => ({
        getBusinessSettings: async () => null,
      }));
      const { handleLeadsCaptainInboundSMS } = require('@/lib/leads-captain');
      const res = await handleLeadsCaptainInboundSMS({ MessageSid: 'MS1', From: '+15550003333', To: '+15551112222', Body: 'Hello' }, 'biz1');
      expect(res.success).toBe(false);
      expect(res.replySent).toBe(false);
      expect(res.error).toContain('settings not found');
    });
  });

  it('evaluates quiet hours for non-overnight window', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-01T10:00:00Z'));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: () => ({
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: { timezone: 'UTC', quiet_hours_start: '08:00', quiet_hours_end: '18:00' },
                }),
              }),
            }),
          }),
        }),
      }));
      const { isQuietHours } = require('@/lib/leads-captain');
      const qh = await isQuietHours('biz2');
      expect(qh).toBe(true);
      jest.useRealTimers();
    });
  });
});

describe('lib/leads-captain inbound SMS additional branches', () => {
  it('marks lead captured and notifies owner when required fields and end_conversation', async () => {
    await jest.isolateModulesAsync(async () => {
      const createMock = jest.fn(async () => ({ sid: 'SMSG3' }));
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: {
          messages: { create: createMock },
        },
      }));
      const updateConversation = jest.fn(async () => ({}));
      const saveMessage = jest.fn(async () => ({
        id: 'm3',
        role: 'assistant',
        content: 'AI reply',
        timestamp: new Date(),
        status: 'queued',
      }));
      const createCapturedLead = jest.fn(async () => ({
        leadId: 'lead3',
        ownerNotificationMethod: [],
      }));
      jest.doMock('@/lib/leads-captain/conversation-service', () => ({
        getBusinessSettings: async () => ({
          ownerName: 'Owner',
          timezone: 'UTC',
          maxMessages: 10,
          afterHoursNotify: true,
          autoCreateJobs: false,
        }),
        findOrCreateConversation: async () => ({
          conversation: {
            id: 'conv-lc',
            businessId: 'biz1',
            customerPhone: '+1555',
            businessPhone: '+1444',
            state: 'active',
            previousStates: [],
            extracted: { serviceNeeded: null, address: null, urgency: null, urgencyReason: null, preferredTime: null, customerName: null, additionalNotes: null },
            messages: [],
            messageCount: 1,
            aiMessagesSinceResponse: 0,
            startedAt: new Date(),
            isAfterHours: false,
            isEmergency: false,
            ownerNotified: false,
          },
        }),
        findCustomerByPhone: async () => null,
        saveMessage,
        updateConversation,
        createCapturedLead,
      }));
      const notifyOwner = jest.fn(async () => ({ sent: ['sms'] }));
      jest.doMock('@/lib/leads-captain/notifications', () => ({
        notifyOwner,
        queueNotificationForMorning: jest.fn(async () => ({})),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          rpc: jest.fn(async () => ({})),
          from: (_table: string) => ({
            select: () => ({
              eq: jest.fn().mockReturnThis(),
              single: async () => ({
                data: {
                  id: 'u1',
                  sms_sent: 0,
                  sms_received: 0,
                  sms_limit: 700,
                  notified_80_percent: false,
                  notified_100_percent: false,
                  notified_150_percent: false,
                  period_start: new Date().toISOString(),
                },
              }),
            }),
            update: jest.fn(async () => ({})),
          }),
        }),
      }));
      jest.doMock('@/lib/leads-captain/conversation-engine', () => ({
        hasExceededMaxMessages: () => false,
        isAfterHours: () => false,
        mergeExtractedInfo: (a: any, b: any) => ({
          serviceNeeded: b?.service_needed ?? a?.serviceNeeded ?? null,
          address: b?.address ?? a?.address ?? null,
          urgency: b?.urgency ?? a?.urgency ?? null,
          urgencyReason: b?.urgency_reason ?? a?.urgencyReason ?? null,
          preferredTime: b?.preferred_time ?? a?.preferredTime ?? null,
          customerName: b?.customer_name ?? a?.customerName ?? null,
          additionalNotes: b?.additional_notes ?? a?.additionalNotes ?? null,
        }),
        hasRequiredFields: (extracted: any) => Boolean(extracted?.serviceNeeded) && Boolean(extracted?.address),
        generateAIResponse: async () => ({
          success: true,
          response: {
            reply_text: 'Thanks, we have everything we need.',
            state: 'capturing_time',
            extracted: { service_needed: 'Leak', address: '123 Main', urgency: 'medium', urgency_reason: null, preferred_time: null, customer_name: 'Alice', additional_notes: null },
            actions: { notify_owner: false, notify_urgency: null, offer_slots: false, end_conversation: true, handoff_reason: null, create_job: false },
            confidence: {},
          },
        }),
      }));
      const { handleLeadsCaptainInboundSMS } = require('@/lib/leads-captain');
      const res = await handleLeadsCaptainInboundSMS(
        { MessageSid: 'MSZ', From: '+15550003333', To: '+15551114444', Body: 'Details provided' },
        'biz1'
      );
      expect(res.success).toBe(true);
      expect(res.replySent).toBe(true);
      expect(notifyOwner).toHaveBeenCalled();
      expect(updateConversation).toHaveBeenCalledWith('conv-lc', expect.objectContaining({ state: 'lead_captured' }));
    });
  });

  it('handleLeadsCaptainInboundSMS returns error when AI generation throws', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: {
          messages: { create: jest.fn(async () => ({ sid: 'SMERR' })) },
        },
      }));
      const updateConversation = jest.fn(async () => ({}));
      const saveMessage = jest.fn(async () => ({
        id: 'mE',
        role: 'customer',
        content: 'Hi',
        timestamp: new Date(),
        status: 'queued',
      }));
      jest.doMock('@/lib/leads-captain/conversation-service', () => ({
        getBusinessSettings: async () => ({
          ownerName: 'Owner',
          timezone: 'UTC',
          maxMessages: 10,
          afterHoursNotify: true,
          autoCreateJobs: false,
        }),
        findOrCreateConversation: async () => ({
          conversation: {
            id: 'conv-err',
            businessId: 'biz1',
            customerPhone: '+1555',
            businessPhone: '+1444',
            state: 'active',
            previousStates: [],
            extracted: { serviceNeeded: null, address: null, urgency: null, urgencyReason: null, preferredTime: null, customerName: null, additionalNotes: null },
            messages: [],
            messageCount: 1,
            aiMessagesSinceResponse: 0,
            startedAt: new Date(),
            isAfterHours: false,
            isEmergency: false,
            ownerNotified: false,
          },
        }),
        findCustomerByPhone: async () => null,
        saveMessage,
        updateConversation,
      }));
      jest.doMock('@/lib/leads-captain/conversation-engine', () => ({
        hasExceededMaxMessages: () => false,
        mergeExtractedInfo: (a: any, b: any) => ({ ...a, ...b }),
        generateAIResponse: async () => {
          throw new Error('AI failed');
        },
      }));
      const { handleLeadsCaptainInboundSMS } = require('@/lib/leads-captain');
      const res = await handleLeadsCaptainInboundSMS(
        { MessageSid: 'MSERR', From: '+15550004444', To: '+15551115555', Body: 'Hi' },
        'biz1'
      );
      expect(res.success).toBe(false);
      expect(res.replySent).toBe(false);
      expect(typeof res.error).toBe('string');
    });
  });
});
