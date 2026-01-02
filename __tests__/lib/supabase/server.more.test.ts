import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const state: any = {};

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    getAll: () => [],
    set: () => {},
  })),
}));

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn((_url: string, _key: string, _opts: any) => ({
    auth: {
      getUser: jest.fn(async () => ({
        data: { user: state.user || null },
        error: state.userError || null,
      })),
    },
    from: (_table: string) => {
      const api: any = {};
      api.select = () => api;
      api.eq = () => api;
      api.single = async () => ({
        data: state.profile || null,
        error: state.profileError || null,
      });
      return api;
    },
  })),
}));

describe('supabase/server helpers', () => {
  beforeEach(() => {
    for (const k of Object.keys(state)) delete state[k];
    jest.resetModules();
  });

  it('getServerUser returns null on error or missing user', async () => {
    const mod = require('@/lib/supabase/server');
    state.userError = new Error('bad');
    const u1 = await mod.getServerUser();
    expect(u1).toBeNull();
    delete state.userError;
    state.user = null;
    const u2 = await mod.getServerUser();
    expect(u2).toBeNull();
  });

  it('getServerUser returns user when available', async () => {
    const mod = require('@/lib/supabase/server');
    state.user = { id: 'u1' };
    const u = await mod.getServerUser();
    expect(u?.id).toBe('u1');
  });

  it('getServerUserProfile returns null when no user or on error', async () => {
    const mod = require('@/lib/supabase/server');
    state.user = null;
    const p1 = await mod.getServerUserProfile();
    expect(p1).toBeNull();
    state.user = { id: 'u2' };
    state.profileError = new Error('db');
    const p2 = await mod.getServerUserProfile();
    expect(p2).toBeNull();
  });

  it('getServerUserProfile returns profile when found', async () => {
    const mod = require('@/lib/supabase/server');
    state.user = { id: 'u3' };
    state.profile = { id: 'p1', role: 'agent', business: { plan_tier: 'pro' } };
    const p = await mod.getServerUserProfile();
    expect(p?.id).toBe('p1');
  });

  it('canAccessCRM checks plan_tier', async () => {
    const mod = require('@/lib/supabase/server');
    state.user = { id: 'u4' };
    state.profile = { id: 'p2', role: 'agent', business: { plan_tier: 'basic' } };
    const a1 = await mod.canAccessCRM();
    expect(a1).toBe(false);
    state.profile = { id: 'p2', role: 'agent', business: { plan_tier: 'pro' } };
    const a2 = await mod.canAccessCRM();
    expect(a2).toBe(true);
  });

  it('hasRole returns false without profile and true with matching role', async () => {
    const mod = require('@/lib/supabase/server');
    state.user = { id: 'u5' };
    state.profile = null;
    const h1 = await mod.hasRole('admin');
    expect(h1).toBe(false);
    state.profile = { role: 'manager', business: { plan_tier: 'pro' } };
    const h2 = await mod.hasRole(['agent', 'manager']);
    expect(h2).toBe(true);
  });

  it('createServerSupabaseClient setAll uses catch path when cookieStore.set throws', async () => {
    jest.resetModules();
    jest.doMock('next/headers', () => ({
      cookies: jest.fn(async () => ({
        getAll: () => [],
        set: () => {
          throw new Error('not allowed in server component');
        },
      })),
    }));
    const createServerClientSpy = jest.fn((_url: string, _key: string, opts: any) => {
      // Exercise setAll catch branch
      opts.cookies.setAll([{ name: 'session', value: 'x' }]);
      return {
        auth: {
          getUser: jest.fn(async () => ({ data: { user: null }, error: null })),
        },
        from: () => ({} as any),
      };
    });
    jest.doMock('@supabase/ssr', () => ({
      createServerClient: createServerClientSpy,
    }));
    const mod = require('@/lib/supabase/server');
    const client = await mod.createServerSupabaseClient();
    expect(typeof client).toBe('object');
    expect(createServerClientSpy).toHaveBeenCalled();
  });
});
