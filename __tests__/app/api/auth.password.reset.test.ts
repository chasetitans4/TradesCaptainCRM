jest.mock('next/server', () => {
  class NextResponse {
    status: number;
    body: any;
    headers: Record<string, string>;
    constructor(body?: any, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = init?.headers || {};
    }
    static json(obj: any, init?: { status?: number; headers?: Record<string, string> }) {
      return { status: init?.status || 200, body: obj, headers: init?.headers || {} };
    }
  }
  return { NextResponse };
});

jest.mock('@/lib/rate-limit', () => ({
  checkPasswordResetRateLimit: jest.fn(async () => ({
    allowed: true,
    remaining: 2,
    resetAt: new Date(Date.now() + 3600 * 1000),
    retryAfter: 0,
  })),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: {
      resetPasswordForEmail: jest.fn(async () => ({ data: null, error: null })),
    },
  })),
}));

jest.mock('@/lib/logger', () => ({
  logApiError: jest.fn(),
}));

import { POST } from '@/app/api/auth/password/reset/route';

describe('POST /api/auth/password/reset', () => {
  it('returns 400 when email missing', async () => {
    const req: any = { json: async () => ({}) };
    const res: any = await POST(req);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Email is required');
  });

  it('returns 400 for invalid email', async () => {
    const req: any = { json: async () => ({ email: 'bad-email' }) };
    const res: any = await POST(req);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid email format');
  });

  it('returns 429 when rate limited', async () => {
    const rateLimit = require('@/lib/rate-limit');
    rateLimit.checkPasswordResetRateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetAt: new Date(Date.now() + 3600 * 1000),
      retryAfter: 3600,
    });
    const req: any = { json: async () => ({ email: 'user@example.com' }) };
    const res: any = await POST(req);
    expect(res.status).toBe(429);
    expect(res.body.error).toContain('Too many password reset requests');
    expect(res.headers['X-RateLimit-Limit']).toBe('3');
  });

  it('returns success for valid request and logs supabase error', async () => {
    const server = require('@/lib/supabase/server');
    server.createClient.mockResolvedValueOnce({
      auth: {
        resetPasswordForEmail: jest.fn(async () => ({
          data: null,
          error: new Error('Test Supabase error'),
        })),
      },
    });
    const req: any = { json: async () => ({ email: 'User@Example.com ' }) };
    const res: any = await POST(req);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('If an account with that email exists');
  });
});
