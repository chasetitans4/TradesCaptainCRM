import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { NextResponse } from 'next/server';

// Helper to mock Next.js server response
function mockNextServer() {
  jest.doMock('next/server', () => {
    class SimpleResponse {
      status: number;
      headers: Map<string, string>;
      private _body: string;
      constructor(body: string, init: any) {
        this._body = body;
        this.status = init?.status ?? 200;
        this.headers = new Map(Object.entries(init?.headers || {})) as any;
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
    url: 'https://example.com/api/webhooks/twilio/voice',
    formData: async () => {
      const map = new Map();
      Object.entries(form).forEach(([k, v]) => map.set(k, v));
      return map;
    },
    nextUrl: {
      searchParams: new URLSearchParams(),
    }
  } as any;
}

describe('Twilio voice webhook route', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('returns 403 when signature invalid in production', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      process.env.NODE_ENV = 'production';
      
      jest.doMock('next/headers', () => ({
        headers: async () => ({ get: (k: string) => (k === 'x-twilio-signature' ? 'bad_sig' : null) }),
      }));
      
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: () => false,
        formatPhoneE164: (x: string) => x
      }));
      
      const route = require('@/app/api/webhooks/twilio/voice/route');
      const res = await route.POST(makeRequest({ From: '+15550000000', To: '+15551112222', CallSid: 'CA1' }));
      expect(res.status).toBe(403);
      
      process.env.NODE_ENV = 'test';
    });
  });

  it('calls AI handler when configured', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      
      // Mock Dependencies
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: () => true,
        formatPhoneE164: (x: string) => x
      }));

      jest.doMock('@/lib/voice', () => ({
        handleIncomingCall: jest.fn().mockResolvedValue({
          twiml: '<Response><Say>AI handled</Say></Response>',
          useAIVoice: true,
          availabilityState: 'available'
        })
      }));

      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            const mockSelect = {
              select: (cols: string) => mockSelect,
              eq: (col: string, val: any) => mockSelect,
              single: async () => {
                if (table === 'businesses') return { data: { id: 'biz1', name: 'TestBiz', timezone: 'UTC' } };
                if (table === 'voice_receptionist_settings') return { data: { id: 'set1', enable_daytime_ai_voice: true, daytime_ai_voice_consent_at: '2023-01-01' } };
                if (table === 'customers') return { data: { id: 'cust1' } };
                if (table === 'processed_webhook_events') return { data: null }; // Not processed yet
                return { data: null };
              },
              insert: async () => ({ error: null }),
              upsert: async () => ({ error: null }),
            };
            return mockSelect;
          },
        }),
      }));

      const route = require('@/app/api/webhooks/twilio/voice/route');
      const { handleIncomingCall } = require('@/lib/voice');

      const res = await route.POST(makeRequest({ From: '+15550000000', To: '+15551112222', CallSid: 'CA_AI_TEST' }));
      
      expect(res.status).toBe(200);
      expect(await res.text()).toContain('AI handled');
      expect(handleIncomingCall).toHaveBeenCalled();
    });
  });

  it('falls back to legacy when AI handler throws', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: () => true,
        formatPhoneE164: (x: string) => x
      }));

      jest.doMock('@/lib/voice', () => ({
        handleIncomingCall: jest.fn().mockRejectedValue(new Error('AI fail'))
      }));

      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
             const mockSelect = {
              select: () => mockSelect,
              eq: () => mockSelect,
              single: async () => {
                if (table === 'businesses') return { 
                  data: { 
                    id: 'biz1', 
                    name: 'TestBiz', 
                    call_forwarding_mode: 'voicemail',
                    timezone: 'UTC' 
                  } 
                };
                if (table === 'voice_receptionist_settings') return { data: { daytime_ai_voice_consent_at: '2023-01-01' } };
                if (table === 'processed_webhook_events') return { data: null };
                return { data: null };
              },
              insert: async () => ({}),
              upsert: async () => ({}),
            };
            return mockSelect;
          },
        }),
      }));

      const route = require('@/app/api/webhooks/twilio/voice/route');
      const res = await route.POST(makeRequest({ From: '+15550000000', To: '+15551112222', CallSid: 'CA_FAIL' }));
      
      expect(res.status).toBe(200);
      const text = await res.text();
      // Should get legacy voicemail TwiML
      expect(text).toContain('Thank you for calling TestBiz. Please leave a message after the beep.');
    });
  });

  it('uses legacy handling when AI voice is not consented', async () => {
     await jest.isolateModulesAsync(async () => {
      mockNextServer();
      
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: () => true,
        formatPhoneE164: (x: string) => x
      }));

      // No mock for @/lib/voice needed, it shouldn't be called, but we can mock it to ensure it isn't
      jest.doMock('@/lib/voice', () => ({
        handleIncomingCall: jest.fn()
      }));

      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
             const mockSelect = {
              select: () => mockSelect,
              eq: () => mockSelect,
              single: async () => {
                if (table === 'businesses') return { 
                  data: { 
                    id: 'biz1', 
                    name: 'TestBiz', 
                    call_forwarding_mode: 'voicemail',
                    timezone: 'UTC' 
                  } 
                };
                if (table === 'voice_receptionist_settings') return { data: { daytime_ai_voice_consent_at: null } }; // No consent
                if (table === 'processed_webhook_events') return { data: null };
                return { data: null };
              },
              insert: async () => ({}),
              upsert: async () => ({}),
            };
            return mockSelect;
          },
        }),
      }));

      const route = require('@/app/api/webhooks/twilio/voice/route');
      const { handleIncomingCall } = require('@/lib/voice');

      const res = await route.POST(makeRequest({ From: '+15550000000', To: '+15551112222', CallSid: 'CA_LEGACY' }));
      
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('Thank you for calling TestBiz. Please leave a message after the beep.');
      expect(handleIncomingCall).not.toHaveBeenCalled();
    });
  });
});
