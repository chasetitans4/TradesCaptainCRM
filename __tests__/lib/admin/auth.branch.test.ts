import type { AdminUser } from '@/lib/admin/index';

const TEST_SECRET = '0123456789abcdefghijklmnopqrstuvwxyz!!';

jest.mock('next/headers', () => {
  let store: Record<string, { value: string }> = {};
  return {
    cookies: jest.fn(async () => ({
      get: (k: string) => store[k],
      setStore: (s: Record<string, { value: string }>) => { store = s; },
      clear: () => { store = {}; },
    })),
  };
});

jest.mock('@/lib/supabase/server', () => {
  const state: { admin: AdminUser | null; error: any } = {
    admin: {
      id: 'u1',
      email: 'x@example.com',
      full_name: 'X',
      role: 'admin',
      status: 'active',
      commission_rate: 10,
      two_factor_enabled: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    error: null,
  };
  return {
    createClient: jest.fn(async () => ({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: state.admin, error: state.error }),
      }),
    })),
    setMockAdmin: (admin: AdminUser | null) => { state.admin = admin; },
    setMockError: (err: any) => { state.error = err; },
  };
});


jest.mock('@/lib/admin/index', () => ({
  getAdminUser: jest.fn(async (id: string) => ({
    id,
    email: 'x@example.com',
    full_name: 'X',
    role: 'admin',
    status: 'active',
    commission_rate: 10,
    two_factor_enabled: false,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as AdminUser)),
}));

/** Helper: configure jwtVerify mock to succeed with the given payload */
function mockJwtSuccess(payload: Record<string, unknown> = { userId: 'u1' }) {
  const jose = require('jose');
  jose.jwtVerify.mockResolvedValueOnce({
    payload,
    protectedHeader: { alg: 'HS256' },
  });
}

describe('admin auth branch coverage', () => {
  beforeEach(async () => {
    process.env.JWT_SECRET = TEST_SECRET;
    delete process.env.JWT_ISSUER;
    delete process.env.JWT_AUDIENCE;
    const jose = require('jose');
    jose.jwtVerify.mockReset();
    jose.jwtVerify.mockRejectedValue(new Error('jwtVerify mock default'));
    const lib = require('@/lib/admin/index');
    lib.getAdminUser.mockReset();
    lib.getAdminUser.mockImplementation(async (id: string) => ({
      id,
      email: 'x@example.com',
      full_name: 'X',
      role: 'admin',
      status: 'active',
      commission_rate: 10,
      two_factor_enabled: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    const { cookies } = require('next/headers');
    const store = await cookies();
    store.clear();
    const server = require('@/lib/supabase/server');
    server.setMockError(null);
    server.setMockAdmin({
      id: 'u1',
      email: 'x@example.com',
      full_name: 'X',
      role: 'admin',
      status: 'active',
      commission_rate: 10,
      two_factor_enabled: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  it('verifyAdminAuth invalid when no token', async () => {
    const { verifyAdminAuth } = require('@/lib/admin/auth');
    const req = { headers: { get: (_: string) => null } } as any;
    const res = await verifyAdminAuth(req);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('No token provided');
  });

  it('verifyAdminAuth invalid when jwt invalid', async () => {
    const { verifyAdminAuth } = require('@/lib/admin/auth');
    const req = { headers: { get: (k: string) => (k === 'authorization' ? 'Bearer bad-token' : null) } } as any;
    const res = await verifyAdminAuth(req);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('Invalid or expired token');
  });

  it('verifyAdminAuth invalid when user not found', async () => {
    mockJwtSuccess({ userId: 'u1' });
    const { cookies } = require('next/headers');
    const store = await cookies();
    (store as any).setStore({ admin_token: { value: 'fake-jwt-token' } });
    const lib = require('@/lib/admin/index');
    lib.getAdminUser.mockResolvedValueOnce(null);
    const { verifyAdminAuth } = require('@/lib/admin/auth');
    const req = { headers: { get: () => null } } as any;
    const res = await verifyAdminAuth(req);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('Authentication failed');
  });

  it('verifyAdminAuth invalid when user inactive', async () => {
    mockJwtSuccess({ userId: 'u1' });
    const { cookies } = require('next/headers');
    const store = await cookies();
    (store as any).setStore({ admin_token: { value: 'fake-jwt-token' } });
    const lib = require('@/lib/admin/index');
    lib.getAdminUser.mockResolvedValueOnce({
      id: 'u1',
      email: 'x@example.com',
      full_name: 'X',
      role: 'admin',
      status: 'active',
      commission_rate: 10,
      two_factor_enabled: false,
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const { verifyAdminAuth } = require('@/lib/admin/auth');
    const req = { headers: { get: () => null } } as any;
    const res = await verifyAdminAuth(req);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('Authentication failed');
  });

  it('verifyAdminAuth valid when token and active user', async () => {
    mockJwtSuccess({ userId: 'u1' });
    const { cookies } = require('next/headers');
    const store = await cookies();
    (store as any).setStore({ admin_token: { value: 'fake-jwt-token' } });
    const { verifyAdminAuth } = require('@/lib/admin/auth');
    const req = { headers: { get: () => null } } as any;
    const res = await verifyAdminAuth(req);
    expect(res.valid).toBe(true);
    expect(res.user?.id).toBe('u1');
  });

  it('verifyAdminAuth valid with only issuer set', async () => {
    process.env.JWT_ISSUER = 'only-issuer';
    mockJwtSuccess({ userId: 'u1' });
    const { cookies } = require('next/headers');
    const store = await cookies();
    (store as any).setStore({ admin_token: { value: 'fake-jwt-token' } });
    const { verifyAdminAuth } = require('@/lib/admin/auth');
    const req = { headers: { get: () => null } } as any;
    const res = await verifyAdminAuth(req);
    expect(res.valid).toBe(true);
  });

  it('verifyAdminAuth valid with only audience set', async () => {
    process.env.JWT_AUDIENCE = 'only-audience';
    mockJwtSuccess({ userId: 'u1' });
    const { cookies } = require('next/headers');
    const store = await cookies();
    (store as any).setStore({ admin_token: { value: 'fake-jwt-token' } });
    const { verifyAdminAuth } = require('@/lib/admin/auth');
    const req = { headers: { get: () => null } } as any;
    const res = await verifyAdminAuth(req);
    expect(res.valid).toBe(true);
  });

  it('requireAdmin returns null when session missing', async () => {
    const { requireAdmin } = require('@/lib/admin/auth');
    const { cookies } = require('next/headers');
    const store = await cookies();
    store.clear();
    const res = await requireAdmin();
    expect(res).toBeNull();
  });

  it('requireAdmin returns null when only legacy admin_session present', async () => {
    const { requireAdmin } = require('@/lib/admin/auth');
    const { cookies } = require('next/headers');
    const expires = new Date(Date.now() + 3600000).toISOString();
    const session = Buffer.from(JSON.stringify({ adminId: 'u1', role: 'admin', expires })).toString('base64');
    const store = await cookies();
    (store as any).setStore({ admin_session: { value: session } });
    const res = await requireAdmin();
    expect(res).toBeNull();
  });

  it('requireAdmin role not allowed returns null', async () => {
    mockJwtSuccess({ userId: 'u1' });
    const { requireAdmin } = require('@/lib/admin/auth');
    const { cookies } = require('next/headers');
    const lib = require('@/lib/admin/index');
    lib.getAdminUser.mockResolvedValue({
      id: 'u1', email: 'x@example.com', full_name: 'X', role: 'agent',
      status: 'active', commission_rate: 10, two_factor_enabled: false,
      is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    const store = await cookies();
    (store as any).setStore({ admin_token: { value: 'fake-jwt-token' } });
    const res = await requireAdmin(['admin']);
    expect(res).toBeNull();
  });

  it('requireAgentOrHigher returns admin for agent role', async () => {
    mockJwtSuccess({ userId: 'u1' });
    const { requireAgentOrHigher } = require('@/lib/admin/auth');
    const { cookies } = require('next/headers');
    const lib = require('@/lib/admin/index');
    lib.getAdminUser.mockResolvedValue({
      id: 'u1', email: 'x@example.com', full_name: 'X', role: 'agent',
      status: 'active', commission_rate: 10, two_factor_enabled: false,
      is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    const store = await cookies();
    (store as any).setStore({ admin_token: { value: 'fake-jwt-token' } });
    const res = await requireAgentOrHigher();
    expect(res?.id).toBe('u1');
  });

  it('requireSuperAdmin returns admin for super_admin role', async () => {
    mockJwtSuccess({ userId: 'u1' });
    const { requireSuperAdmin } = require('@/lib/admin/auth');
    const { cookies } = require('next/headers');
    const lib = require('@/lib/admin/index');
    lib.getAdminUser.mockResolvedValue({
      id: 'u1', email: 'x@example.com', full_name: 'X', role: 'super_admin',
      status: 'active', commission_rate: 10, two_factor_enabled: false,
      is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    const store = await cookies();
    (store as any).setStore({ admin_token: { value: 'fake-jwt-token' } });
    const res = await requireSuperAdmin();
    expect(res?.id).toBe('u1');
  });

  it('verifyAdminAuth invalid when secret missing', async () => {
    const { cookies } = require('next/headers');
    const store = await cookies();
    (store as any).setStore({ admin_token: { value: 'cookie-token' } });
    delete process.env.JWT_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    const { verifyAdminAuth } = require('@/lib/admin/auth');
    const req = { headers: { get: () => null } } as any;
    const res = await verifyAdminAuth(req);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('Invalid or expired token');
  });

  it('verifyAdminAuth valid when issuer and audience set', async () => {
    process.env.JWT_ISSUER = 'crm';
    process.env.JWT_AUDIENCE = 'admin';
    mockJwtSuccess({ userId: 'u1' });
    const { cookies } = require('next/headers');
    const store = await cookies();
    (store as any).setStore({ admin_token: { value: 'fake-jwt-token' } });
    const { verifyAdminAuth } = require('@/lib/admin/auth');
    const req = { headers: { get: () => null } } as any;
    const res = await verifyAdminAuth(req);
    expect(res.valid).toBe(true);
  });

  it('verifyAdminAuth catch when getAdminUser throws', async () => {
    mockJwtSuccess({ userId: 'u1' });
    const { cookies } = require('next/headers');
    const store = await cookies();
    (store as any).setStore({ admin_token: { value: 'fake-jwt-token' } });
    const lib = require('@/lib/admin/index');
    lib.getAdminUser.mockImplementation(() => { throw new Error('db down'); });
    const { verifyAdminAuth } = require('@/lib/admin/auth');
    const req = { headers: { get: () => null } } as any;
    const res = await verifyAdminAuth(req);
    expect(res.valid).toBe(false);
    expect(typeof res.error).toBe('string');
  });
});
