import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

describe('api/handler withAPIHandler', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('next/server', () => {
      class NextResponse {
        status: number;
        body: any;
        constructor(body?: any, init?: any) {
          this.status = (init && init.status) || 200;
          this.body = body;
        }
        static json(data: any, init?: any) {
          return new NextResponse(data, init);
        }
      }
      return { NextResponse };
    });
    jest.doMock('@sentry/nextjs', () => ({
      captureException: jest.fn(),
    }));
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it('returns 429 when rate limit exceeded', async () => {
    const { withAPIHandler } = require('@/lib/api/handler');
    const handler = withAPIHandler(async (_req: any) => {
      return (require('next/server') as any).NextResponse.json({ ok: true });
    }, { rateLimit: { requests: 1, windowMs: 1000 } });

    const req: any = {
      headers: { get: () => null },
      nextUrl: { pathname: '/api/test' },
      method: 'GET',
      cookies: { get: () => null, getAll: () => [] },
    };

    const r1 = await handler(req);
    expect(r1.status).toBe(200);
    const r2 = await handler(req);
    expect(r2.status).toBe(429);
  });

  it('returns 503 when environment not configured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const { withAPIHandler } = require('@/lib/api/handler');
    const handler = withAPIHandler(async (_req: any) => {
      return (require('next/server') as any).NextResponse.json({ ok: true });
    });
    const req: any = {
      headers: { get: () => null },
      nextUrl: { pathname: '/api/test' },
      method: 'GET',
      cookies: { get: () => null, getAll: () => [] },
    };
    const res = await handler(req);
    expect(res.status).toBe(503);
  });

  it('returns 401 when auth required and no user', async () => {
    const { withAPIHandler } = require('@/lib/api/handler');
    const handler = withAPIHandler(async (_req: any) => {
      return (require('next/server') as any).NextResponse.json({ ok: true });
    }, { requireAuth: true });
    const req: any = {
      headers: { get: () => null },
      nextUrl: { pathname: '/api/protected' },
      method: 'GET',
      cookies: { get: () => null, getAll: () => [] },
    };
    const res = await handler(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 when admin required and user lacks role', async () => {
    const { withAPIHandler } = require('@/lib/api/handler');
    const handler = withAPIHandler(async (_req: any) => {
      return (require('next/server') as any).NextResponse.json({ ok: true });
    }, { requireAuth: true, requireAdmin: true });
    const adminSession = Buffer.from(JSON.stringify({
      adminId: 'a1',
      role: 'user',
      expires: new Date(Date.now() + 60_000).toISOString(),
    })).toString('base64');
    const req: any = {
      headers: { get: () => null },
      nextUrl: { pathname: '/api/admin' },
      method: 'GET',
      cookies: {
        get: (name: string) => name === 'admin_session' ? { value: adminSession } : undefined,
        getAll: () => [],
      },
    };
    const res = await handler(req);
    expect(res.status).toBe(403);
  });
});

