import { describe, it, expect } from '@jest/globals';

describe('NeverMiss conversation engine helpers', () => {
  it('checkComplianceKeyword detects STOP/HELP/START', async () => {
    await jest.isolateModulesAsync(async () => {
      const { checkComplianceKeyword } = require('@/lib/nevermiss/conversation-engine');
      expect(checkComplianceKeyword('STOP')).toBe('stop');
      expect(checkComplianceKeyword('help')).toBe('help');
      expect(checkComplianceKeyword('Start')).toBe('start');
      expect(checkComplianceKeyword('hello')).toBeNull();
    });
  });

  it('generateComplianceResponse returns correct text', async () => {
    await jest.isolateModulesAsync(async () => {
      const { generateComplianceResponse } = require('@/lib/nevermiss/conversation-engine');
      const settings = { businessName: 'BizCo' };
      expect(generateComplianceResponse('stop', settings)).toContain('unsubscribed');
      expect(generateComplianceResponse('help', settings)).toContain('Leads Captain');
      expect(generateComplianceResponse('start', settings)).toContain('resubscribed');
    });
  });

  it('isAfterHours returns true when not a business day', async () => {
    await jest.isolateModulesAsync(async () => {
      const { isAfterHours } = require('@/lib/nevermiss/conversation-engine');
      const settings = {
        timezone: 'UTC',
        businessDays: [], // no business days
        businessHoursStart: '09:00',
        businessHoursEnd: '17:00',
      };
      expect(isAfterHours(settings)).toBe(true);
    });
  });

  it('isAfterHours returns false during business hours on business day', async () => {
    await jest.isolateModulesAsync(async () => {
      const { isAfterHours } = require('@/lib/nevermiss/conversation-engine');
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-02T10:00:00Z')); // Friday 10:00 UTC
      const settings = {
        timezone: 'UTC',
        businessDays: [1,2,3,4,5],
        businessHoursStart: '09:00',
        businessHoursEnd: '17:00',
      };
      expect(isAfterHours(settings)).toBe(false);
      jest.useRealTimers();
    });
  });

  it('detectUrgency handles safety keywords, negations, quotes and indicators', async () => {
    await jest.isolateModulesAsync(async () => {
      const { detectUrgency } = require('@/lib/nevermiss/conversation-engine');
      const settings = { emergencyKeywords: ['burst pipe'] };
      expect(detectUrgency('There is a gas leak', settings).level).toBe('emergency');
      expect(detectUrgency('not a gas leak', settings).level).toBe('medium');
      expect(detectUrgency('quote for water heater', settings).level).toBe('low');
      expect(detectUrgency('no rush, whenever', settings).level).toBe('medium');
      expect(detectUrgency('asap please', settings).level).toBe('high');
      expect(detectUrgency('no heat at home', settings).level).toBe('high'); // contextual
    });
  });

  it('detectUrgency respects custom emergency keywords with negation', async () => {
    await jest.isolateModulesAsync(async () => {
      const { detectUrgency } = require('@/lib/nevermiss/conversation-engine');
      const settings = { emergencyKeywords: ['burst pipe'] };
      expect(detectUrgency('Burst pipe in kitchen', settings).level).toBe('emergency');
      expect(detectUrgency('not burst pipe, false alarm', settings).level).toBe('medium');
    });
  });

  it('generateGreeting respects style and custom message', async () => {
    await jest.isolateModulesAsync(async () => {
      const { generateGreeting } = require('@/lib/nevermiss/conversation-engine');
      const base = {
        businessName: 'BizCo',
        ownerName: 'Bob',
        greetingStyle: 'apologetic',
        greetingMessage: '',
      };
      const g1 = generateGreeting({ ...base, greetingStyle: 'direct' }, true);
      expect(g1).toContain('Hi, this is BizCo');
      const g2 = generateGreeting(base, false);
      expect(g2).toContain('Sorry I missed your call');
      const g3 = generateGreeting({ ...base, greetingMessage: 'Hi from {business_name} - {owner_name}' }, false);
      expect(g3).toContain('Hi from BizCo - Bob');
    });
  });

  it('hasRequiredFields and shouldMarkAsLeadCaptured work', async () => {
    await jest.isolateModulesAsync(async () => {
      const { hasRequiredFields, shouldMarkAsLeadCaptured } = require('@/lib/nevermiss/conversation-engine');
      const extracted = { serviceNeeded: 'Leak', address: '123 Main', urgency: null, urgencyReason: null, preferredTime: null, customerName: null, additionalNotes: null };
      expect(hasRequiredFields(extracted)).toBe(true);
      expect(shouldMarkAsLeadCaptured('active', extracted)).toBe(true);
      expect(shouldMarkAsLeadCaptured('completed', extracted)).toBe(false);
    });
  });

  it('message limit helpers work', async () => {
    await jest.isolateModulesAsync(async () => {
      const { hasTooManyUnansweredMessages, hasExceededMaxMessages } = require('@/lib/nevermiss/conversation-engine');
      const conv = { aiMessagesSinceResponse: 3, messageCount: 10 };
      expect(hasTooManyUnansweredMessages(conv, 2)).toBe(true);
      expect(hasExceededMaxMessages(conv, 10)).toBe(true);
    });
  });

  it('mergeExtractedInfo combines fields with new info', async () => {
    await jest.isolateModulesAsync(async () => {
      const { mergeExtractedInfo, createEmptyExtractedInfo } = require('@/lib/nevermiss/conversation-engine');
      const existing = createEmptyExtractedInfo();
      const merged = mergeExtractedInfo(existing, {
        service_needed: 'AC repair',
        address: '123 Main',
        urgency: 'high',
        urgency_reason: 'asap',
        preferred_time: 'Tomorrow AM',
        customer_name: 'Alice',
        additional_notes: 'Bring ladder',
      });
      expect(merged.serviceNeeded).toBe('AC repair');
      expect(merged.address).toBe('123 Main');
      expect(merged.urgency).toBe('high');
      expect(merged.customerName).toBe('Alice');
    });
  });

  it('generateAIResponse parses JSON and applies safety keyword overrides', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@anthropic-ai/sdk', () => {
        return {
          __esModule: true,
          default: class Anthropic {
            constructor(_config: any) {}
            messages = {
              create: async () => ({
                content: [
                  {
                    type: 'text',
                    text: `{
                      "reply_text": "Got it — water heater issue. What's the address?",
                      "state": "capturing_address",
                      "extracted": {
                        "service_needed": "water heater not working",
                        "address": null,
                        "urgency": "medium",
                        "urgency_reason": null,
                        "preferred_time": null,
                        "customer_name": null,
                        "additional_notes": null
                      },
                      "actions": {
                        "notify_owner": false,
                        "notify_urgency": null,
                        "offer_slots": false,
                        "end_conversation": false,
                        "handoff_reason": null,
                        "create_job": false
                      },
                      "confidence": {
                        "service_needed": 0.95,
                        "urgency": 0.6
                      }
                    }`
                  }
                ]
              })
            };
          }
        };
      });
      const { generateAIResponse, createEmptyExtractedInfo } = require('@/lib/nevermiss/conversation-engine');
      const conversation = {
        id: 'c1',
        businessId: 'b1',
        customerPhone: '111',
        businessPhone: '222',
        state: 'capturing_need',
        previousStates: [],
        extracted: createEmptyExtractedInfo(),
        messages: [{ id: 'm1', role: 'customer', content: 'Help', timestamp: new Date() }],
        messageCount: 1,
        aiMessagesSinceResponse: 0,
        startedAt: new Date(),
        isAfterHours: false,
        isEmergency: false,
        ownerNotified: false,
        aiModel: 'test',
      };
      const settings = {
        businessId: 'b1',
        businessName: 'BizCo',
        ownerName: 'Bob',
        servicesOffered: ['Plumbing'],
        serviceArea: 'Town',
        phoneNumber: '222',
        forwardTo: '333',
        tone: 'friendly',
        greetingStyle: 'apologetic',
        greetingMessage: '',
        useOwnerName: true,
        maxMessages: 5,
        customPrompt: '',
        businessHoursStart: '09:00',
        businessHoursEnd: '17:00',
        businessDays: [1,2,3,4,5],
        quietHoursStart: '21:00',
        quietHoursEnd: '06:00',
        timezone: 'UTC',
        afterHoursEnabled: true,
        afterHoursMessage: '',
        emergencyKeywords: [],
        emergencyAlwaysNotify: true,
        afterHoursNotify: true,
        notifySms: true,
        notifyEmail: false,
        notifyPush: false,
        calendarBookingEnabled: false,
        crmIntegrationEnabled: false,
        autoCreateJobs: false,
      };
      const res = await generateAIResponse(conversation, 'There is a gas leak here', settings);
      expect(res.success).toBe(true);
      expect(res.response.extracted.urgency).toBe('emergency');
      expect(res.response.actions.notify_owner).toBe(true);
      expect(res.response.actions.notify_urgency).toBe('emergency');
    });
  });

  it('generateAIResponse handles code block JSON after a bad first attempt', async () => {
    await jest.isolateModulesAsync(async () => {
      const first = {
        content: [
          { type: 'text', text: `{"state":"capturing_need"}` } // missing reply_text to force parse failure
        ]
      };
      const second = {
        content: [
          { type: 'text', text: '```json{"reply_text":"Hi","state":"capturing_need","extracted":{"service_needed":"x"},"actions":{"notify_owner":false,"end_conversation":false},"confidence":{}}```' }
        ]
      };
      const create = jest.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
      jest.doMock('@anthropic-ai/sdk', () => ({
        __esModule: true,
        default: class Anthropic {
          constructor(_config: any) {}
          messages = { create };
        },
      }));
      const { generateAIResponse, createEmptyExtractedInfo } = require('@/lib/nevermiss/conversation-engine');
      const conversation = {
        id: 'c3',
        businessId: 'b1',
        customerPhone: '111',
        businessPhone: '222',
        state: 'capturing_need',
        previousStates: [],
        extracted: createEmptyExtractedInfo(),
        messages: [{ id: 'm1', role: 'customer', content: 'Hi', timestamp: new Date() }],
        messageCount: 1,
        aiMessagesSinceResponse: 0,
        startedAt: new Date(),
        isAfterHours: false,
        isEmergency: false,
        ownerNotified: false,
        aiModel: 'test',
      };
      const settings = {
        businessId: 'b1',
        businessName: 'BizCo',
        ownerName: 'Bob',
        servicesOffered: ['Plumbing'],
        serviceArea: 'Town',
        phoneNumber: '222',
        forwardTo: '333',
        tone: 'friendly',
        greetingStyle: 'apologetic',
        greetingMessage: '',
        useOwnerName: true,
        maxMessages: 5,
        customPrompt: '',
        businessHoursStart: '09:00',
        businessHoursEnd: '17:00',
        businessDays: [1,2,3,4,5],
        quietHoursStart: '21:00',
        quietHoursEnd: '06:00',
        timezone: 'UTC',
        afterHoursEnabled: true,
        afterHoursMessage: '',
        emergencyKeywords: [],
        emergencyAlwaysNotify: true,
        afterHoursNotify: true,
        notifySms: true,
        notifyEmail: false,
        notifyPush: false,
        calendarBookingEnabled: false,
        crmIntegrationEnabled: false,
        autoCreateJobs: false,
      };
      const res = await generateAIResponse(conversation, 'Hi', settings);
      expect(res.success).toBe(true);
      expect(res.response.reply_text).toBe('Hi');
      expect(create).toHaveBeenCalledTimes(2);
    });
  });

  it('generateAIResponse returns fallback after retries fail', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@anthropic-ai/sdk', () => {
        return {
          __esModule: true,
          default: class Anthropic {
            constructor(_config: any) {}
            messages = {
              create: async () => {
                throw new Error('network error');
              }
            };
          }
        };
      });
      const { generateAIResponse, createEmptyExtractedInfo } = require('@/lib/nevermiss/conversation-engine');
      const conversation = {
        id: 'c2',
        businessId: 'b1',
        customerPhone: '111',
        businessPhone: '222',
        state: 'capturing_need',
        previousStates: [],
        extracted: createEmptyExtractedInfo(),
        messages: [{ id: 'm1', role: 'customer', content: 'Need help', timestamp: new Date() }],
        messageCount: 1,
        aiMessagesSinceResponse: 0,
        startedAt: new Date(),
        isAfterHours: false,
        isEmergency: false,
        ownerNotified: false,
        aiModel: 'test',
      };
      const settings = {
        businessId: 'b1',
        businessName: 'BizCo',
        ownerName: 'Bob',
        servicesOffered: ['Plumbing'],
        serviceArea: 'Town',
        phoneNumber: '222',
        forwardTo: '333',
        tone: 'friendly',
        greetingStyle: 'apologetic',
        greetingMessage: '',
        useOwnerName: true,
        maxMessages: 5,
        customPrompt: '',
        businessHoursStart: '09:00',
        businessHoursEnd: '17:00',
        businessDays: [1,2,3,4,5],
        quietHoursStart: '21:00',
        quietHoursEnd: '06:00',
        timezone: 'UTC',
        afterHoursEnabled: true,
        afterHoursMessage: '',
        emergencyKeywords: [],
        emergencyAlwaysNotify: true,
        afterHoursNotify: true,
        notifySms: true,
        notifyEmail: false,
        notifyPush: false,
        calendarBookingEnabled: false,
        crmIntegrationEnabled: false,
        autoCreateJobs: false,
      };
      const res = await generateAIResponse(conversation, 'General question', settings);
      expect(res.success).toBe(false);
      expect(res.response.state).toBe('awaiting_owner');
      expect(res.response.actions.notify_owner).toBe(true);
      expect(res.response.actions.end_conversation).toBe(true);
    });
  });
});
