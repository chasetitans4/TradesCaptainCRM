import { requireAdmin, requireSuperAdmin, requireAdminOrHigher, requireAgentOrHigher } from '@/lib/admin/auth';

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

jest.mock('@/lib/admin/index', () => ({
  getAdminUser: jest.fn(),
}));

/** Helper: configure jwtVerify mock to succeed with the given payload */
function mockJwtSuccess(payload: Record<string, unknown> = { userId: 'u1' }) {
  const jose = require('jose');
  jose.jwtVerify.mockResolvedValueOnce({
    payload,
    protectedHeader: { alg: 'HS256' },
  });
}

describe('admin auth helpers: role-based JWT auth', () => {
  beforeEach(async () => {
    process.env.JWT_SECRET = TEST_SECRET;
    const jose = require('jose');
    jose.jwtVerify.mockReset();
    jose.jwtVerify.mockRejectedValue(new Error('jwtVerify mock default'));
    const { cookies } = require('next/headers');
    const store = await cookies();
    store.clear();
    const { getAdminUser } = require('@/lib/admin/index');
    getAdminUser.mockReset();
  });

  it('requireAdmin returns null when no admin_token cookie', async () => {
    const admin = await requireAdmin();
    expect(admin).toBeNull();
  });

  it('requireAdmin returns null when JWT is invalid', async () => {
    const { cookies } = require('next/headers');
    const store = await cookies();
    (store as any).setStore({ admin_token: { value: 'invalid-token' } });
    const res = await requireAdmin();
    expect(res).toBeNull();
  });

  it('requireAdmin returns admin when valid JWT', async () => {
    mockJwtSuccess({ userId: 'a2' });
    const { cookies } = require('next/headers');
    const store = await cookies();
    (store as any).setStore({ admin_token: { value: 'valid-token' } });
    const { getAdminUser } = require('@/lib/admin/index');
    getAdminUser.mockResolvedValue({ id: 'a2', is_active: true, role: 'admin' });
    const res = await requireAdmin();
    expect(res).toBeTruthy();
    expect(res.id).toBe('a2');
  });

  it('requireAdmin enforces allowed roles', async () => {
    // Need multiple jwtVerify successes since each requireAdmin/requireXxx call verifies independently
    const jose = require('jose');
    jose.jwtVerify.mockResolvedValue({
      payload: { userId: 'a3' },
      protectedHeader: { alg: 'HS256' },
    });
    const { cookies } = require('next/headers');
    const store = await cookies();
    (store as any).setStore({ admin_token: { value: 'valid-token' } });
    const { getAdminUser } = require('@/lib/admin/index');
    getAdminUser.mockResolvedValue({ id: 'a3', is_active: true, role: 'agent' });

    expect(await requireAdmin(['admin'])).toBeNull();
    expect(await requireAgentOrHigher()).toBeTruthy();
    expect(await requireAdminOrHigher()).toBeNull();
    expect(await requireSuperAdmin()).toBeNull();
  });
});
