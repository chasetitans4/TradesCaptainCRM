import { describe, it, expect, jest } from '@jest/globals';

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
  class NextRequest {
    url: string;
    private _body: any;
    constructor(url: string, body?: any) {
      this.url = url;
      this._body = body;
    }
    async json() {
      return this._body;
    }
  }
  jest.doMock('next/server', () => ({ NextResponse, NextRequest }));
}

describe('app/api/booking/requests route', () => {
  it('GET returns 401 when user not authenticated', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => ({
          auth: { getUser: async () => ({ data: { user: null } }) },
          from: jest.fn(),
        }),
      }));
      const { GET } = require('@/app/api/booking/requests/route');
      const req = new (require('next/server').NextRequest)('http://localhost/api/booking/requests');
      const res = await GET(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });
  });

  it('GET returns 404 when no business found for user', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => ({
          auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
          from: (_table: string) => ({
            select: () => ({
              eq: () => ({
                single: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        }),
      }));
      const { GET } = require('@/app/api/booking/requests/route');
      const req = new (require('next/server').NextRequest)('http://localhost/api/booking/requests');
      const res = await GET(req);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('No business found');
    });
  });

  it('GET returns 400 for invalid date range', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => ({
          auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
          from: (_table: string) => ({
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { business_id: 'b1' }, error: null }),
              }),
            }),
          }),
        }),
      }));
      const { GET } = require('@/app/api/booking/requests/route');
      const req = new (require('next/server').NextRequest)(
        'http://localhost/api/booking/requests?startDate=2026-01-10&endDate=2026-01-01'
      );
      const res = await GET(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(typeof body.error).toBe('object');
      const values = Object.values(body.error || {});
      expect(values.length > 0 && values.every((v) => Array.isArray(v))).toBe(true);
    });
  });

  it('GET returns results for valid query', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => ({
          auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
          from: (_table: string) => ({
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { business_id: 'b1' }, error: null }),
              }),
            }),
          }),
        }),
      }));
      jest.doMock('@/lib/booking/requests', () => ({
        getBookingRequests: jest.fn(async (_bizId: string, _opts: any) => ({ items: [], total: 0 })),
      }));
      const { GET } = require('@/app/api/booking/requests/route');
      const req = new (require('next/server').NextRequest)(
        'http://localhost/api/booking/requests?status=open&startDate=2026-01-01&endDate=2026-01-10'
      );
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.items).toBeDefined();
    });
  });

  it('POST returns 400 when neither businessId nor slug provided', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      const { NextRequest } = require('next/server');
      jest.doMock('@/lib/validation', () => {
        const { z } = require('zod');
        return {
          schemas: {
            email: z.string().email(),
            date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
          },
          validateRequest: (schema: any, data: any) => ({ success: true, data }),
          formatZodErrors: (err: any) => String(err),
          sanitizeEmail: (x: string) => x,
          sanitizePhone: (x: string) => x,
        };
      });
      const { POST } = require('@/app/api/booking/requests/route');
      const req = new NextRequest('http://localhost/api/booking/requests', {
        businessId: undefined,
        slug: undefined,
        customerName: 'x',
        customerEmail: 'a@b.com',
        customerPhone: '5551234567',
        serviceType: 'hvac',
        preferredDate: '2026-01-01',
        address: '123',
      } as any);
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  it('POST resolves businessId via slug and succeeds', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      const { NextRequest } = require('next/server');
      jest.doMock('@/lib/booking/settings', () => ({
        getBookingSettingsBySlug: jest.fn(async (_slug: string) => ({ settings: { businessId: 'b1' } })),
      }));
      jest.doMock('@/lib/validation', () => {
        const { z } = require('zod');
        return {
          schemas: {
            email: z.string().email(),
            date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
          },
          validateRequest: (_schema: any, data: any) => ({ success: true, data }),
          formatZodErrors: (err: any) => String(err),
          sanitizeEmail: (x: string) => x,
          sanitizePhone: (x: string) => x,
        };
      });
      jest.doMock('@/lib/twilio/sms', () => ({
        formatPhoneE164: (x: string) => '+1' + x.replace(/\D/g, ''),
      }));
      jest.doMock('@/lib/booking/requests', () => ({
        createBookingRequest: jest.fn(async (_bizId: string, _input: any) => ({ success: true, requestId: 'r1' })),
      }));
      const { POST } = require('@/app/api/booking/requests/route');
      const req = new NextRequest('http://localhost/api/booking/requests', {
        slug: 'ac-repair',
        customerName: 'John',
        customerEmail: 'john@example.com',
        customerPhone: '(555) 123-4567',
        serviceType: 'hvac',
        preferredDate: '2026-01-01',
        address: '123 Main',
      } as any);
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.requestId).toBe('r1');
    });
  });

  it('POST returns 400 when validation fails', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      const { NextRequest } = require('next/server');
      jest.doMock('@/lib/validation', () => {
        const { z } = require('zod');
        return {
          schemas: {
            email: z.string().email(),
            date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
          },
          validateRequest: (_schema: any, _data: any) => ({ success: false, errors: ['bad'] }),
          formatZodErrors: (errs: any) => String(errs),
          sanitizeEmail: (x: string) => x,
          sanitizePhone: (x: string) => x,
        };
      });
      const { POST } = require('@/app/api/booking/requests/route');
      const req = new NextRequest('http://localhost/api/booking/requests', {
        businessId: 'b1',
        customerName: '',
        customerEmail: 'bad',
        customerPhone: 'x',
        serviceType: '',
        preferredDate: 'not a date',
        address: '',
      } as any);
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(typeof body.error).toBe('string');
    });
  });

  it('POST returns 400 when sanitizeEmail/Phone fail', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      const { NextRequest } = require('next/server');
      jest.doMock('@/lib/validation', () => {
        const { z } = require('zod');
        return {
          schemas: {
            email: z.string().email(),
            date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
          },
          validateRequest: (_schema: any, data: any) => ({ success: true, data }),
          formatZodErrors: (errs: any) => String(errs),
          sanitizeEmail: (_x: string) => '',
          sanitizePhone: (_x: string) => '',
        };
      });
      jest.doMock('@/lib/twilio/sms', () => ({ formatPhoneE164: (x: string) => x }));
      const { POST } = require('@/app/api/booking/requests/route');
      const req = new NextRequest('http://localhost/api/booking/requests', {
        businessId: 'b1',
        customerName: 'Jane',
        customerEmail: 'jane@example.com',
        customerPhone: '555-000-0000',
        serviceType: 'hvac',
        preferredDate: '2026-01-01',
        address: '123',
      } as any);
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  it('POST returns 400 when createBookingRequest fails', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      const { NextRequest } = require('next/server');
      jest.doMock('@/lib/validation', () => {
        const { z } = require('zod');
        return {
          schemas: {
            email: z.string().email(),
            date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
          },
          validateRequest: (_schema: any, data: any) => ({ success: true, data }),
          formatZodErrors: (err: any) => String(err),
          sanitizeEmail: (x: string) => x,
          sanitizePhone: (x: string) => x,
        };
      });
      jest.doMock('@/lib/twilio/sms', () => ({
        formatPhoneE164: (x: string) => '+1' + x.replace(/\D/g, ''),
      }));
      jest.doMock('@/lib/booking/requests', () => ({
        createBookingRequest: jest.fn(async () => ({ success: false, error: 'db error' })),
      }));
      const { POST } = require('@/app/api/booking/requests/route');
      const req = new NextRequest('http://localhost/api/booking/requests', {
        businessId: 'b1',
        customerName: 'Sam',
        customerEmail: 'sam@example.com',
        customerPhone: '555-222-3333',
        serviceType: 'hvac',
        preferredDate: '2026-01-01',
        address: '123',
      } as any);
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('db error');
    });
  });
});
