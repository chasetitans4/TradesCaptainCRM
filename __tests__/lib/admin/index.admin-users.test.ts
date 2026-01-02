import * as Admin from '@/lib/admin';
import crypto from 'crypto';

jest.mock('@/lib/supabase/server', () => {
  const state: any = {
    filters: {},
    lastUpdate: null,
  };
  const users = [
    { id: 'u1', email: 'admin@example.com', name: 'Alice Admin', role: 'admin', is_active: true, created_at: new Date().toISOString() },
    { id: 'u2', email: 'agent@example.com', name: 'Bob Agent', role: 'agent', is_active: true, created_at: new Date().toISOString() },
    { id: 'u3', email: 'inactive@example.com', name: 'Cathy Inactive', role: 'support', is_active: false, created_at: new Date().toISOString() },
  ];
  function matchFilters(user: any) {
    const f = state.filters;
    if (f.id && user.id !== f.id) return false;
    if (typeof f.is_active === 'boolean' && user.is_active !== f.is_active) return false;
    if (f.email && user.email !== f.email) return false;
    return true;
  }
  return {
    createClient: jest.fn(() => ({
      from: (table: string) => {
        if (table !== 'admin_users') return {} as any;
        return {
          select: () => {
            state.filters = {};
            return {
            eq: (col: string, val: any) => {
              state.filters[col] = val;
              return {
                eq: (col2: string, val2: any) => {
                  state.filters[col2] = val2;
                  return {
                    single: () => {
                      const found = users.find(matchFilters);
                      if (!found) return { data: null, error: { message: 'not found' } };
                      return { data: found, error: null };
                    },
                  };
                },
              };
            },
            order: () => ({ data: users.filter((u) => u.is_active), error: null }),
            };
          },
          order: () => ({ select: () => ({ data: users.filter((u) => u.is_active), error: null }) }),
          insert: (row: any) => ({
            select: () => ({
              single: () => ({
                data: {
                  id: 'new-id',
                  email: row.email,
                  name: row.name,
                  role: row.role,
                  is_active: row.is_active,
                  password_hash: row.password_hash,
                  created_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          }),
          update: (vals: any) => {
            state.lastUpdate = vals;
            return {
              eq: (col: string, val: any) => ({ data: { id: val, ...vals }, error: null }),
            };
          },
        } as any;
      },
    })),
    __state: state,
  };
});

describe('admin index: admin users', () => {
  it('gets admin user by id when active', async () => {
    const user = await Admin.getAdminUser('u1');
    expect(user?.email).toBe('admin@example.com');
    expect(user?.is_active).toBe(true);
  });

  it('returns null for missing or inactive user', async () => {
    const missing = await Admin.getAdminUser('missing');
    expect(missing).toBeNull();
    const inactive = await Admin.getAdminUser('u3');
    expect(inactive).toBeNull();
  });

  it('gets admin by email with lowercasing', async () => {
    const user = await Admin.getAdminByEmail('ADMIN@EXAMPLE.COM');
    expect(user?.id).toBe('u1');
  });

  it('lists active admin users', async () => {
    const users = await Admin.getAdminUsers();
    expect(users.length).toBe(2);
    expect(users.some((u) => u.email === 'inactive@example.com')).toBe(false);
  });

  it('creates admin user with hashed password and lowercased email', async () => {
    const input = { email: 'New@Example.com', name: 'New User', role: 'agent', password: 'secret' } as any;
    const created = (await Admin.createAdminUser(input)) as any;
    const expectedHash = crypto.createHash('sha256').update('secret').digest('hex');
    expect(created.id).toBe('new-id');
    expect(created.email).toBe('new@example.com');
    expect(created.role).toBe('agent');
    expect(created.is_active).toBe(true);
    expect(created.password_hash).toBe(expectedHash);
  });

  it('updates last login timestamp', async () => {
    await Admin.updateAdminLastLogin('u1');
    const supabase = require('@/lib/supabase/server');
    expect(supabase.__state.lastUpdate.last_login_at).toMatch(/T/);
  });
});

