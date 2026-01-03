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
    url: 'https://example.com/api/webhooks/twilio/voice/fallback',
    async formData() {
      const FD = (global as any).FormData || require('formdata-node').FormData;
      const fd = new FD();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      return fd;
    },
  } as any;
}

describe('Twilio voice fallback route', () => {
  it('returns voicemail TwiML and triggers Leads Captain v2 when not completed', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'biz1', ai_sms_enabled: true } }) }) }) };
            }
            if (table === 'leads_captain_config') {
              return { select: () => ({ eq: () => ({ neq: () => ({ single: async () => ({ data: { id: 'cfg1', global_mode: 'normal' } }) }) }) }) };
            }
            return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) };
          },
        }),
      }));
      jest.doMock('@/lib/leads-captain/v2', () => ({
        processInboundMessage: async () => ({
          should_send: false,
          response_content: null,
          ai_used: false,
        }),
      }));
      jest.doMock('@/lib/leads-captain', () => ({
        hasLeadsCaptainAccess: async () => false,
        handleMissedCall: jest.fn(async () => ({})),
      }));
      jest.doMock('@/lib/twilio', () => ({
        formatPhoneE164: (x: string) => x,
        sendSMS: jest.fn(async () => ({})),
      }));
      const route = require('@/app/api/webhooks/twilio/voice/fallback/route');
      const res: NextResponse = await route.POST(
        makeRequest({ DialCallStatus: 'no-answer', CallSid: 'CAx', From: '+15550000000', To: '+15551112222' })
      );
      const body = await (res as any).text?.();
      expect(res.status).toBe(200);
      expect(body).toContain('<?xml');
      expect(body).toContain('<Record');
    });
  });

  it('returns simple TwiML when call completed', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      const route = require('@/app/api/webhooks/twilio/voice/fallback/route');
      const res: NextResponse = await route.POST(
        makeRequest({ DialCallStatus: 'completed', CallSid: 'CAy', From: '+15550000000', To: '+15551112222' })
      );
      const body = await (res as any).text?.();
      expect(res.status).toBe(200);
      expect(body).toContain('<?xml');
    });
  });

  it('sends Leads Captain v2 SMS when should_send is true', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      const sendSpy = jest.fn(async () => ({}));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'biz2', ai_sms_enabled: true } }) }) }) };
            }
            if (table === 'leads_captain_config') {
              return { select: () => ({ eq: () => ({ neq: () => ({ single: async () => ({ data: { id: 'cfg2', global_mode: 'normal' } }) }) }) }) };
            }
            return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) };
          },
        }),
      }));
      jest.doMock('@/lib/leads-captain/v2', () => ({
        processInboundMessage: async () => ({
          should_send: true,
          response_content: 'Thanks for calling, we will text you details.',
          ai_used: true,
        }),
      }));
      jest.doMock('@/lib/leads-captain', () => ({
        hasLeadsCaptainAccess: async () => false,
        handleMissedCall: jest.fn(async () => ({})),
      }));
      jest.doMock('@/lib/twilio', () => ({
        formatPhoneE164: (x: string) => x,
        sendSMS: sendSpy,
      }));
      const route = require('@/app/api/webhooks/twilio/voice/fallback/route');
      const res: NextResponse = await route.POST(
        makeRequest({ DialCallStatus: 'busy', CallSid: 'CAz', From: '+15550000009', To: '+15551112222' })
      );
      expect(res.status).toBe(200);
      expect(sendSpy).toHaveBeenCalledWith({
        to: '+15550000009',
        body: 'Thanks for calling, we will text you details.',
        businessId: 'biz2',
        isAIResponse: true,
      });
    });
  });

  it('handles Leads Captain v2 error gracefully without failing TwiML', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'biz3', ai_sms_enabled: true } }) }) }) };
            }
            if (table === 'leads_captain_config') {
              return { select: () => ({ eq: () => ({ neq: () => ({ single: async () => ({ data: { id: 'cfg3', global_mode: 'normal' } }) }) }) }) };
            }
            return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) };
          },
        }),
      }));
      jest.doMock('@/lib/leads-captain/v2', () => ({
        processInboundMessage: async () => { throw new Error('processor failed'); },
      }));
      jest.doMock('@/lib/leads-captain', () => ({
        hasLeadsCaptainAccess: async () => false,
        handleMissedCall: jest.fn(async () => ({})),
      }));
      jest.doMock('@/lib/twilio', () => ({
        formatPhoneE164: (x: string) => x,
        sendSMS: jest.fn(async () => ({})),
      }));
      const route = require('@/app/api/webhooks/twilio/voice/fallback/route');
      const res: NextResponse = await route.POST(
        makeRequest({ DialCallStatus: 'failed', CallSid: 'CAfail', From: '+15550000020', To: '+15551112222' })
      );
      const body = await (res as any).text?.();
      expect(res.status).toBe(200);
      expect(body).toContain('<Record');
    });
  });

  it('triggers Leads Captain v1 when v2 config is absent and access granted', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      const handleMissedSpy = jest.fn(async () => ({}));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'biz4', ai_sms_enabled: true } }) }) }) };
            }
            if (table === 'leads_captain_config') {
              return { select: () => ({ eq: () => ({ neq: () => ({ single: async () => ({ data: null }) }) }) }) };
            }
            return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) };
          },
        }),
      }));
      jest.doMock('@/lib/leads-captain', () => ({
        hasLeadsCaptainAccess: async () => true,
        handleMissedCall: handleMissedSpy,
      }));
      jest.doMock('@/lib/twilio', () => ({
        formatPhoneE164: (x: string) => x,
        sendSMS: jest.fn(async () => ({})),
      }));
      const route = require('@/app/api/webhooks/twilio/voice/fallback/route');
      const res: NextResponse = await route.POST(
        makeRequest({
          DialCallStatus: 'no-answer',
          CallSid: 'CAV1',
          From: '+15550000030',
          To: '+15551112222',
          CallerName: 'John',
          FromCity: 'City',
          FromState: 'ST',
          FromZip: '00000',
          FromCountry: 'US',
        })
      );
      expect(res.status).toBe(200);
      expect(handleMissedSpy).toHaveBeenCalled();
      const payload = handleMissedSpy.mock.calls[0][0];
      expect(payload.CallSid).toBe('CAV1');
      expect(payload.Direction).toBe('inbound');
    });
  });

  it('returns error TwiML when request parsing throws', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      const faultyReq = {
        url: 'https://example.com/api/webhooks/twilio/voice/fallback',
        async formData() {
          throw new Error('bad form');
        },
      } as any;
      const route = require('@/app/api/webhooks/twilio/voice/fallback/route');
      const res: NextResponse = await route.POST(faultyReq);
      const body = await (res as any).text?.();
      expect(res.status).toBe(200);
      expect(body).toContain('An error occurred');
    });
  });
});
