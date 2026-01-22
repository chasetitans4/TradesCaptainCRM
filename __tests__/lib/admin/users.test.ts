import { getAdminUser, getAdminByEmail, getAdminUsers, createAdminUser, updateAdminLastLogin } from '@/lib/admin/users';

jest.mock('@/lib/supabase/server', () => {
  const state: any = { rows: [], lastInsert: null, updateCalls: 0 };
  const makeChain = () => {
    const q: any = { filters: [] as any[] };
    const api: any = {
      eq: (col: string, val: any) => { q.filters.push({ col, val }); return api; },
      single: () => {
        let rows = state.rows.slice();
        for (const f of q.filters) {
          rows = rows.filter((r: any) => r[f.col] === (f.col === 'email' ? String(f.val).toLowerCase() : f.val));
        }
        return { data: rows[0] || null, error: null };
      },
      order: () => ({ data: state.rows.slice(), error: null }),
    };
    return api;
  };
  const usersTable = {
    select: () => makeChain(),
    insert: (payload: any) => {
      state.lastInsert = payload;
      const record = { id: 'u1', ...payload };
      state.rows.push(record);
      return {
        select: () => ({ single: () => ({ data: record, error: null }) }),
      };
    },
    update: (_updates: any) => ({
      eq: () => {
        state.updateCalls += 1;
        return {};
      },
    }),
  };
  const buildClient = () => ({
    from: (table: string) => {
      if (table === 'admin_users') return usersTable as any;
      return {} as any;
    },
  });
  return {
    createClient: jest.fn(async () => buildClient()),
    createAdminClient: jest.fn(() => buildClient()),
    __state: state,
  };
});

describe('admin users: fetch and create', () => {
  beforeEach(() => {
    const supabase = require('@/lib/supabase/server');
    supabase.__state.rows = [
      { id: 'a1', email: 'test@example.com', full_name: 'T', status: 'active' },
    ];
    supabase.__state.lastInsert = null;
    supabase.__state.updateCalls = 0;
  });

  it('gets admin user by id or null on error', async () => {
    const one = await getAdminUser('a1');
    expect(one?.id).toBe('a1');
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createClient;
    supabase.createClient = jest.fn(async () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({ single: () => ({ data: null, error: { message: 'x' } }) }),
          }),
        }),
      }),
    }));
    const none = await getAdminUser('missing');
    expect(none).toBeNull();
    supabase.createClient = original;
  });

  it('gets admin by email lowercases', async () => {
    const one = await getAdminByEmail('TEST@example.com');
    expect(one?.email).toBe('test@example.com');
  });

  it('returns null when getAdminByEmail encounters error', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createClient;
    supabase.createClient = jest.fn(async () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({ single: () => ({ data: null, error: { message: 'x' } }) }),
          }),
        }),
      }),
    }));
    const none = await getAdminByEmail('missing@example.com');
    expect(none).toBeNull();
    supabase.createClient = original;
  });

  it('lists admin users and throws on error', async () => {
    const list = await getAdminUsers();
    expect(list.length).toBeGreaterThan(0);
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createClient;
    supabase.createClient = jest.fn(async () => ({
      from: () => ({
        select: () => ({ order: () => ({ data: null, error: { message: 'bad' } }) }),
      }),
    }));
    await expect(getAdminUsers()).rejects.toBeTruthy();
    supabase.createClient = original;
  });

  it('creates admin user hashes password and lowercases email', async () => {
    const supabase = require('@/lib/supabase/server');
    const created = await createAdminUser({ email: 'New@EXAMPLE.com', name: 'N', role: 'agent', password: 'pw' } as any);
    expect(created.email).toBe('new@example.com');
    expect(supabase.__state.lastInsert.password_hash).toBeDefined();
    expect(typeof supabase.__state.lastInsert.password_hash).toBe('string');
  });

  it('throws when createAdminUser insert returns error', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createClient;
    supabase.createClient = jest.fn(async () => ({
      from: (table: string) => ({
        insert: () => ({
          select: () => ({
            single: () => ({ data: null, error: { message: 'bad insert' } }),
          }),
        }),
        select: () => ({ single: () => ({ data: null, error: null }) }),
      }),
    }));
    await expect(createAdminUser({ email: 'e@x.com', name: 'E', role: 'agent', password: 'pw' } as any)).rejects.toBeTruthy();
    supabase.createClient = original;
  });

  it('updates last login for admin', async () => {
    const supabase = require('@/lib/supabase/server');
    await updateAdminLastLogin('a1');
    expect(supabase.__state.updateCalls).toBeGreaterThan(0);
  });
});
