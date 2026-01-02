import { describe, it, expect, jest } from '@jest/globals';

function makeRequest(path: string, ip = '203.0.113.1') {
  const headerMap: Record<string, string> = { 'x-forwarded-for': ip };
  return {
    method: 'GET',
    nextUrl: new URL(`http://localhost${path}`),
    headers: {
      get(name: string) {
        return headerMap[name.toLowerCase()] || null;
      },
    },
    cookies: {
      get() {
        return undefined;
      },
      getAll() {
        return [];
      },
    },
  } as any;
}

describe('lib/api/handler: withAPIHandler integration', () => {
  it('returns 503 when environment not configured', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('next/server', () => {
        class NextResponseMock {
          status: number;
          headers: Map<string, string>;
          body: any;
          constructor(body?: any, init?: any) {
            this.body = body;
            this.status = init?.status || 200;
            this.headers = new Map(Object.entries(init?.headers || {}));
          }
          static json(data: any, init?: any) {
            return new NextResponseMock(JSON.stringify(data), init);
          }
        }
        return { NextResponse: NextResponseMock };
      });
      const { withAPIHandler } = require('@/lib/api/handler');
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const { NextResponse } = require('next/server');
      const handler = withAPIHandler(async () => NextResponse.json({ ok: true }));
      const res = await handler(makeRequest('/api/test'));
      expect(res.status).toBe(503);
      if (originalUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      if (originalKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
    });
  });

  it('applies rate limiting and returns 429 with Retry-After', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('next/server', () => {
        class NextResponseMock {
          status: number;
          headers: Map<string, string>;
          body: any;
          constructor(body?: any, init?: any) {
            this.body = body;
            this.status = init?.status || 200;
            this.headers = new Map(Object.entries(init?.headers || {}));
          }
          static json(data: any, init?: any) {
            return new NextResponseMock(JSON.stringify(data), init);
          }
        }
        return { NextResponse: NextResponseMock };
      });
      process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test';
      const { withAPIHandler } = require('@/lib/api/handler');
      const { NextResponse } = require('next/server');
      const handler = withAPIHandler(async () => NextResponse.json({ ok: true }), { rateLimit: { requests: 1, windowMs: 1000 } });
      const req = makeRequest('/api/limited', '198.51.100.1');
      const first = await handler(req);
      expect(first.status).toBe(200);
      const second = await handler(req);
      expect(second.status).toBe(429);
      expect(second.headers.get('Retry-After')).toBeTruthy();
    });
  });

  it('returns 401 when requireAuth is set and no user', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('next/server', () => {
        class NextResponseMock {
          status: number;
          headers: Map<string, string>;
          body: any;
          constructor(body?: any, init?: any) {
            this.body = body;
            this.status = init?.status || 200;
            this.headers = new Map(Object.entries(init?.headers || {}));
          }
          static json(data: any, init?: any) {
            return new NextResponseMock(JSON.stringify(data), init);
          }
        }
        return { NextResponse: NextResponseMock };
      });
      process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test';
      const { withAPIHandler } = require('@/lib/api/handler');
      const { NextResponse } = require('next/server');
      const handler = withAPIHandler(async () => NextResponse.json({ ok: true }), { requireAuth: true });
      const res = await handler(makeRequest('/api/protected'));
      expect(res.status).toBe(401);
    });
  });

  it('handles APIError thrown by handler', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('next/server', () => {
        class NextResponseMock {
          status: number;
          headers: Map<string, string>;
          body: any;
          constructor(body?: any, init?: any) {
            this.body = body;
            this.status = init?.status || 200;
            this.headers = new Map(Object.entries(init?.headers || {}));
          }
          static json(data: any, init?: any) {
            return new NextResponseMock(JSON.stringify(data), init);
          }
        }
        return { NextResponse: NextResponseMock };
      });
      process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test';
      const { withAPIHandler } = require('@/lib/api/handler');
      const { APIErrors } = require('@/lib/logging');
      const handler = withAPIHandler(async () => {
        throw APIErrors.forbidden('nope');
      });
      const res = await handler(makeRequest('/api/error'));
      expect(res.status).toBe(403);
    });
  });

  it('captures unexpected errors and returns 500', async () => {
    await jest.isolateModulesAsync(async () => {
      const sentryMock = { captureException: jest.fn() };
      jest.doMock('@sentry/nextjs', () => sentryMock);
      jest.doMock('next/server', () => {
        class NextResponseMock {
          status: number;
          headers: Map<string, string>;
          body: any;
          constructor(body?: any, init?: any) {
            this.body = body;
            this.status = init?.status || 200;
            this.headers = new Map(Object.entries(init?.headers || {}));
          }
          static json(data: any, init?: any) {
            return new NextResponseMock(JSON.stringify(data), init);
          }
        }
        return { NextResponse: NextResponseMock };
      });
      process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test';
      const { withAPIHandler } = require('@/lib/api/handler');
      const handler = withAPIHandler(async () => {
        throw new Error('boom');
      });
      const res = await handler(makeRequest('/api/unexpected'));
      expect(res.status).toBe(500);
      expect(sentryMock.captureException).toHaveBeenCalled();
    });
  });

  it('handles non-Error throws and reports to Sentry', async () => {
    await jest.isolateModulesAsync(async () => {
      const sentryMock = { captureException: jest.fn() };
      jest.doMock('@sentry/nextjs', () => sentryMock);
      jest.doMock('next/server', () => {
        class NextResponseMock {
          status: number;
          headers: Map<string, string>;
          body: any;
          constructor(body?: any, init?: any) {
            this.body = body;
            this.status = init?.status || 200;
            this.headers = new Map(Object.entries(init?.headers || {}));
          }
          static json(data: any, init?: any) {
            return new NextResponseMock(JSON.stringify(data), init);
          }
        }
        return { NextResponse: NextResponseMock };
      });
      process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test';
      const { withAPIHandler } = require('@/lib/api/handler');
      const handler = withAPIHandler(async () => {
        throw 'string error';
      });
      const res = await handler(makeRequest('/api/unexpected-string'));
      expect(res.status).toBe(500);
      expect(sentryMock.captureException).toHaveBeenCalled();
    });
  });

  it('masks error message in production environment', async () => {
    await jest.isolateModulesAsync(async () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      jest.doMock('@sentry/nextjs', () => ({
        withScope: jest.fn((fn: any) => {
          const scope = { setContext: jest.fn(), setTag: jest.fn() };
          fn(scope);
        }),
        captureException: jest.fn(),
      }));
      jest.doMock('next/server', () => {
        class NextResponseMock {
          status: number;
          headers: Map<string, string>;
          body: any;
          constructor(body?: any, init?: any) {
            this.body = body;
            this.status = init?.status || 200;
            this.headers = new Map(Object.entries(init?.headers || {}));
          }
          static json(data: any, init?: any) {
            return new NextResponseMock(JSON.stringify(data), init);
          }
        }
        return { NextResponse: NextResponseMock };
      });
      process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test';
      const { withAPIHandler } = require('@/lib/api/handler');
      const handler = withAPIHandler(async () => {
        throw new Error('boom production');
      });
      const res = await handler(makeRequest('/api/prod-error'));
      expect(res.status).toBe(500);
      const body = JSON.parse(res.body);
      expect(body.error.message).toBe('An unexpected error occurred');
      process.env.NODE_ENV = prevEnv;
    });
  });
});
