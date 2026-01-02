import { describe, it, expect, jest } from '@jest/globals';

describe('supabase/server', () => {
  beforeAll(() => {
    jest.resetModules();
    jest.doMock('@supabase/ssr', () => ({
      createServerClient: jest.fn().mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
      createBrowserClient: jest.fn(),
    }));
    jest.doMock('next/headers', () => ({
      cookies: async () => ({
        getAll: () => [],
        set: () => {},
      }),
    }));
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  });

  it('createServerSupabaseClient returns a client', async () => {
    const { createServerSupabaseClient } = require('@/lib/supabase/server');
    const client = await createServerSupabaseClient();
    expect(typeof client).toBe('object');
    expect(client.auth).toBeTruthy();
  });

  it('getServerUser returns null when no user', async () => {
    const { getServerUser } = require('@/lib/supabase/server');
    const user = await getServerUser();
    expect(user).toBeNull();
  });

  it('createAdminClient returns a client object', () => {
    const { createAdminClient } = require('@/lib/supabase/server');
    const client = createAdminClient();
    expect(typeof client).toBe('object');
  });
});

