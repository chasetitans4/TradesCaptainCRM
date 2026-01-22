import { describe, it, expect, jest } from '@jest/globals';

function makeSupabase() {
  return {
    from: (table: string) => {
      if (table === 'customers') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { name: 'John Doe', email: 'john@example.com' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'businesses') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { name: 'Test Biz' }, error: null }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) };
    },
  };
}

describe('lib/portal/session environment validation', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.PORTAL_SESSION_SECRET;
  });

  it('creates a portal session with a valid secret (>=32 chars)', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.PORTAL_SESSION_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      jest.doMock('jose', () => {
        return {
          SignJWT: class MockSignJWT {
            setProtectedHeader() { return this; }
            setIssuedAt() { return this; }
            setExpirationTime() { return this; }
            async sign() { return 'mock-token'; }
          },
          jwtVerify: jest.fn(async () => ({ payload: {} })),
        };
      });
      jest.doMock('next/headers', () => ({
        cookies: async () => ({ set: jest.fn(), get: jest.fn(() => ({ value: undefined })) }),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => makeSupabase(),
        createAdminClient: () => makeSupabase()
      }));
      const { createPortalSession } = require('@/lib/portal/session');
      const token = await createPortalSession('c1', 'a1', 'b1');
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(10);
    });
  });

  it('throws when PORTAL_SESSION_SECRET is too short', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.PORTAL_SESSION_SECRET = 'short-secret';
      jest.doMock('jose', () => {
        return {
          SignJWT: class MockSignJWT {
            setProtectedHeader() { return this; }
            setIssuedAt() { return this; }
            setExpirationTime() { return this; }
            async sign() { return 'mock-token'; }
          },
          jwtVerify: jest.fn(async () => ({ payload: {} })),
        };
      });
      jest.doMock('next/headers', () => ({
        cookies: async () => ({ set: jest.fn(), get: jest.fn(() => ({ value: undefined })) }),
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => makeSupabase(),
        createAdminClient: () => makeSupabase()
      }));
      const { createPortalSession } = require('@/lib/portal/session');
      await expect(createPortalSession('c1', 'a1', 'b1')).rejects.toThrow('PORTAL_SESSION_SECRET must be at least 32 characters');
    });
  });
});
