import * as Admin from '@/lib/admin';

jest.mock('@/lib/supabase/server', () => {
  const state: any = {
    filters: {},
    lastUpdate: null,
  };
  // Use 'status' field to match actual implementation (not 'is_active')
  const users = [
    { id: 'u1', email: 'admin@example.com', full_name: 'Alice Admin', role: 'admin', status: 'active', created_at: new Date().toISOString() },
    { id: 'u2', email: 'agent@example.com', full_name: 'Bob Agent', role: 'agent', status: 'active', created_at: new Date().toISOString() },
    { id: 'u3', email: 'inactive@example.com', full_name: 'Cathy Inactive', role: 'support', status: 'inactive', created_at: new Date().toISOString() },
  ];
  function matchFilters(user: any) {
    const f = state.filters;
    if (f.id && user.id !== f.id) return false;
    if (f.status && user.status !== f.status) return false;
    if (f.email && user.email !== f.email) return false;
    return true;
  }
  const buildClient = () => ({
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
          order: () => ({ data: users.filter((u) => u.status === 'active'), error: null }),
          };
        },
        order: () => ({ select: () => ({ data: users.filter((u) => u.status === 'active'), error: null }) }),
        insert: (row: any) => ({
          select: () => ({
            single: () => ({
              data: {
                id: 'new-id',
                email: row.email,
                full_name: row.full_name,
                role: row.role,
                status: row.status,
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
  });
  return {
    createClient: jest.fn(async () => buildClient()),
    createAdminClient: jest.fn(() => buildClient()),
    __state: state,
  };
});

describe('admin index: admin users', () => {
  it('lists active admin users', async () => {
    const users = await Admin.getAdminUsers();
    expect(users.length).toBe(2);
    expect(users.some((u: any) => u.email === 'inactive@example.com')).toBe(false);
  });

  it('creates admin user with lowercased email', async () => {
    const input = { email: 'New@Example.com', name: 'New User', role: 'agent', password: 'secret' } as any;
    const created = (await Admin.createAdminUser(input)) as any;
    expect(created.id).toBe('new-id');
    expect(created.email).toBe('new@example.com');
    expect(created.role).toBe('agent');
  });

  it('updates last login timestamp', async () => {
    await Admin.updateAdminLastLogin('u1');
    const supabase = require('@/lib/supabase/server');
    expect(supabase.__state.lastUpdate.last_login_at).toMatch(/T/);
  });
});

