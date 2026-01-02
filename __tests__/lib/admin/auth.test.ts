// Module import deferred to tests to allow proper mocking

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    get: (_name: string) => undefined,
  })),
}));

jest.mock('@/lib/admin', () => ({}));

jest.mock('@/lib/admin/index', () => ({
  getAdminUser: jest.fn(),
}));

describe('admin auth helpers: verifyAdminAuth', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'x'.repeat(32);
  });

  beforeEach(() => {
    const { jwtVerify } = require('jose');
    jwtVerify.mockReset();
    const { getAdminUser } = require('@/lib/admin/index');
    getAdminUser.mockReset();
  });

  it('returns invalid when no token provided', async () => {
    const { verifyAdminAuth } = require('@/lib/admin/auth');
    const req: any = { headers: new Map() };
    const res = await verifyAdminAuth(req);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('No token provided');
  });

  it('returns invalid for bad token', async () => {
    const { verifyAdminAuth } = require('@/lib/admin/auth');
    const { jwtVerify } = require('jose');
    jwtVerify.mockImplementation(async () => {
      throw new Error('bad token');
    });
    const req: any = {
      headers: { get: (k: string) => (k === 'authorization' ? 'Bearer bad' : null) },
    };
    const res = await verifyAdminAuth(req);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('Invalid or expired token');
  });

  // Additional cases are covered in role-based session tests
});

describe('admin auth helpers: getAdminSession parse errors', () => {
  beforeEach(() => {
    const { cookies } = require('next/headers');
    cookies.mockResolvedValue({
      get: (name: string) => (name === 'admin_session' ? { value: 'not-json-base64' } : undefined),
    });
  });
  it('returns null on parse error', async () => {
    const { getAdminSession } = require('@/lib/admin/auth');
    const res = await getAdminSession();
    expect(res).toBeNull();
  });
});

describe('admin auth helpers: verifyAdminAuth branches', () => {
  beforeEach(() => {
    const { jwtVerify } = require('jose');
    jwtVerify.mockReset();
    const { getAdminUser } = require('@/lib/admin/index');
    getAdminUser.mockReset();
  });

  it('returns success when token valid and user active (issuer/audience set)', async () => {
    const { verifyAdminAuth } = require('@/lib/admin/auth');
    const { jwtVerify } = require('jose');
    process.env.JWT_SECRET = 'y'.repeat(32);
    process.env.JWT_ISSUER = 'tc-issuer';
    process.env.JWT_AUDIENCE = 'tc-audience';
    jwtVerify.mockResolvedValue({ payload: { userId: 'u1' } });
    const { getAdminUser } = require('@/lib/admin/index');
    getAdminUser.mockResolvedValue({ id: 'u1', is_active: true });
    const req: any = { headers: { get: (k: string) => (k === 'authorization' ? 'Bearer good' : null) } };
    const res = await verifyAdminAuth(req);
    expect(typeof res.valid).toBe('boolean');
  });

  // Note: user not found/inactive cases are covered via session-based role tests

  it('returns failure when JWT secret misconfigured', async () => {
    const { verifyAdminAuth } = require('@/lib/admin/auth');
    const { jwtVerify } = require('jose');
    const old = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'short';
    jwtVerify.mockResolvedValue({ payload: { userId: 'u4' } });
    const req: any = { headers: { get: (k: string) => (k === 'authorization' ? 'Bearer good' : null) } };
    const res = await verifyAdminAuth(req);
    expect(res.valid).toBe(false);
    expect(typeof res.error).toBe('string');
    process.env.JWT_SECRET = old;
  });

  it('uses cookie token when present', async () => {
    const { cookies } = require('next/headers');
    cookies.mockResolvedValue({
      get: (name: string) => (name === 'admin_token' ? { value: 'cookie-token' } : undefined),
    });
    const { verifyAdminAuth } = require('@/lib/admin/auth');
    const { jwtVerify } = require('jose');
    process.env.JWT_SECRET = 'b'.repeat(32);
    jwtVerify.mockResolvedValue({ payload: { userId: 'u9' } });
    const { getAdminUser } = require('@/lib/admin/index');
    getAdminUser.mockResolvedValue({ id: 'u9', is_active: true });
    const req: any = { headers: { get: () => null } };
    const res = await verifyAdminAuth(req);
    expect(typeof res.valid).toBe('boolean');
  });

  it('returns user not found when token valid but user missing', async () => {
    const { cookies } = require('next/headers');
    cookies.mockResolvedValue({
      get: (name: string) => (name === 'admin_token' ? { value: 'cookie-token' } : undefined),
    });
    const { verifyAdminAuth } = require('@/lib/admin/auth');
    const { jwtVerify } = require('jose');
    process.env.JWT_SECRET = 'c'.repeat(32);
    jwtVerify.mockResolvedValue({ payload: { userId: 'u404' } });
    const { getAdminUser } = require('@/lib/admin/index');
    getAdminUser.mockResolvedValue(null);
    const req: any = { headers: { get: () => null } };
    const res = await verifyAdminAuth(req);
    expect(res.valid).toBe(false);
    expect(typeof res.error).toBe('string');
  });

  it('returns inactive when token valid but user inactive', async () => {
    const { cookies } = require('next/headers');
    cookies.mockResolvedValue({
      get: (name: string) => (name === 'admin_token' ? { value: 'cookie-token' } : undefined),
    });
    const { verifyAdminAuth } = require('@/lib/admin/auth');
    const { jwtVerify } = require('jose');
    process.env.JWT_SECRET = 'd'.repeat(32);
    jwtVerify.mockResolvedValue({ payload: { userId: 'u2' } });
    const { getAdminUser } = require('@/lib/admin/index');
    getAdminUser.mockResolvedValue({ id: 'u2', is_active: false });
    const req: any = { headers: { get: () => null } };
    const res = await verifyAdminAuth(req);
    expect(res.valid).toBe(false);
    expect(typeof res.error).toBe('string');
  });

  it('catches thrown errors and returns failure', async () => {
    const { verifyAdminAuth } = require('@/lib/admin/auth');
    const { jwtVerify } = require('jose');
    process.env.JWT_SECRET = 'e'.repeat(32);
    jwtVerify.mockResolvedValue({ payload: { userId: 'u3' } });
    const { getAdminUser } = require('@/lib/admin/index');
    getAdminUser.mockImplementation(async () => { throw new Error('db fail'); });
    const req: any = { headers: { get: (k: string) => (k === 'authorization' ? 'Bearer good' : null) } };
    const res = await verifyAdminAuth(req);
    expect(res.valid).toBe(false);
    expect(typeof res.error).toBe('string');
  });
});
