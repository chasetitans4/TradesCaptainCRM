import { describe, it, expect, jest } from '@jest/globals';

function makeFormData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

function makeRequest(fields: Record<string, string>, url = 'http://localhost/api/webhooks/twilio/sms') {
  return {
    url,
    formData: async () => makeFormData(fields),
  } as any;
}

function mockNextServer() {
  class NextResponse {
    private _body: string;
    status: number;
    headers: Record<string, string> | undefined;
    constructor(body: string, init?: { status?: number; headers?: Record<string, string> }) {
      this._body = body;
      this.status = init?.status || 200;
      this.headers = init?.headers;
    }
    static json(payload: any, init?: { status?: number }) {
      return new NextResponse(JSON.stringify(payload), {
        status: init?.status || 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    async text() {
      return this._body;
    }
    async json() {
      try {
        return JSON.parse(this._body);
      } catch {
        return {};
      }
    }
  }
  jest.doMock('next/server', () => ({ NextResponse }));
}

function mockHeaders(sig?: string) {
  jest.doMock('next/headers', () => ({
    headers: async () => ({
      get: (name: string) => (name.toLowerCase() === 'x-twilio-signature' ? sig || '' : null),
    }),
  }));
}

function mockTwilioModule() {
  class MessagingResponse {
    private msg: string | null = null;
    message(text: string) {
      this.msg = text;
    }
    toString() {
      return this.msg ? `<Response><Message>${this.msg}</Message></Response>` : '<Response></Response>';
    }
  }
  const fn = jest.fn();
  (fn as any).twiml = { MessagingResponse };
  return fn;
}

describe('app/api/webhooks/twilio/sms route', () => {
  it('returns 400 when required fields missing', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      mockHeaders();
      jest.doMock('twilio', mockTwilioModule);
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: jest.fn(() => true),
        getOrCreateConversation: jest.fn(async () => ({ id: 'conv1', isNew: false, customer_id: 'c1' })),
        saveIncomingMessage: jest.fn(async () => 'msg1'),
        handleIncomingWithAI: jest.fn(async () => {}),
        formatPhoneE164: (x: string) => x,
        sendSMS: jest.fn(async () => ({})),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }),
        }),
      }));
      const { POST } = require('@/app/api/webhooks/twilio/sms/route');
      const res = await POST(makeRequest({}));
      expect(res.status).toBe(400);
      const body = await res.text();
      expect(body).toContain('Bad Request');
    });
  });

  it('returns 403 in production when signature invalid', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.NODE_ENV = 'production';
      mockNextServer();
      mockHeaders('bad');
      jest.doMock('twilio', mockTwilioModule);
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: jest.fn(() => false),
        getOrCreateConversation: jest.fn(),
        saveIncomingMessage: jest.fn(),
        handleIncomingWithAI: jest.fn(),
        formatPhoneE164: (x: string) => x,
        sendSMS: jest.fn(),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({ from: () => ({}) }),
      }));
      const { POST } = require('@/app/api/webhooks/twilio/sms/route');
      const res = await POST(
        makeRequest({ From: '+15551234567', To: '+15551112222', Body: 'hello', MessageSid: 'sid-x' })
      );
      expect(res.status).toBe(403);
      process.env.NODE_ENV = 'test';
    });
  });

  it('skips already processed messages', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      mockHeaders();
      jest.doMock('twilio', mockTwilioModule);
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: jest.fn(() => true),
        getOrCreateConversation: jest.fn(),
        saveIncomingMessage: jest.fn(),
        handleIncomingWithAI: jest.fn(),
        formatPhoneE164: (x: string) => x,
        sendSMS: jest.fn(),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'processed_webhook_events') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: { id: 'p1' }, error: null }),
                  }),
                }),
              };
            }
            return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) };
          },
        }),
      }));
      const { POST } = require('@/app/api/webhooks/twilio/sms/route');
      const res = await POST(
        makeRequest({ From: '+15551234567', To: '+15551112222', Body: 'hello', MessageSid: 'sid-1' })
      );
      expect(res.status).toBe(200);
      const txt = await res.text();
      expect(txt).toContain('<Response>');
    });
  });

  it('returns empty TwiML when business not found', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      mockHeaders();
      jest.doMock('twilio', mockTwilioModule);
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: jest.fn(() => true),
        getOrCreateConversation: jest.fn(),
        saveIncomingMessage: jest.fn(),
        handleIncomingWithAI: jest.fn(),
        formatPhoneE164: (x: string) => x,
        sendSMS: jest.fn(),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => ({
            select: () => ({
              eq: () => ({
                single: async () =>
                  table === 'businesses'
                    ? { data: null, error: null }
                    : { data: { id: 'x' }, error: null },
              }),
            }),
          }),
        }),
      }));
      const { POST } = require('@/app/api/webhooks/twilio/sms/route');
      const res = await POST(
        makeRequest({ From: '+15551234567', To: '+19998887777', Body: 'hi', MessageSid: 'sid-2' })
      );
      expect(res.status).toBe(200);
      const txt = await res.text();
      expect(txt).toContain('<Response>');
    });
  });

  it('ignores suppressed phone numbers', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      mockHeaders();
      jest.doMock('twilio', mockTwilioModule);
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: jest.fn(() => true),
        getOrCreateConversation: jest.fn(async () => ({ id: 'conv2', isNew: false, customer_id: 'c2' })),
        saveIncomingMessage: jest.fn(async () => 'msg2'),
        handleIncomingWithAI: jest.fn(async () => {}),
        formatPhoneE164: (x: string) => x,
        sendSMS: jest.fn(async () => ({})),
      }));
      jest.doMock('@/lib/leads-captain', () => ({
        isPhoneSuppressed: jest.fn(async () => true),
        handleComplianceKeywords: jest.fn(async () => ({ handled: false })),
        checkForAbuse: jest.fn(async () => ({ shouldBlock: false, violations: [], suspicions: [] })),
        blockForAbuse: jest.fn(async () => {}),
        incrementSMSUsage: jest.fn(async () => {}),
        hasLeadsCaptainAccess: jest.fn(async () => false),
        handleLeadsCaptainInboundSMS: jest.fn(async () => ({ success: true })),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => ({
            select: () => ({
              eq: () => ({
                single: async () =>
                  table === 'businesses'
                    ? { data: { id: 'b1', name: 'Biz', ai_sms_enabled: true }, error: null }
                    : { data: { id: 'x' }, error: null },
              }),
            }),
          }),
        }),
      }));
      const { POST } = require('@/app/api/webhooks/twilio/sms/route');
      const res = await POST(
        makeRequest({ From: '+15550000000', To: '+15551112222', Body: 'hi', MessageSid: 'sid-3' })
      );
      expect(res.status).toBe(200);
      const txt = await res.text();
      expect(txt).toContain('<Response>');
    });
  });

  it('handles compliance keywords and marks processed', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      mockHeaders();
      const upsertSpy = jest.fn(async () => ({}));
      jest.doMock('twilio', mockTwilioModule);
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: jest.fn(() => true),
        getOrCreateConversation: jest.fn(),
        saveIncomingMessage: jest.fn(),
        handleIncomingWithAI: jest.fn(),
        formatPhoneE164: (x: string) => x,
        sendSMS: jest.fn(),
      }));
      jest.doMock('@/lib/leads-captain', () => ({
        isPhoneSuppressed: jest.fn(async () => false),
        handleComplianceKeywords: jest.fn(async () => ({ handled: true, response: 'STOP confirmed' })),
        checkForAbuse: jest.fn(async () => ({ shouldBlock: false, violations: [], suspicions: [] })),
        blockForAbuse: jest.fn(async () => {}),
        incrementSMSUsage: jest.fn(async () => {}),
        hasLeadsCaptainAccess: jest.fn(async () => false),
        handleLeadsCaptainInboundSMS: jest.fn(async () => ({ success: true })),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'processed_webhook_events') {
              return {
                upsert: upsertSpy,
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: null, error: null }),
                  }),
                }),
              };
            }
            return {
              upsert: upsertSpy,
              select: () => ({
                eq: () => ({
                  single: async () =>
                    table === 'businesses'
                      ? { data: { id: 'b1', name: 'Biz', ai_sms_enabled: true }, error: null }
                      : { data: { id: 'x' }, error: null },
                }),
              }),
            };
          },
        }),
      }));
      const { POST } = require('@/app/api/webhooks/twilio/sms/route');
      const res = await POST(
        makeRequest({ From: '+15551234567', To: '+15551112222', Body: 'stop', MessageSid: 'sid-4' })
      );
      expect(res.status).toBe(200);
      const txt = await res.text();
      expect(txt).toContain('STOP confirmed');
      expect(upsertSpy).toHaveBeenCalled();
    });
  });

  it('blocks for abuse and returns empty response', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      mockHeaders();
      const blockSpy = jest.fn(async () => {});
      jest.doMock('twilio', mockTwilioModule);
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: jest.fn(() => true),
        getOrCreateConversation: jest.fn(async () => ({ id: 'conv3', isNew: false, customer_id: 'c3' })),
        saveIncomingMessage: jest.fn(async () => 'msg3'),
        handleIncomingWithAI: jest.fn(async () => {}),
        formatPhoneE164: (x: string) => x,
        sendSMS: jest.fn(async () => ({})),
      }));
      jest.doMock('@/lib/leads-captain', () => ({
        isPhoneSuppressed: jest.fn(async () => false),
        handleComplianceKeywords: jest.fn(async () => ({ handled: false })),
        checkForAbuse: jest.fn(async () => ({ shouldBlock: true, violations: ['harassment'], suspicions: [] })),
        blockForAbuse: blockSpy,
        incrementSMSUsage: jest.fn(async () => {}),
        hasLeadsCaptainAccess: jest.fn(async () => false),
        handleLeadsCaptainInboundSMS: jest.fn(async () => ({ success: true })),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'processed_webhook_events') {
              return {
                upsert: jest.fn(async () => ({})),
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: null, error: null }),
                  }),
                }),
              };
            }
            return {
              select: () => ({
                eq: () => ({
                  single: async () =>
                    table === 'businesses'
                      ? { data: { id: 'b1', name: 'Biz', ai_sms_enabled: true }, error: null }
                      : { data: { id: 'x' }, error: null },
                }),
              }),
              upsert: jest.fn(async () => ({})),
            };
          },
        }),
      }));
      const { POST } = require('@/app/api/webhooks/twilio/sms/route');
      const res = await POST(
        makeRequest({ From: '+15551234567', To: '+15551112222', Body: 'bad words', MessageSid: 'sid-5' })
      );
      expect(res.status).toBe(200);
      expect(blockSpy).toHaveBeenCalled();
      const txt = await res.text();
      expect(txt).toContain('<Response>');
    });
  });

  it('creates customer when conversation is new and missing customer_id', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      mockHeaders();
      const upsertSpy = jest.fn(async () => ({}));
      jest.doMock('twilio', mockTwilioModule);
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: jest.fn(() => true),
        getOrCreateConversation: jest.fn(async () => ({ id: 'conv4', isNew: true, customer_id: null })),
        saveIncomingMessage: jest.fn(async () => 'msg4'),
        handleIncomingWithAI: jest.fn(async () => {}),
        formatPhoneE164: (x: string) => x,
        sendSMS: jest.fn(async () => ({})),
      }));
      jest.doMock('@/lib/leads-captain', () => ({
        isPhoneSuppressed: jest.fn(async () => false),
        handleComplianceKeywords: jest.fn(async () => ({ handled: false })),
        checkForAbuse: jest.fn(async () => ({ shouldBlock: false, violations: [], suspicions: [] })),
        blockForAbuse: jest.fn(async () => {}),
        incrementSMSUsage: jest.fn(async () => {}),
        hasLeadsCaptainAccess: jest.fn(async () => false),
        handleLeadsCaptainInboundSMS: jest.fn(async () => ({ success: true })),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'processed_webhook_events') {
              return {
                upsert: upsertSpy,
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: null, error: null }),
                  }),
                }),
              };
            }
            return {
              select: () => ({
                eq: () => ({
                  single: async () =>
                    table === 'businesses'
                      ? { data: { id: 'b1', name: 'Biz', ai_sms_enabled: true }, error: null }
                      : { data: { id: 'x' }, error: null },
                }),
              }),
              upsert: upsertSpy,
            };
          },
        }),
      }));
      const { POST } = require('@/app/api/webhooks/twilio/sms/route');
      const res = await POST(
        makeRequest({ From: '+15551234567', To: '+15551112222', Body: 'new', MessageSid: 'sid-6' })
      );
      expect(res.status).toBe(200);
      expect(upsertSpy).toHaveBeenCalled();
    });
  });

  it('routes AI via v2 when config exists and sends SMS', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      mockHeaders();
      const sendSpy = jest.fn(async () => ({}));
      jest.doMock('twilio', mockTwilioModule);
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: jest.fn(() => true),
        getOrCreateConversation: jest.fn(async () => ({ id: 'conv5', isNew: false, customer_id: 'c5' })),
        saveIncomingMessage: jest.fn(async () => 'msg5'),
        handleIncomingWithAI: jest.fn(async () => {}),
        formatPhoneE164: (x: string) => x,
        sendSMS: sendSpy,
      }));
      jest.doMock('@/lib/leads-captain/v2', () => ({
        processInboundMessage: jest.fn(async () => ({
          classification: { intent: 'info' },
          rule_matched: { name: 'rule1' },
          should_send: true,
          requires_approval: false,
          ai_used: true,
          response_content: 'ok',
          template_used: { name: 't1' },
          notifications: [],
          decision_details: { ai_response: 0.9 },
        })),
        handleCompliance: jest.fn(async () => ({
          is_compliance_message: false,
          compliance_type: null,
          keyword_matched: null,
          response_required: false,
          response_text: null,
          should_block_further_processing: false,
        })),
      }));
      jest.doMock('@/lib/leads-captain', () => ({
        isPhoneSuppressed: jest.fn(async () => false),
        handleComplianceKeywords: jest.fn(async () => ({ handled: false })),
        checkForAbuse: jest.fn(async () => ({ shouldBlock: false, violations: [], suspicions: [] })),
        blockForAbuse: jest.fn(async () => {}),
        incrementSMSUsage: jest.fn(async () => {}),
        hasLeadsCaptainAccess: jest.fn(async () => false),
        handleLeadsCaptainInboundSMS: jest.fn(async () => ({ success: true })),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'processed_webhook_events') {
              return {
                upsert: jest.fn(async () => ({})),
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: null, error: null }),
                  }),
                }),
              };
            }
            return {
              select: () => ({
                eq: () => ({
                  single: async () =>
                    table === 'businesses'
                      ? { data: { id: 'b1', name: 'Biz', ai_sms_enabled: true }, error: null }
                      : { data: { id: 'x' }, error: null },
                  neq: () => ({
                    single: async () =>
                      table === 'leads_captain_config'
                        ? { data: { id: 'cfg1', global_mode: 'enabled' }, error: null }
                        : { data: { id: 'x' }, error: null },
                  }),
                }),
              }),
              upsert: jest.fn(async () => ({})),
            };
          },
        }),
      }));
      const { POST } = require('@/app/api/webhooks/twilio/sms/route');
      const res = await POST(
        makeRequest({ From: '+15551234567', To: '+15551112222', Body: 'hi', MessageSid: 'sid-7' })
      );
      expect(res.status).toBe(200);
      expect(sendSpy).toHaveBeenCalled();
    });
  });

  it('routes AI via v2 and queues approval without sending', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      mockHeaders();
      const sendSpy = jest.fn(async () => ({}));
      jest.doMock('twilio', mockTwilioModule);
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: jest.fn(() => true),
        getOrCreateConversation: jest.fn(async () => ({ id: 'convA', isNew: false, customer_id: 'cA' })),
        saveIncomingMessage: jest.fn(async () => 'msgA'),
        handleIncomingWithAI: jest.fn(async () => {}),
        formatPhoneE164: (x: string) => x,
        sendSMS: sendSpy,
      }));
      jest.doMock('@/lib/leads-captain/v2', () => ({
        processInboundMessage: jest.fn(async () => ({
          classification: { intent: 'info' },
          rule_matched: { name: 'ruleX' },
          should_send: false,
          requires_approval: true,
          ai_used: true,
          response_content: 'please approve',
          template_used: { name: 'tX' },
          notifications: [{ type: 'email' }],
          decision_details: { ai_response: 0.6 },
        })),
      }));
      jest.doMock('@/lib/leads-captain', () => ({
        isPhoneSuppressed: jest.fn(async () => false),
        handleComplianceKeywords: jest.fn(async () => ({ handled: false })),
        checkForAbuse: jest.fn(async () => ({ shouldBlock: false, violations: [], suspicions: [] })),
        blockForAbuse: jest.fn(async () => {}),
        incrementSMSUsage: jest.fn(async () => {}),
        hasLeadsCaptainAccess: jest.fn(async () => false),
        handleLeadsCaptainInboundSMS: jest.fn(async () => ({ success: true })),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'processed_webhook_events') {
              return {
                upsert: jest.fn(async () => ({})),
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: null, error: null }),
                  }),
                }),
              };
            }
            return {
              select: () => ({
                eq: () => ({
                  single: async () =>
                    table === 'businesses'
                      ? { data: { id: 'bA', name: 'BizA', ai_sms_enabled: true }, error: null }
                      : { data: { id: 'x' }, error: null },
                  neq: () => ({
                    single: async () =>
                      table === 'leads_captain_config'
                        ? { data: { id: 'cfgA', global_mode: 'enabled' }, error: null }
                        : { data: { id: 'x' }, error: null },
                  }),
                }),
              }),
              upsert: jest.fn(async () => ({})),
            };
          },
        }),
      }));
      const { POST } = require('@/app/api/webhooks/twilio/sms/route');
      const res = await POST(
        makeRequest({ From: '+15551230000', To: '+15551112222', Body: 'approve?', MessageSid: 'sid-approval' })
      );
      expect(res.status).toBe(200);
      expect(sendSpy).not.toHaveBeenCalled();
    });
  });

  it('continues when suppression check throws', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      mockHeaders();
      const legacySpy = jest.fn(async () => {});
      jest.doMock('twilio', mockTwilioModule);
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: jest.fn(() => true),
        getOrCreateConversation: jest.fn(async () => ({ id: 'convE', isNew: false, customer_id: 'cE' })),
        saveIncomingMessage: jest.fn(async () => 'msgE'),
        handleIncomingWithAI: legacySpy,
        formatPhoneE164: (x: string) => x,
        sendSMS: jest.fn(async () => ({})),
      }));
      jest.doMock('@/lib/leads-captain', () => ({
        isPhoneSuppressed: jest.fn(async () => {
          throw new Error('suppression error');
        }),
        handleComplianceKeywords: jest.fn(async () => ({ handled: false })),
        checkForAbuse: jest.fn(async () => ({ shouldBlock: false, violations: [], suspicions: [] })),
        blockForAbuse: jest.fn(async () => {}),
        incrementSMSUsage: jest.fn(async () => {}),
        hasLeadsCaptainAccess: jest.fn(async () => false),
        handleLeadsCaptainInboundSMS: jest.fn(async () => ({ success: true })),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'processed_webhook_events') {
              return {
                upsert: jest.fn(async () => ({})),
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: null, error: null }),
                  }),
                }),
              };
            }
            return {
              select: () => ({
                eq: () => ({
                  single: async () =>
                    table === 'businesses'
                      ? { data: { id: 'bE', name: 'BizE', ai_sms_enabled: false }, error: null }
                      : { data: { id: 'x' }, error: null },
                }),
              }),
              upsert: jest.fn(async () => ({})),
            };
          },
        }),
      }));
      const { POST } = require('@/app/api/webhooks/twilio/sms/route');
      const res = await POST(
        makeRequest({ From: '+15551230001', To: '+15551112222', Body: 'hello', MessageSid: 'sid-err-suppress' })
      );
      expect(res.status).toBe(200);
      const txt = await res.text();
      expect(txt).toContain('<Response>');
      expect(legacySpy).not.toHaveBeenCalled();
    });
  });

  it('continues when saveIncomingMessage throws', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      mockHeaders();
      const legacySpy = jest.fn(async () => {});
      jest.doMock('twilio', mockTwilioModule);
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: jest.fn(() => true),
        getOrCreateConversation: jest.fn(async () => ({ id: 'convSFail', isNew: false, customer_id: 'cSF' })),
        saveIncomingMessage: jest.fn(async () => {
          throw new Error('save failed');
        }),
        handleIncomingWithAI: legacySpy,
        formatPhoneE164: (x: string) => x,
        sendSMS: jest.fn(async () => ({})),
      }));
      jest.doMock('@/lib/leads-captain', () => ({
        isPhoneSuppressed: jest.fn(async () => false),
        handleComplianceKeywords: jest.fn(async () => ({ handled: false })),
        checkForAbuse: jest.fn(async () => ({ shouldBlock: false, violations: [], suspicions: [] })),
        blockForAbuse: jest.fn(async () => {}),
        incrementSMSUsage: jest.fn(async () => {}),
        hasLeadsCaptainAccess: jest.fn(async () => false),
        handleLeadsCaptainInboundSMS: jest.fn(async () => ({ success: true })),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'processed_webhook_events') {
              return {
                upsert: jest.fn(async () => ({})),
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: null, error: null }),
                  }),
                }),
              };
            }
            return {
              select: () => ({
                eq: () => ({
                  single: async () =>
                    table === 'businesses'
                      ? { data: { id: 'bSF', name: 'BizSF', ai_sms_enabled: false }, error: null }
                      : { data: { id: 'x' }, error: null },
                }),
              }),
              upsert: jest.fn(async () => ({})),
            };
          },
        }),
      }));
      const { POST } = require('@/app/api/webhooks/twilio/sms/route');
      const res = await POST(
        makeRequest({ From: '+15551230002', To: '+15551112222', Body: 'hello', MessageSid: 'sid-save-fail' })
      );
      expect(res.status).toBe(200);
      const txt = await res.text();
      expect(txt).toContain('<Response>');
      expect(legacySpy).not.toHaveBeenCalled();
    });
  });

  it('continues when abuse check throws', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      mockHeaders();
      const legacySpy = jest.fn(async () => {});
      jest.doMock('twilio', mockTwilioModule);
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: jest.fn(() => true),
        getOrCreateConversation: jest.fn(async () => ({ id: 'convAF', isNew: false, customer_id: 'cAF' })),
        saveIncomingMessage: jest.fn(async () => 'msgAF'),
        handleIncomingWithAI: legacySpy,
        formatPhoneE164: (x: string) => x,
        sendSMS: jest.fn(async () => ({})),
      }));
      jest.doMock('@/lib/leads-captain', () => ({
        isPhoneSuppressed: jest.fn(async () => false),
        handleComplianceKeywords: jest.fn(async () => ({ handled: false })),
        checkForAbuse: jest.fn(async () => {
          throw new Error('abuse check failed');
        }),
        blockForAbuse: jest.fn(async () => {}),
        incrementSMSUsage: jest.fn(async () => {}),
        hasLeadsCaptainAccess: jest.fn(async () => false),
        handleLeadsCaptainInboundSMS: jest.fn(async () => ({ success: true })),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'processed_webhook_events') {
              return {
                upsert: jest.fn(async () => ({})),
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: null, error: null }),
                  }),
                }),
              };
            }
            return {
              select: () => ({
                eq: () => ({
                  single: async () =>
                    table === 'businesses'
                      ? { data: { id: 'bAF', name: 'BizAF', ai_sms_enabled: false }, error: null }
                      : { data: { id: 'x' }, error: null },
                }),
              }),
              upsert: jest.fn(async () => ({})),
            };
          },
        }),
      }));
      const { POST } = require('@/app/api/webhooks/twilio/sms/route');
      const res = await POST(
        makeRequest({ From: '+15551230003', To: '+15551112222', Body: 'hello', MessageSid: 'sid-abuse-fail' })
      );
      expect(res.status).toBe(200);
      const txt = await res.text();
      expect(txt).toContain('<Response>');
      expect(legacySpy).not.toHaveBeenCalled();
    });
  });
  it('routes AI via v1 when hasLeadsCaptainAccess is true', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      mockHeaders();
      const v1Spy = jest.fn(async () => ({ success: true }));
      jest.doMock('twilio', mockTwilioModule);
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: jest.fn(() => true),
        getOrCreateConversation: jest.fn(async () => ({ id: 'conv6', isNew: false, customer_id: 'c6' })),
        saveIncomingMessage: jest.fn(async () => 'msg6'),
        handleIncomingWithAI: jest.fn(async () => {}),
        formatPhoneE164: (x: string) => x,
        sendSMS: jest.fn(async () => ({})),
      }));
      jest.doMock('@/lib/leads-captain', () => ({
        isPhoneSuppressed: jest.fn(async () => false),
        handleComplianceKeywords: jest.fn(async () => ({ handled: false })),
        checkForAbuse: jest.fn(async () => ({ shouldBlock: false, violations: [], suspicions: [] })),
        blockForAbuse: jest.fn(async () => {}),
        incrementSMSUsage: jest.fn(async () => {}),
        hasLeadsCaptainAccess: jest.fn(async () => true),
        handleLeadsCaptainInboundSMS: v1Spy,
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'processed_webhook_events') {
              return {
                upsert: jest.fn(async () => ({})),
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: null, error: null }),
                  }),
                }),
              };
            }
            return {
              select: () => ({
                eq: () => ({
                  single: async () =>
                    table === 'businesses'
                      ? { data: { id: 'b1', name: 'Biz', ai_sms_enabled: true }, error: null }
                      : { data: { id: 'x' }, error: null },
                  neq: () => ({
                    single: async () =>
                      table === 'leads_captain_config'
                        ? { data: null, error: null }
                        : { data: { id: 'x' }, error: null },
                  }),
                }),
              }),
              upsert: jest.fn(async () => ({})),
            };
          },
        }),
      }));
      const { POST } = require('@/app/api/webhooks/twilio/sms/route');
      const res = await POST(
        makeRequest({ From: '+15551234567', To: '+15551112222', Body: 'hi', MessageSid: 'sid-8' })
      );
      expect(res.status).toBe(200);
      expect(v1Spy).toHaveBeenCalled();
    });
  });

  it('uses legacy AI handler when Leads Captain not available', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      mockHeaders();
      const legacySpy = jest.fn(async () => {});
      jest.doMock('twilio', mockTwilioModule);
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: jest.fn(() => true),
        getOrCreateConversation: jest.fn(async () => ({ id: 'conv7', isNew: false, customer_id: 'c7' })),
        saveIncomingMessage: jest.fn(async () => 'msg7'),
        handleIncomingWithAI: legacySpy,
        formatPhoneE164: (x: string) => x,
        sendSMS: jest.fn(async () => ({})),
      }));
      jest.doMock('@/lib/leads-captain', () => ({
        isPhoneSuppressed: jest.fn(async () => false),
        handleComplianceKeywords: jest.fn(async () => ({ handled: false })),
        checkForAbuse: jest.fn(async () => ({ shouldBlock: false, violations: [], suspicions: [] })),
        blockForAbuse: jest.fn(async () => {}),
        incrementSMSUsage: jest.fn(async () => {}),
        hasLeadsCaptainAccess: jest.fn(async () => false),
        handleLeadsCaptainInboundSMS: jest.fn(async () => ({ success: true })),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'processed_webhook_events') {
              return {
                upsert: jest.fn(async () => ({})),
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: null, error: null }),
                  }),
                }),
              };
            }
            return {
              select: () => ({
                eq: () => ({
                  single: async () =>
                    table === 'businesses'
                      ? { data: { id: 'b1', name: 'Biz', ai_sms_enabled: true }, error: null }
                      : { data: { id: 'x' }, error: null },
                  neq: () => ({
                    single: async () =>
                      table === 'leads_captain_config'
                        ? { data: null, error: null }
                        : { data: { id: 'x' }, error: null },
                  }),
                }),
              }),
              upsert: jest.fn(async () => ({})),
            };
          },
        }),
      }));
      const { POST } = require('@/app/api/webhooks/twilio/sms/route');
      const res = await POST(
        makeRequest({ From: '+15551234567', To: '+15551112222', Body: 'hi', MessageSid: 'sid-9' })
      );
      expect(res.status).toBe(200);
      expect(legacySpy).toHaveBeenCalled();
    });
  });

  it('skips saving message when conversation load returns null', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      mockHeaders();
      const saveSpy = jest.fn(async () => 'msgX');
      const legacySpy = jest.fn(async () => {});
      jest.doMock('twilio', mockTwilioModule);
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: jest.fn(() => true),
        getOrCreateConversation: jest.fn(async () => null),
        saveIncomingMessage: saveSpy,
        handleIncomingWithAI: legacySpy,
        formatPhoneE164: (x: string) => x,
        sendSMS: jest.fn(async () => ({})),
      }));
      jest.doMock('@/lib/leads-captain', () => ({
        isPhoneSuppressed: jest.fn(async () => false),
        handleComplianceKeywords: jest.fn(async () => ({ handled: false })),
        checkForAbuse: jest.fn(async () => ({ shouldBlock: false, violations: [], suspicions: [] })),
        blockForAbuse: jest.fn(async () => {}),
        incrementSMSUsage: jest.fn(async () => {}),
        hasLeadsCaptainAccess: jest.fn(async () => false),
        handleLeadsCaptainInboundSMS: jest.fn(async () => ({ success: true })),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'processed_webhook_events') {
              return {
                upsert: jest.fn(async () => ({})),
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: null, error: null }),
                  }),
                }),
              };
            }
            return {
              select: () => ({
                eq: () => ({
                  single: async () =>
                    table === 'businesses'
                      ? { data: { id: 'bNull', name: 'BizNull', ai_sms_enabled: false }, error: null }
                      : { data: { id: 'x' }, error: null },
                }),
              }),
              upsert: jest.fn(async () => ({})),
            };
          },
        }),
      }));
      const { POST } = require('@/app/api/webhooks/twilio/sms/route');
      const res = await POST(
        makeRequest({ From: '+15551231111', To: '+15551112222', Body: 'hello', MessageSid: 'sid-conv-null' })
      );
      expect(res.status).toBe(200);
      expect(saveSpy).not.toHaveBeenCalled();
      expect(legacySpy).not.toHaveBeenCalled();
      const txt = await res.text();
      expect(txt).toContain('<Response>');
    });
  });
  it('handles errors and returns empty TwiML', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      mockHeaders();
      jest.doMock('twilio', mockTwilioModule);
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: jest.fn(() => true),
        getOrCreateConversation: jest.fn(async () => {
          throw new Error('boom');
        }),
        saveIncomingMessage: jest.fn(async () => 'msgX'),
        handleIncomingWithAI: jest.fn(async () => {}),
        formatPhoneE164: (x: string) => x,
        sendSMS: jest.fn(async () => ({})),
      }));
      jest.doMock('@/lib/leads-captain', () => ({
        isPhoneSuppressed: jest.fn(async () => false),
        handleComplianceKeywords: jest.fn(async () => ({ handled: false })),
        checkForAbuse: jest.fn(async () => ({ shouldBlock: false, violations: [], suspicions: [] })),
        blockForAbuse: jest.fn(async () => {}),
        incrementSMSUsage: jest.fn(async () => {}),
        hasLeadsCaptainAccess: jest.fn(async () => false),
        handleLeadsCaptainInboundSMS: jest.fn(async () => ({ success: true })),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => ({
            select: () => ({
              eq: () => ({
                single: async () =>
                  table === 'businesses'
                    ? { data: { id: 'b1', name: 'Biz', ai_sms_enabled: true }, error: null }
                    : { data: { id: 'x' }, error: null },
              }),
            }),
            upsert: jest.fn(async () => ({})),
          }),
        }),
      }));
      const { POST } = require('@/app/api/webhooks/twilio/sms/route');
      const res = await POST(
        makeRequest({ From: '+15551234567', To: '+15551112222', Body: 'err', MessageSid: 'sid-10' })
      );
      expect(res.status).toBe(200);
      const txt = await res.text();
      expect(txt).toContain('<Response>');
    });
  });

  it('processes in production with valid signature', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      process.env.NODE_ENV = 'production';
      mockHeaders('good');
      const legacySpy = jest.fn(async () => {});
      jest.doMock('twilio', mockTwilioModule);
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: jest.fn(() => true),
        getOrCreateConversation: jest.fn(async () => ({ id: 'convP', isNew: false, customer_id: 'cP' })),
        saveIncomingMessage: jest.fn(async () => 'msgP'),
        handleIncomingWithAI: legacySpy,
        formatPhoneE164: (x: string) => x,
        sendSMS: jest.fn(async () => ({})),
      }));
      jest.doMock('@/lib/leads-captain', () => ({
        isPhoneSuppressed: jest.fn(async () => false),
        handleComplianceKeywords: jest.fn(async () => ({ handled: false })),
        checkForAbuse: jest.fn(async () => ({ shouldBlock: false, violations: [], suspicions: [] })),
        blockForAbuse: jest.fn(async () => {}),
        incrementSMSUsage: jest.fn(async () => {}),
        hasLeadsCaptainAccess: jest.fn(async () => false),
        handleLeadsCaptainInboundSMS: jest.fn(async () => ({ success: true })),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'processed_webhook_events') {
              return {
                upsert: jest.fn(async () => ({})),
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: null, error: null }),
                  }),
                }),
              };
            }
            if (table === 'leads_captain_config') {
              return {
                select: () => ({
                  eq: () => ({
                    neq: () => ({
                      single: async () => ({ data: null, error: null }),
                    }),
                  }),
                }),
              };
            }
            return {
              select: () => ({
                eq: () => ({
                  single: async () =>
                    table === 'businesses'
                      ? { data: { id: 'bP', name: 'BizP', ai_sms_enabled: true }, error: null }
                      : { data: { id: 'x' }, error: null },
                }),
              }),
              upsert: jest.fn(async () => ({})),
            };
          },
        }),
      }));
      const { POST } = require('@/app/api/webhooks/twilio/sms/route');
      const res = await POST(
        makeRequest({ From: '+15550000011', To: '+15551112222', Body: 'hello', MessageSid: 'sid-prod' })
      );
      expect(res.status).toBe(200);
      expect(legacySpy).toHaveBeenCalled();
      process.env.NODE_ENV = 'test';
    });
  });

  it('handles STOP via fallback when compliance not handled', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      mockHeaders();
      jest.doMock('twilio', mockTwilioModule);
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: jest.fn(() => true),
        getOrCreateConversation: jest.fn(async () => ({ id: 'convS', isNew: false, customer_id: 'cS' })),
        saveIncomingMessage: jest.fn(async () => 'msgS'),
        handleIncomingWithAI: jest.fn(async () => {}),
        formatPhoneE164: (x: string) => x,
        sendSMS: jest.fn(async () => ({})),
      }));
      jest.doMock('@/lib/leads-captain', () => ({
        isPhoneSuppressed: jest.fn(async () => false),
        handleComplianceKeywords: jest.fn(async () => ({ handled: false })),
        checkForAbuse: jest.fn(async () => ({ shouldBlock: false, violations: [], suspicions: [] })),
        blockForAbuse: jest.fn(async () => {}),
        incrementSMSUsage: jest.fn(async () => {}),
        hasLeadsCaptainAccess: jest.fn(async () => false),
        handleLeadsCaptainInboundSMS: jest.fn(async () => ({ success: true })),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'processed_webhook_events') {
              return {
                upsert: jest.fn(async () => ({})),
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: null, error: null }),
                  }),
                }),
              };
            }
            return {
              select: () => ({
                eq: () => ({
                  single: async () =>
                    table === 'businesses'
                      ? { data: { id: 'bS', name: 'BizS', ai_sms_enabled: true }, error: null }
                      : { data: { id: 'x' }, error: null },
                }),
              }),
              upsert: jest.fn(async () => ({})),
            };
          },
        }),
      }));
      const { POST } = require('@/app/api/webhooks/twilio/sms/route');
      const res = await POST(
        makeRequest({ From: '+15550000012', To: '+15551112222', Body: 'stop', MessageSid: 'sid-stop' })
      );
      const txt = await res.text();
      expect(res.status).toBe(200);
      expect(txt.toLowerCase()).toContain('unsubscribed');
    });
  });

  it('skips AI path when ai_sms_enabled is false', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      mockHeaders();
      const legacySpy = jest.fn(async () => {});
      jest.doMock('twilio', mockTwilioModule);
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: jest.fn(() => true),
        getOrCreateConversation: jest.fn(async () => ({ id: 'convN', isNew: false, customer_id: 'cN' })),
        saveIncomingMessage: jest.fn(async () => 'msgN'),
        handleIncomingWithAI: legacySpy,
        formatPhoneE164: (x: string) => x,
        sendSMS: jest.fn(async () => ({})),
      }));
      jest.doMock('@/lib/leads-captain', () => ({
        isPhoneSuppressed: jest.fn(async () => false),
        handleComplianceKeywords: jest.fn(async () => ({ handled: false })),
        checkForAbuse: jest.fn(async () => ({ shouldBlock: false, violations: [], suspicions: [] })),
        blockForAbuse: jest.fn(async () => {}),
        incrementSMSUsage: jest.fn(async () => {}),
        hasLeadsCaptainAccess: jest.fn(async () => false),
        handleLeadsCaptainInboundSMS: jest.fn(async () => ({ success: true })),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'processed_webhook_events') {
              return {
                upsert: jest.fn(async () => ({})),
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: null, error: null }),
                  }),
                }),
              };
            }
            return {
              select: () => ({
                eq: () => ({
                  single: async () =>
                    table === 'businesses'
                      ? { data: { id: 'bN', name: 'BizN', ai_sms_enabled: false }, error: null }
                      : { data: { id: 'x' }, error: null },
                }),
              }),
              upsert: jest.fn(async () => ({})),
            };
          },
        }),
      }));
      const { POST } = require('@/app/api/webhooks/twilio/sms/route');
      const res = await POST(
        makeRequest({ From: '+15550000013', To: '+15551112222', Body: 'hi', MessageSid: 'sid-noai' })
      );
      expect(res.status).toBe(200);
      expect(legacySpy).not.toHaveBeenCalled();
      const txt = await res.text();
      expect(txt).toContain('<Response>');
    });
  });
});
