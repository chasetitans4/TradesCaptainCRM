import { describe, it, expect, jest } from '@jest/globals';

describe('twilio/sms', () => {
  it('formatPhoneE164 normalizes common formats', () => {
    const { formatPhoneE164 } = require('@/lib/twilio/sms');
    expect(formatPhoneE164('(555) 123-4567')).toBe('+15551234567');
    expect(formatPhoneE164('+1 555 123 4567')).toBe('+15551234567');
    expect(formatPhoneE164('15551234567')).toBe('+15551234567');
  });

  it('formatPhoneDisplay formats 10-digit local', () => {
    const { formatPhoneDisplay } = require('@/lib/twilio/sms');
    expect(formatPhoneDisplay('+15551234567')).toBe('(555) 123-4567');
    expect(formatPhoneDisplay('5551234')).toBe('5551234');
  });

  it('updateMessageStatus applies only higher priority', async () => {
    jest.resetModules();
    jest.doMock('@/lib/supabase/server', () => {
      const client = {
        from: (_table: string) => ({
          select: (_sel: string) => ({
            eq: (_col: string, _val: any) => ({
              single: async () => ({ data: { id: 'm1', status: 'sent' }, error: null }),
            }),
          }),
          update: (_u: any) => ({
            eq: (_col: string, _v: any) => ({
              select: (_s?: string) => ({
                single: async () => ({ data: { id: 'x' }, error: null }),
              }),
            }),
          }),
        }),
      };
      return { createAdminClient: () => client };
    });
    const { updateMessageStatus } = require('@/lib/twilio/sms');
    const res1 = await updateMessageStatus('sid1', 'delivered');
    expect(res1.applied).toBe(true);
    jest.resetModules();
    jest.doMock('@/lib/supabase/server', () => {
      const client = {
        from: (_table: string) => ({
          select: (_sel: string) => ({
            eq: (_col: string, _val: any) => ({
              single: async () => ({ data: { id: 'm1', status: 'delivered' }, error: null }),
            }),
          }),
          update: (_u: any) => ({
            eq: (_col: string, _v: any) => ({
              select: (_s?: string) => ({
                single: async () => ({ data: { id: 'x' }, error: null }),
              }),
            }),
          }),
        }),
      };
      return { createAdminClient: () => client };
    });
    const { updateMessageStatus: updateStatus2 } = require('@/lib/twilio/sms');
    const res2 = await updateStatus2('sid2', 'failed');
    expect(res2.applied).toBe(false);
    expect(res2.reason).toBe('not_higher_priority');
  });

  it('updateMessageStatus handles message not found', async () => {
    jest.resetModules();
    jest.doMock('@/lib/supabase/server', () => {
      const client = {
        from: (_table: string) => ({
          select: (_sel: string) => ({
            eq: (_col: string, _val: any) => ({
              single: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      };
      return { createAdminClient: () => client };
    });
    const { updateMessageStatus } = require('@/lib/twilio/sms');
    const res = await updateMessageStatus('sid3', 'sent');
    expect(res.applied).toBe(false);
    expect(res.reason).toBe('message_not_found');
  });

  it('sendSMS success logs message and returns ids', async () => {
    jest.resetModules();
    const rpcSpy = jest.fn(async () => ({}));
    jest.doMock('@/lib/supabase/server', () => ({
      createAdminClient: () => ({
        from: (table: string) => {
          if (table === 'businesses') {
            return {
              select: () => ({
                eq: () => ({
                  single: async () => ({ data: { twilio_phone_number: '+15551112222' }, error: null }),
                }),
              }),
            };
          }
          if (table === 'sms_conversations') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    eq: () => ({
                      single: async () => ({ data: { id: 'conv1', customer_id: 'cust1' }, error: null }),
                    }),
                  }),
                }),
              }),
              insert: () => ({
                select: () => ({
                  single: async () => ({ data: { id: 'conv1' }, error: null }),
                }),
              }),
            };
          }
          if (table === 'sms_messages') {
            return {
              insert: () => ({
                select: () => ({
                  single: async () => ({ data: { id: 'msg1' }, error: null }),
                }),
              }),
            };
          }
          if (table === 'customers') {
            return {
              select: () => ({
                eq: () => ({
                  single: async () => ({ data: { id: 'cust1' }, error: null }),
                }),
              }),
            };
          }
          return {} as any;
        },
        rpc: rpcSpy,
      }),
    }));
    jest.doMock('@/lib/twilio/client', () => ({
      twilioClient: { messages: { create: jest.fn(async () => ({ sid: 'sid-1', from: '+15551112222' })) } },
      messagingServiceSid: null,
      getWebhookUrl: () => 'http://example/webhook',
    }));
    const { sendSMS } = require('@/lib/twilio/sms');
    const res = await sendSMS({
      to: '+15551234567',
      body: 'hello',
      businessId: 'b1',
      isAIResponse: true,
    });
    expect(res.success).toBe(true);
    expect(res.twilioSid).toBe('sid-1');
    expect(res.fromNumber).toBe('+15551112222');
    expect(rpcSpy).toHaveBeenCalledWith('increment_ai_response_count', { conv_id: 'conv1' });
  });

  it('sendSMS includes messagingServiceSid when configured', async () => {
    jest.resetModules();
    const createFn = jest.fn(async () => ({ sid: 'sid-ms', from: '+15551112222' }));
    jest.doMock('@/lib/supabase/server', () => ({
      createAdminClient: () => ({
        from: (table: string) => {
          if (table === 'businesses') {
            return {
              select: () => ({
                eq: () => ({
                  single: async () => ({ data: { twilio_phone_number: '+15551112222' }, error: null }),
                }),
              }),
            };
          }
          if (table === 'sms_conversations') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    eq: () => ({
                      single: async () => ({ data: { id: 'conv1', customer_id: 'cust1' }, error: null }),
                    }),
                  }),
                }),
              }),
              insert: () => ({
                select: () => ({
                  single: async () => ({ data: { id: 'conv1' }, error: null }),
                }),
              }),
            };
          }
          if (table === 'sms_messages') {
            return {
              insert: () => ({
                select: () => ({
                  single: async () => ({ data: { id: 'msg1' }, error: null }),
                }),
              }),
            };
          }
          return {} as any;
        },
        rpc: jest.fn(async () => ({})),
      }),
    }));
    jest.doMock('@/lib/twilio/client', () => ({
      twilioClient: { messages: { create: createFn } },
      messagingServiceSid: 'MG1234567890',
      getWebhookUrl: () => 'http://example/webhook',
    }));
    const { sendSMS } = require('@/lib/twilio/sms');
    const res = await sendSMS({
      to: '+15551234567',
      body: 'hello',
      businessId: 'b1',
    });
    expect(res.success).toBe(true);
    const arg = (createFn as jest.Mock).mock.calls[0][0];
    expect(arg.messagingServiceSid).toBe('MG1234567890');
  });

  it('sendSMS failure path logs and returns error', async () => {
    jest.resetModules();
    jest.doMock('@/lib/supabase/server', () => ({
      createAdminClient: () => ({
        from: (table: string) => {
          if (table === 'businesses') {
            return {
              select: () => ({
                eq: () => ({
                  single: async () => ({ data: { twilio_phone_number: '+15551112222' }, error: null }),
                }),
              }),
            };
          }
          if (table === 'sms_messages') {
            return {
              insert: () => ({}),
            };
          }
          return {} as any;
        },
      }),
    }));
    jest.doMock('@/lib/twilio/client', () => ({
      twilioClient: { messages: { create: jest.fn(async () => { throw new Error('twilio down'); }) } },
      messagingServiceSid: null,
      getWebhookUrl: () => 'http://example/webhook',
    }));
    const { sendSMS } = require('@/lib/twilio/sms');
    const res = await sendSMS({
      to: '+15551230000',
      body: 'fail',
      businessId: 'b1',
      conversationId: 'convX',
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe('twilio down');
  });

  it('sendSMS throws when business missing phone config', async () => {
    jest.resetModules();
    jest.doMock('@/lib/supabase/server', () => ({
      createAdminClient: () => ({
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }),
    }));
    jest.doMock('@/lib/twilio/client', () => ({
      twilioClient: { messages: { create: jest.fn(async () => ({ sid: 'sid-1', from: '+10000000000' })) } },
      messagingServiceSid: null,
      getWebhookUrl: () => 'http://example/webhook',
    }));
    const { sendSMS } = require('@/lib/twilio/sms');
    const res = await sendSMS({
      to: '+15551230000',
      body: 'no-config',
      businessId: 'b1',
    });
    expect(res.success).toBe(false);
    expect(typeof res.error).toBe('string');
  });

  it('updateMessageStatus applies errorMessage when upgrading from queued -> failed', async () => {
    jest.resetModules();
    jest.doMock('@/lib/supabase/server', () => ({
      createAdminClient: () => ({
        from: (_table: string) => ({
          select: (_sel: string) => ({
            eq: (_col: string, _val: any) => ({
              single: async () => ({ data: { id: 'm2', status: 'queued' }, error: null }),
            }),
          }),
          update: (_updates: any) => ({
            eq: (_col: string, _val: any) => ({
              select: (_s?: string) => ({
                single: async () => ({ data: { id: 'm2' }, error: null }),
              }),
            }),
          }),
        }),
      }),
    }));
    const { updateMessageStatus } = require('@/lib/twilio/sms');
    const res = await updateMessageStatus('sid-error', 'failed', 'carrier unreachable');
    expect(res.applied).toBe(true);
  });

  it('getOrCreateConversation returns existing conversation with isNew=false', async () => {
    jest.resetModules();
    jest.doMock('@/lib/supabase/server', () => ({
      createAdminClient: () => ({
        from: (table: string) => {
          if (table === 'sms_conversations') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    eq: () => ({
                      single: async () => ({ data: { id: 'conv1', customer_id: 'cust1' }, error: null }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {} as any;
        },
      }),
    }));
    const { getOrCreateConversation } = require('@/lib/twilio/sms');
    const conv = await getOrCreateConversation('(555) 123-4567', 'b1');
    expect(conv.isNew).toBe(false);
    expect(conv.id).toBe('conv1');
    expect(conv.customer_id).toBe('cust1');
  });

  it('getOrCreateConversation creates new conversation when none exists', async () => {
    jest.resetModules();
    jest.doMock('@/lib/supabase/server', () => ({
      createAdminClient: () => ({
        from: (table: string) => {
          if (table === 'sms_conversations') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    eq: () => ({
                      single: async () => ({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
              insert: (_row: any) => ({
                select: () => ({
                  single: async () => ({ data: { id: 'conv-new' }, error: null }),
                }),
              }),
            };
          }
          if (table === 'customers') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    single: async () => ({ data: { id: 'cust2' }, error: null }),
                  }),
                }),
              }),
            };
          }
          return {} as any;
        },
      }),
    }));
    const { getOrCreateConversation } = require('@/lib/twilio/sms');
    const conv = await getOrCreateConversation('555-987-6543', 'b1');
    expect(conv.isNew).toBe(true);
    expect(conv.id).toBe('conv-new');
    expect(conv.customer_id).toBe('cust2');
  });

  it('getOrCreateConversation throws when insert returns error', async () => {
    jest.resetModules();
    jest.doMock('@/lib/supabase/server', () => ({
      createAdminClient: () => ({
        from: (table: string) => {
          if (table === 'sms_conversations') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    eq: () => ({
                      single: async () => ({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
              insert: (_row: any) => ({
                select: () => ({
                  single: async () => ({ data: null, error: new Error('db insert failed') }),
                }),
              }),
            };
          }
          if (table === 'customers') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    single: async () => ({ data: { id: 'cust2' }, error: null }),
                  }),
                }),
              }),
            };
          }
          return {} as any;
        },
      }),
    }));
    const { getOrCreateConversation } = require('@/lib/twilio/sms');
    await expect(getOrCreateConversation('555-111-2222', 'b1')).rejects.toThrow('db insert failed');
  });

  it('flagForHumanAttention and clearHumanAttention update conversation flags', async () => {
    jest.resetModules();
    const updateSpy = jest.fn(() => ({
      eq: jest.fn(() => ({})),
    }));
    jest.doMock('@/lib/supabase/server', () => ({
      createAdminClient: () => ({
        from: (_table: string) => ({
          update: updateSpy,
        }),
      }),
    }));
    const { flagForHumanAttention, clearHumanAttention } = require('@/lib/twilio/sms');
    await flagForHumanAttention('conv1', 'escalated');
    await clearHumanAttention('conv1');
    expect(updateSpy).toHaveBeenCalled();
  });

  it('saveIncomingMessage inserts inbound message and returns id', async () => {
    jest.resetModules();
    jest.doMock('@/lib/supabase/server', () => ({
      createAdminClient: () => ({
        from: (table: string) => {
          if (table === 'sms_messages') {
            return {
              insert: (_row: any) => ({
                select: (_sel?: string) => ({
                  single: async () => ({ data: { id: 'in1' }, error: null }),
                }),
              }),
            };
          }
          if (table === 'sms_conversations') {
            return {
              update: (_u: any) => ({
                eq: (_c: string, _v: any) => ({}),
              }),
            };
          }
          return {} as any;
        },
      }),
    }));
    const { saveIncomingMessage } = require('@/lib/twilio/sms');
    const id = await saveIncomingMessage('conv1', 'hello', 'sidX');
    expect(id).toBe('in1');
  });

  it('sendSMS logs insertError but still returns success', async () => {
    jest.resetModules();
    jest.doMock('@/lib/supabase/server', () => ({
      createAdminClient: () => ({
        from: (table: string) => {
          if (table === 'businesses') {
            return {
              select: () => ({
                eq: () => ({
                  single: async () => ({ data: { twilio_phone_number: '+15551112222' }, error: null }),
                }),
              }),
            };
          }
          if (table === 'sms_conversations') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    eq: () => ({
                      single: async () => ({ data: { id: 'conv1', customer_id: null }, error: null }),
                    }),
                  }),
                }),
              }),
              insert: () => ({
                select: () => ({
                  single: async () => ({ data: { id: 'conv1' }, error: null }),
                }),
              }),
            };
          }
          if (table === 'sms_messages') {
            return {
              insert: () => ({
                select: () => ({
                  single: async () => ({ data: { id: 'msg1' }, error: { message: 'insert failed' } }),
                }),
              }),
            };
          }
          return {} as any;
        },
        rpc: jest.fn(async () => ({})),
      }),
    }));
    jest.doMock('@/lib/twilio/client', () => ({
      twilioClient: { messages: { create: jest.fn(async () => ({ sid: 'sid-2', from: '+15551112222' })) } },
      messagingServiceSid: null,
      getWebhookUrl: () => 'http://example/webhook',
    }));
    const { sendSMS } = require('@/lib/twilio/sms');
    const res = await sendSMS({
      to: '+15551234567',
      body: 'hello',
      businessId: 'b1',
    });
    expect(res.success).toBe(true);
    expect(res.twilioSid).toBe('sid-2');
  });

  it('saveIncomingMessage throws when insert fails', async () => {
    jest.resetModules();
    jest.doMock('@/lib/supabase/server', () => ({
      createAdminClient: () => ({
        from: (table: string) => {
          if (table === 'sms_messages') {
            return {
              insert: (_row: any) => ({
                select: (_sel?: string) => ({
                  single: async () => ({ data: null, error: new Error('insert error') }),
                }),
              }),
            };
          }
          if (table === 'sms_conversations') {
            return {
              update: (_u: any) => ({
                eq: (_c: string, _v: any) => ({}),
              }),
            };
          }
          return {} as any;
        },
      }),
    }));
    const { saveIncomingMessage } = require('@/lib/twilio/sms');
    await expect(saveIncomingMessage('conv1', 'hello', 'sidX')).rejects.toThrow('insert error');
  });

  describe('twilio/client', () => {
    it('getWebhookUrl builds full URL from base and path', async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
        jest.resetModules();
        jest.unmock('@/lib/twilio/client');
        jest.doMock('twilio', () => {
          const fn = jest.fn(() => ({ messages: {} }));
          (fn as any).validateRequest = jest.fn(() => true);
          return fn;
        });
        const { getWebhookUrl } = require('@/lib/twilio/client');
        const url = getWebhookUrl('/api/webhooks/twilio/status');
        expect(url).toBe('https://app.example.com/api/webhooks/twilio/status');
      });
    });

    it('validateTwilioSignature delegates to twilio.validateRequest', async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.TWILIO_ACCOUNT_SID = 'sid';
        process.env.TWILIO_AUTH_TOKEN = 'auth';
        jest.resetModules();
        jest.unmock('@/lib/twilio/client');
        jest.doMock('twilio', () => {
          const fn = jest.fn(() => ({ messages: {} }));
          const validateMock = jest.fn((auth, sig, url, params) => sig === 'good');
          (fn as any).validateRequest = validateMock;
          return fn;
        });
        const { validateTwilioSignature } = require('@/lib/twilio/client');
        const ok = validateTwilioSignature('good', 'http://x', { a: 'b' });
        const bad = validateTwilioSignature('bad', 'http://x', { a: 'b' });
        expect(ok).toBe(true);
        expect(bad).toBe(false);
        const twilioLib = require('twilio');
        expect(twilioLib.validateRequest).toHaveBeenCalledWith('auth', 'good', 'http://x', { a: 'b' });
      });
    });
  });
});
