import { describe, it, expect } from '@jest/globals';

describe('api/handler utilities', () => {
  it('getClientIp extracts x-forwarded-for and fallbacks', () => {
    const { getClientIp } = require('@/lib/api/handler');
    const req: any = {
      headers: {
        get: (k: string) => (k === 'x-forwarded-for' ? '1.2.3.4, 5.6.7.8' : null),
      },
      nextUrl: { pathname: '/x' },
      method: 'GET',
    };
    expect(getClientIp(req)).toBe('1.2.3.4');
    req.headers.get = (k: string) => (k === 'cf-connecting-ip' ? '9.9.9.9' : null);
    expect(getClientIp(req)).toBe('9.9.9.9');
    req.headers.get = (k: string) => (k === 'x-real-ip' ? '8.8.8.8' : null);
    expect(getClientIp(req)).toBe('8.8.8.8');
    req.headers.get = () => null;
    expect(getClientIp(req)).toBe('unknown');
  });

  it('checkEnvironment detects missing keys', () => {
    const { checkEnvironment } = require('@/lib/api/handler');
    const backup = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    };
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const res1 = checkEnvironment();
    expect(res1.configured).toBe(false);
    expect(res1.missing).toEqual(
      expect.arrayContaining(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'])
    );
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    const res2 = checkEnvironment();
    expect(res2.configured).toBe(true);
    process.env.NEXT_PUBLIC_SUPABASE_URL = backup.url as any;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = backup.key as any;
  });

  it('checkRateLimit returns error when exceeding', () => {
    const { checkRateLimit } = require('@/lib/api/handler');
    const req: any = {
      headers: { get: () => null },
      nextUrl: { pathname: '/api/test' },
      method: 'GET',
    };
    const options = { rateLimit: { requests: 1, windowMs: 1000 } };
    const r1 = checkRateLimit(req, options);
    expect(r1).toBeNull();
    const r2 = checkRateLimit(req, options);
    expect(r2).toBeTruthy();
    expect(r2.code).toBe('RATE_LIMITED');
  });

  it('checkRateLimit returns null when rateLimit option missing', () => {
    const { checkRateLimit } = require('@/lib/api/handler');
    const req: any = {
      headers: { get: () => null },
      nextUrl: { pathname: '/api/test' },
      method: 'GET',
    };
    const r = checkRateLimit(req);
    expect(r).toBeNull();
  });
});
