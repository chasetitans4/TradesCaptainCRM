import { requireAdmin, requireSuperAdmin, requireAdminOrHigher, requireAgentOrHigher } from '@/lib/admin/auth';

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    get: (_name: string) => undefined,
  })),
}));

jest.mock('@/lib/admin/index', () => ({
  getAdminUser: jest.fn(),
}));

function makeSessionCookie(payload: any) {
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

describe('admin auth helpers: role-based session', () => {
  beforeEach(() => {
    const { cookies } = require('next/headers');
    cookies.mockResolvedValue({ get: () => undefined });
    const { getAdminUser } = require('@/lib/admin/index');
    getAdminUser.mockReset();
  });

  it('requireAdmin returns null when no session cookie', async () => {
    const admin = await requireAdmin();
    expect(admin).toBeNull();
  });

  it('requireAdmin returns null when expired', async () => {
    const { cookies } = require('next/headers');
    const expired = new Date(Date.now() - 1000).toISOString();
    cookies.mockResolvedValue({
      get: (name: string) =>
        name === 'admin_session' ? { value: makeSessionCookie({ adminId: 'a1', role: 'admin', expires: expired }) } : undefined,
    });
    const res = await requireAdmin();
    expect(res).toBeNull();
  });

  it('requireAdmin returns admin when valid', async () => {
    const { cookies } = require('next/headers');
    const future = new Date(Date.now() + 60000).toISOString();
    cookies.mockResolvedValue({
      get: (name: string) =>
        name === 'admin_session' ? { value: makeSessionCookie({ adminId: 'a2', role: 'admin', expires: future }) } : undefined,
    });
    const { getAdminUser } = require('@/lib/admin/index');
    getAdminUser.mockResolvedValue({ id: 'a2', is_active: true });
    const res = await requireAdmin();
    expect(res).toBeTruthy();
  });

  it('requireAdmin enforces allowed roles', async () => {
    const { cookies } = require('next/headers');
    const future = new Date(Date.now() + 60000).toISOString();
    cookies.mockResolvedValue({
      get: (name: string) =>
        name === 'admin_session' ? { value: makeSessionCookie({ adminId: 'a3', role: 'agent', expires: future }) } : undefined,
    });
    const { getAdminUser } = require('@/lib/admin/index');
    getAdminUser.mockResolvedValue({ id: 'a3', is_active: true });

    expect(await requireAdmin(['admin'])).toBeNull();
    expect(await requireAgentOrHigher()).toBeTruthy();
    expect(await requireAdminOrHigher()).toBeNull();
    expect(await requireSuperAdmin()).toBeNull();
  });
});
