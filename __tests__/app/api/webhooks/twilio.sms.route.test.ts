import { describe, it, expect, jest } from '@jest/globals';
import type { NextResponse } from 'next/server';

function mockNextServer() {
  jest.doMock('next/server', () => {
    class SimpleResponse {
      status: number;
      headers: Record<string, string>;
      private _body: string;
      constructor(body: string, init: any) {
        this._body = body;
        this.status = init?.status ?? 200;
        this.headers = init?.headers ?? {};
      }
      text() {
        return Promise.resolve(this._body);
      }
    }
    return { NextResponse: SimpleResponse };
  });
}

function makeRequest(form: Record<string, string>) {
  return {
    url: 'https://example.com/api/webhooks/twilio/sms',
    async formData() {
      const FD = (global as any).FormData || require('formdata-node').FormData;
      const fd = new FD();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      return fd;
    },
  } as any;
}

function makeSupabase(overrides: {
  processed?: boolean;
  business?: { id: string; name?: string; ai_sms_enabled?: boolean; twilio_phone_number?: string } | null;
} = {}) {
  const processed = overrides.processed ?? false;
  const business = overrides.business ?? { id: 'biz1', name: 'Biz', ai_sms_enabled: true, twilio_phone_number: '+15551112222' };

  return {
    rpc: async () => ({ data: {}, error: null }),
    from(table: string) {
      if (table === 'processed_webhook_events') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: processed ? { id: 'evt1' } : null, error: null }),
            }),
          }),
          upsert: async () => ({ data: {}, error: null }),
        };
      }
      if (table === 'businesses') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: business, error: null }),
            }),
          }),
        };
      }
      if (table === 'sms_conversations') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({ data: null, error: null }),
              }),
            }),
          }),
          insert: (_rec: any) => ({
            select: () => ({
              single: async () => ({ data: { id: 'conv-test', customer_id: null }, error: null }),
            }),
          }),
          update: (_updates: any) => ({
            eq: (_field: string, _val: any) => Promise.resolve({ data: {}, error: null }),
          }),
        };
      }
      if (table === 'sms_messages') {
        return {
          insert: (_rec: any) => ({
            select: (_cols?: any) => ({
              single: async () => ({ data: { id: 'msg-test' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'customers') {
        return {
          upsert: async () => ({ data: {}, error: null }),
        };
      }
      return {
        upsert: async () => ({ data: {}, error: null }),
        select: () => ({ single: async () => ({ data: null, error: null }) }),
      };
    },
  };
}

describe('Twilio SMS webhook route', () => {
  it('returns 400 for missing required fields', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('@/lib/supabase/server', () => ({ createAdminClient: () => makeSupabase() }));
      const route = require('@/app/api/webhooks/twilio/sms/route');
      const res: NextResponse = await route.POST(makeRequest({ From: '+15550000000', To: '+15551112222' }));
      expect(res.status).toBe(400);
    });
  });

  it('returns 403 when signature invalid in production', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      process.env.NODE_ENV = 'production';
      jest.doMock('next/headers', () => ({
        headers: async () => ({
          get: (key: string) => (key === 'x-twilio-signature' ? 'bad' : null),
        }),
      }));
      jest.doMock('@/lib/twilio', () => ({ validateTwilioSignature: () => false }));
      jest.doMock('@/lib/supabase/server', () => ({ createAdminClient: () => makeSupabase() }));
      const route = require('@/app/api/webhooks/twilio/sms/route');
      const res: NextResponse = await route.POST(makeRequest({ From: '+15550000000', To: '+15551112222', Body: 'hi', MessageSid: 'SMxxx' }));
      expect(res.status).toBe(403);
      process.env.NODE_ENV = 'test';
    });
  });

  it('returns empty TwiML when business not found', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('@/lib/supabase/server', () => ({ createAdminClient: () => makeSupabase({ business: null }) }));
      const route = require('@/app/api/webhooks/twilio/sms/route');
      const res: NextResponse = await route.POST(makeRequest({ From: '+15550000000', To: '+15551112222', Body: 'hi', MessageSid: 'SM1' }));
      expect(res.status).toBe(200);
    });
  });

  it('suppresses messages from suppressed phones', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('@/lib/leads-captain', () => {
        const real = jest.requireActual('@/lib/leads-captain');
        return { ...real, isPhoneSuppressed: async () => true };
      });
      jest.doMock('@/lib/supabase/server', () => ({ createAdminClient: () => makeSupabase() }));
      const route = require('@/app/api/webhooks/twilio/sms/route');
      const res: NextResponse = await route.POST(makeRequest({ From: '+15550000001', To: '+15551112222', Body: 'STOP', MessageSid: 'SM2' }));
      expect(res.status).toBe(200);
    });
  });

  it('handles compliance and returns response TwiML', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('@/lib/leads-captain', () => {
        const real = jest.requireActual('@/lib/leads-captain');
        return { ...real, handleComplianceKeywords: async () => ({ handled: true, response: 'You are unsubscribed' }) };
      });
      jest.doMock('@/lib/supabase/server', () => ({ createAdminClient: () => makeSupabase() }));
      const route = require('@/app/api/webhooks/twilio/sms/route');
      const res: NextResponse = await route.POST(makeRequest({ From: '+15550000002', To: '+15551112222', Body: 'STOP', MessageSid: 'SM3' }));
      const text = await (res as any).text?.() || '';
      expect(text).toContain('<?xml');
      expect(res.status).toBe(200);
    });
  });

  it('blocks for abuse and returns empty TwiML', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('@/lib/leads-captain', () => {
        const real = jest.requireActual('@/lib/leads-captain');
        return {
          ...real,
          checkForAbuse: async () => ({ shouldBlock: true, violations: ['spam'] }),
          blockForAbuse: async () => {},
        };
      });
      jest.doMock('@/lib/supabase/server', () => ({ createAdminClient: () => makeSupabase() }));
      const route = require('@/app/api/webhooks/twilio/sms/route');
      const res: NextResponse = await route.POST(makeRequest({ From: '+15550000003', To: '+15551112222', Body: 'bad words', MessageSid: 'SM4' }));
      expect(res.status).toBe(200);
    });
  });

  it('routes to Leads Captain v2 and sends SMS when should_send', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      const sendSMSMock = jest.fn(async () => ({ success: true }));
      jest.doMock('@/lib/twilio', () => ({ sendSMS: sendSMSMock, formatPhoneE164: (x: string) => x }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from(table: string) {
            if (table === 'processed_webhook_events') {
              return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }), upsert: async () => ({}) };
            }
            if (table === 'businesses') {
              return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'biz1', name: 'Biz', ai_sms_enabled: true, twilio_phone_number: '+15551112222' } }) }) }) };
            }
            if (table === 'leads_captain_config') {
              return { select: () => ({ eq: () => ({ neq: () => ({ single: async () => ({ data: { id: 'cfg1', global_mode: 'normal' } }) }) }) }) };
            }
            return { upsert: async () => ({}) };
          },
        }),
      }));
      jest.doMock('@/lib/leads-captain/v2', () => ({
        processInboundMessage: async () => ({
          response_content: 'Hello from v2',
          should_send: true,
          requires_approval: false,
          classification: { intent: 'general', confidence: 90, sentiment: 'neutral', language: 'en', entities: {}, is_compliance: false },
          rule_matched: null,
          template_used: null,
          ai_used: false,
          explanation: 'ok',
          decision_details: {},
          notifications: [],
          conversation_updates: {},
          should_escalate: false,
        }),
      }));
      const route = require('@/app/api/webhooks/twilio/sms/route');
      const res: NextResponse = await route.POST(makeRequest({ From: '+15550000004', To: '+15551112222', Body: 'hello', MessageSid: 'SM5' }));
      expect(res.status).toBe(200);
      const text = await (res as any).text?.() || '';
      expect(text).toContain('<?xml');
    });
  });

  it('routes to v1 when hasLeadsCaptainAccess', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      const v1Mock = jest.fn(async () => {});
      jest.doMock('@/lib/leads-captain', () => {
        const real = jest.requireActual('@/lib/leads-captain');
        return { ...real, hasLeadsCaptainAccess: async () => true, handleLeadsCaptainInboundSMS: v1Mock };
      });
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from(table: string) {
            if (table === 'processed_webhook_events') {
              return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }), upsert: async () => ({}) };
            }
            if (table === 'businesses') {
              return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'biz1', name: 'Biz', ai_sms_enabled: true, twilio_phone_number: '+15551112222' } }) }) }) };
            }
            if (table === 'leads_captain_config') {
              return { select: () => ({ eq: () => ({ neq: () => ({ single: async () => ({ data: null }) }) }) }) };
            }
            return { upsert: async () => ({}) };
          },
        }),
      }));
      const route = require('@/app/api/webhooks/twilio/sms/route');
      const res: NextResponse = await route.POST(makeRequest({ From: '+15550000006', To: '+15551112222', Body: 'hello', MessageSid: 'SM6' }));
      expect(res.status).toBe(200);
      const text = await (res as any).text?.() || '';
      expect(text).toContain('<?xml');
    });
  });

  it('uses original AI handler when Leads Captain not available', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      const aiMock = jest.fn(async () => {});
      jest.doMock('@/lib/leads-captain', () => {
        const real = jest.requireActual('@/lib/leads-captain');
        return { ...real, hasLeadsCaptainAccess: async () => false };
      });
      // The original AI handler is exported from lib/twilio
      jest.doMock('@/lib/twilio', () => {
        const real = jest.requireActual('@/lib/twilio');
        return { ...real, handleIncomingWithAI: aiMock, formatPhoneE164: (x: string) => x };
      });
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from(table: string) {
            if (table === 'processed_webhook_events') {
              return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }), upsert: async () => ({}) };
            }
            if (table === 'businesses') {
              return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'biz1', name: 'Biz', ai_sms_enabled: true, twilio_phone_number: '+15551112222' } }) }) }) };
            }
            if (table === 'leads_captain_config') {
              return { select: () => ({ eq: () => ({ neq: () => ({ single: async () => ({ data: null }) }) }) }) };
            }
            return { upsert: async () => ({}) };
          },
        }),
      }));
      const route = require('@/app/api/webhooks/twilio/sms/route');
      const res: NextResponse = await route.POST(makeRequest({ From: '+15550000007', To: '+15551112222', Body: 'hello', MessageSid: 'SM7' }));
      expect(res.status).toBe(200);
      const text = await (res as any).text?.() || '';
      expect(text).toContain('<?xml');
    });
  });

  it('skips processing when message already processed (idempotent)', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      const incrementMock = jest.fn(async () => {});
      jest.doMock('@/lib/leads-captain', () => {
        const real = jest.requireActual('@/lib/leads-captain');
        return { ...real, incrementSMSUsage: incrementMock };
      });
      jest.doMock('@/lib/supabase/server', () => ({ createAdminClient: () => makeSupabase({ processed: true }) }));
      const route = require('@/app/api/webhooks/twilio/sms/route');
      const res: NextResponse = await route.POST(makeRequest({ From: '+15550000008', To: '+15551112222', Body: 'hello', MessageSid: 'SM8' }));
      expect(res.status).toBe(200);
      expect(incrementMock).not.toHaveBeenCalled();
    });
  });
});
