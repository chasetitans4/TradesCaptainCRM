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
    url: 'https://example.com/api/webhooks/twilio/voice',
    async formData() {
      const FD = (global as any).FormData || require('formdata-node').FormData;
      const fd = new FD();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      return fd;
    },
  } as any;
}

describe('Twilio voice webhook route', () => {
  it('returns 403 when signature invalid in production', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      process.env.NODE_ENV = 'production';
      jest.doMock('next/headers', () => ({
        headers: async () => ({ get: (k: string) => (k === 'x-twilio-signature' ? 'bad' : null) }),
      }));
      jest.doMock('@/lib/twilio', () => ({ validateTwilioSignature: () => false, formatPhoneE164: (x: string) => x }));
      const route = require('@/app/api/webhooks/twilio/voice/route');
      const res: NextResponse = await route.POST(makeRequest({ From: '+15550000000', To: '+15551112222', CallSid: 'CA1' }));
      expect(res.status).toBe(403);
      process.env.NODE_ENV = 'test';
    });
  });

  it('processes in production with valid signature', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      process.env.NODE_ENV = 'production';
      jest.doMock('next/headers', () => ({
        headers: async () => ({ get: (k: string) => (k === 'x-twilio-signature' ? 'good' : null) }),
      }));
      jest.doMock('@/lib/twilio', () => ({ validateTwilioSignature: () => true, formatPhoneE164: (x: string) => x }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        id: 'bizP',
                        name: 'BizP',
                        call_forwarding_mode: 'voicemail',
                        call_forward_numbers: [],
                        call_ring_timeout: 15,
                        call_business_hours_only: false,
                        voicemail_greeting_url: null,
                        business_hours: null,
                        timezone: 'UTC',
                      },
                    }),
                  }),
                }),
              };
            }
            if (table === 'customers') {
              return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }) };
            }
            return { insert: async () => ({}) };
          },
        }),
      }));
      const route = require('@/app/api/webhooks/twilio/voice/route');
      const res: NextResponse = await route.POST(makeRequest({ From: '+15550000000', To: '+15551112222', CallSid: 'CAP' }));
      expect(res.status).toBe(200);
      process.env.NODE_ENV = 'test';
    });
  });

  it('returns voicemail TwiML when business not found', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) };
            }
            return { insert: async () => ({}) };
          },
        }),
      }));
      const route = require('@/app/api/webhooks/twilio/voice/route');
      const res: NextResponse = await route.POST(makeRequest({ From: '+15550000001', To: '+15551112222', CallSid: 'CA2' }));
      const body = await (res as any).text?.();
      expect(res.status).toBe(200);
      expect(body).toContain('<?xml');
      expect(body).toContain('<Record');
    });
  });

  it('forwards call when mode is forward_owner', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('@/lib/twilio', () => ({ validateTwilioSignature: () => true, formatPhoneE164: (x: string) => x }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        id: 'biz1',
                        name: 'Biz',
                        call_forwarding_mode: 'forward_owner',
                        call_forward_numbers: ['+15551234567'],
                        call_ring_timeout: 15,
                        call_business_hours_only: false,
                        voicemail_greeting_url: null,
                        business_hours: null,
                        timezone: 'UTC',
                      },
                    }),
                  }),
                }),
              };
            }
            if (table === 'customers') {
              return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }) };
            }
            return { insert: async () => ({}) };
          },
        }),
      }));
      const route = require('@/app/api/webhooks/twilio/voice/route');
      const res: NextResponse = await route.POST(makeRequest({ From: '+15550000002', To: '+15551112222', CallSid: 'CA3' }));
      const body = await (res as any).text?.();
      expect(res.status).toBe(200);
      expect(body).toContain('<Dial');
      expect(body).toContain('/api/webhooks/twilio/voice/fallback');
    });
  });

  it('falls back to voicemail when forward_owner has no numbers', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('@/lib/twilio', () => ({ validateTwilioSignature: () => true, formatPhoneE164: (x: string) => x }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        id: 'bizNo',
                        name: 'BizNo',
                        call_forwarding_mode: 'forward_owner',
                        call_forward_numbers: [],
                        call_ring_timeout: 15,
                        call_business_hours_only: false,
                        voicemail_greeting_url: null,
                        business_hours: null,
                        timezone: 'UTC',
                      },
                    }),
                  }),
                }),
              };
            }
            if (table === 'customers') {
              return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }) };
            }
            return { insert: async () => ({}) };
          },
        }),
      }));
      const route = require('@/app/api/webhooks/twilio/voice/route');
      const res: NextResponse = await route.POST(makeRequest({ From: '+15550000006', To: '+15551112222', CallSid: 'CANO' }));
      const body = await (res as any).text?.();
      expect(res.status).toBe(200);
      expect(body).toContain('<Record');
    });
  });

  it('sequentially forwards when mode is forward_sequential', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('@/lib/twilio', () => ({ validateTwilioSignature: () => true, formatPhoneE164: (x: string) => x }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        id: 'bizSeq',
                        name: 'BizSeq',
                        call_forwarding_mode: 'forward_sequential',
                        call_forward_numbers: ['+15550000010', '+15550000011'],
                        call_ring_timeout: 20,
                        call_business_hours_only: false,
                        voicemail_greeting_url: null,
                        business_hours: null,
                        timezone: 'UTC',
                      },
                    }),
                  }),
                }),
              };
            }
            if (table === 'customers') {
              return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }) };
            }
            return { insert: async () => ({}) };
          },
        }),
      }));
      const route = require('@/app/api/webhooks/twilio/voice/route');
      const res: NextResponse = await route.POST(makeRequest({ From: '+15550000012', To: '+15551112222', CallSid: 'CASEQ' }));
      const body = await (res as any).text?.();
      expect(res.status).toBe(200);
      expect(body).toContain('<Dial');
      expect(body).toContain('<Number>+15550000010</Number>');
      expect(body).toContain('<Number>+15550000011</Number>');
    });
  });

  it('simultaneously forwards when mode is forward_simultaneous', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('@/lib/twilio', () => ({ validateTwilioSignature: () => true, formatPhoneE164: (x: string) => x }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        id: 'bizSim',
                        name: 'BizSim',
                        call_forwarding_mode: 'forward_simultaneous',
                        call_forward_numbers: ['+15550000021', '+15550000022'],
                        call_ring_timeout: 20,
                        call_business_hours_only: false,
                        voicemail_greeting_url: null,
                        business_hours: null,
                        timezone: 'UTC',
                      },
                    }),
                  }),
                }),
              };
            }
            if (table === 'customers') {
              return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }) };
            }
            return { insert: async () => ({}) };
          },
        }),
      }));
      const route = require('@/app/api/webhooks/twilio/voice/route');
      const res: NextResponse = await route.POST(makeRequest({ From: '+15550000023', To: '+15551112222', CallSid: 'CASIM' }));
      const body = await (res as any).text?.();
      expect(res.status).toBe(200);
      expect(body).toContain('<Dial');
      expect(body).toContain('<Number>+15550000021</Number>');
      expect(body).toContain('<Number>+15550000022</Number>');
    });
  });

  it('uses after-hours mode when outside business hours', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-01T12:00:00Z'));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        id: 'biz2',
                        name: 'Biz',
                        call_forwarding_mode: 'forward_owner',
                        call_forward_numbers: ['+15551234567'],
                        call_ring_timeout: 15,
                        call_business_hours_only: true,
                        call_after_hours_mode: 'voicemail',
                        voicemail_greeting_url: null,
                        business_hours: { mon: { start: '00:00', end: '00:01' } },
                        timezone: 'UTC',
                      },
                    }),
                  }),
                }),
              };
            }
            if (table === 'customers') {
              return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }) };
            }
            return { insert: async () => ({}) };
          },
        }),
      }));
      const route = require('@/app/api/webhooks/twilio/voice/route');
      const res: NextResponse = await route.POST(makeRequest({ From: '+15550000003', To: '+15551112222', CallSid: 'CA4' }));
      const body = await (res as any).text?.();
      expect(res.status).toBe(200);
      expect(body).toContain('<Record');
      jest.useRealTimers();
    });
  });

  it('keeps forwarding mode during business hours', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-01T12:00:00Z')); // Thu
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        id: 'bizBH',
                        name: 'BizBH',
                        call_forwarding_mode: 'forward_owner',
                        call_forward_numbers: ['+15559990000'],
                        call_ring_timeout: 10,
                        call_business_hours_only: true,
                        call_after_hours_mode: 'voicemail',
                        voicemail_greeting_url: null,
                        business_hours: { thu: { start: '11:00', end: '13:00' } },
                        timezone: 'UTC',
                      },
                    }),
                  }),
                }),
              };
            }
            if (table === 'customers') {
              return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }) };
            }
            return { insert: async () => ({}) };
          },
        }),
      }));
      const route = require('@/app/api/webhooks/twilio/voice/route');
      const res: NextResponse = await route.POST(makeRequest({ From: '+15550000004', To: '+15551112222', CallSid: 'CABH' }));
      const body = await (res as any).text?.();
      expect(res.status).toBe(200);
      expect(body).toContain('<Dial');
      expect(body).toContain('<Number>+15559990000</Number>');
      jest.useRealTimers();
    });
  });

  it('plays custom greeting when voicemail_greeting_url is set', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        id: 'bizVM',
                        name: 'BizVM',
                        call_forwarding_mode: 'voicemail',
                        call_forward_numbers: [],
                        call_ring_timeout: 15,
                        call_business_hours_only: false,
                        voicemail_greeting_url: 'https://example.com/greeting.mp3',
                        business_hours: null,
                        timezone: 'UTC',
                      },
                    }),
                  }),
                }),
              };
            }
            if (table === 'customers') {
              return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }) };
            }
            return { insert: async () => ({}) };
          },
        }),
      }));
      const route = require('@/app/api/webhooks/twilio/voice/route');
      const res: NextResponse = await route.POST(makeRequest({ From: '+15550000005', To: '+15551112222', CallSid: 'CAVM' }));
      const body = await (res as any).text?.();
      expect(res.status).toBe(200);
      expect(body).toContain('<Play>https://example.com/greeting.mp3</Play>');
    });
  });

  it('returns forward mode when business hours are undefined but only-hours flag set', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        id: 'bizNull',
                        name: 'BizNull',
                        call_forwarding_mode: 'forward_owner',
                        call_forward_numbers: ['+15556667777'],
                        call_ring_timeout: 10,
                        call_business_hours_only: true,
                        call_after_hours_mode: 'voicemail',
                        voicemail_greeting_url: null,
                        business_hours: null,
                        timezone: 'UTC',
                      },
                    }),
                  }),
                }),
              };
            }
            if (table === 'customers') {
              return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }) };
            }
            return { insert: async () => ({}) };
          },
        }),
      }));
      const route = require('@/app/api/webhooks/twilio/voice/route');
      const res: NextResponse = await route.POST(makeRequest({ From: '+15550000007', To: '+15551112222', CallSid: 'CANull' }));
      const body = await (res as any).text?.();
      expect(res.status).toBe(200);
      expect(body).toContain('<Dial');
      expect(body).toContain('<Number>+15556667777</Number>');
    });
  });

  it('returns error TwiML when request parsing throws', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      const faultyReq = {
        url: 'https://example.com/api/webhooks/twilio/voice',
        async formData() {
          throw new Error('bad form');
        },
      } as any;
      const route = require('@/app/api/webhooks/twilio/voice/route');
      const res: NextResponse = await route.POST(faultyReq);
      const body = await (res as any).text?.();
      expect(res.status).toBe(200);
      expect(body).toContain('<Record');
    });
  });
});
