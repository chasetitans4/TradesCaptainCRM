// =====================================================
// SESSION MANAGEMENT TESTS
// Comprehensive tests for lib/auth/sessions.ts
// =====================================================

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies before importing the module
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
  createHash: jest.fn(),
}));

jest.mock('@/lib/auth/audit', () => ({
  logSecurityEvent: jest.fn(),
}));

jest.mock('ua-parser-js', () => ({
  UAParser: jest.fn(),
}));

describe('sessions', () => {
  // Common mock setup
  const mockSupabaseClient = {
    from: jest.fn(),
  };

  const mockQueryBuilder = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    eq: jest.fn(),
    neq: jest.fn(),
    single: jest.fn(),
    order: jest.fn(),
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Setup default mock chain behavior
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.insert.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.update.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.neq.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.order.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.single.mockResolvedValue({ data: null, error: null });

    mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

    const { createClient } = require('@/lib/supabase/server');
    createClient.mockResolvedValue(mockSupabaseClient);

    // Setup crypto mock
    const { randomBytes, createHash } = require('crypto');
    randomBytes.mockReturnValue({
      toString: jest.fn().mockReturnValue('mock-session-token-hex'),
    });
    createHash.mockReturnValue({
      update: jest.fn().mockReturnValue({
        digest: jest.fn().mockReturnValue('mock-token-hash'),
      }),
    });

    // Setup UAParser mock
    const { UAParser } = require('ua-parser-js');
    UAParser.mockImplementation(() => ({
      getResult: () => ({
        browser: { name: 'Chrome' },
        os: { name: 'Windows' },
        device: { type: undefined },
      }),
    }));

    // Setup logSecurityEvent mock
    const { logSecurityEvent } = require('@/lib/auth/audit');
    logSecurityEvent.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =====================================================
  // createSession Tests
  // =====================================================
  describe('createSession', () => {
    it('should create a session and return token', async () => {
      const { createSession } = require('@/lib/auth/sessions');
      const { logSecurityEvent } = require('@/lib/auth/audit');

      const userId = 'user-123';
      const options = {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        city: 'New York',
        country: 'USA',
      };

      const token = await createSession(userId, options);

      expect(token).toBe('mock-session-token-hex');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_sessions');
      expect(logSecurityEvent).toHaveBeenCalledWith(
        userId,
        'login_success',
        expect.objectContaining({
          device: expect.any(String),
          ip: '192.168.1.1',
          location: 'New York, USA',
        })
      );
    });

    it('should parse user agent for device info', async () => {
      const { UAParser } = require('ua-parser-js');
      UAParser.mockImplementation(() => ({
        getResult: () => ({
          browser: { name: 'Firefox' },
          os: { name: 'macOS' },
          device: { type: 'mobile' },
        }),
      }));

      const { createSession } = require('@/lib/auth/sessions');

      const userId = 'user-123';
      const options = {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)',
      };

      await createSession(userId, options);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          device_type: 'mobile',
          device_name: 'Firefox on macOS',
          browser: 'Firefox',
          os: 'macOS',
        })
      );
    });

    it('should handle unknown browser and OS in user agent', async () => {
      const { UAParser } = require('ua-parser-js');
      UAParser.mockImplementation(() => ({
        getResult: () => ({
          browser: {},
          os: {},
          device: {},
        }),
      }));

      const { createSession } = require('@/lib/auth/sessions');

      const userId = 'user-123';
      const options = {
        ip: '192.168.1.1',
        userAgent: 'unknown-user-agent',
      };

      await createSession(userId, options);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          device_type: 'desktop',
          device_name: 'Unknown on Unknown',
          browser: 'Unknown',
          os: 'Unknown',
        })
      );
    });

    it('should mark all other sessions as not current', async () => {
      const { createSession } = require('@/lib/auth/sessions');

      const userId = 'user-123';
      const options = {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      await createSession(userId, options);

      // First call should be update to mark other sessions as not current
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_sessions');
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({ is_current: false });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', userId);
    });

    it('should set session expiry to 30 days', async () => {
      const { createSession } = require('@/lib/auth/sessions');
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const userId = 'user-123';
      const options = {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      await createSession(userId, options);

      const expectedExpiry = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          expires_at: expectedExpiry,
          is_current: true,
        })
      );

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should log security event without location if city/country not provided', async () => {
      const { createSession } = require('@/lib/auth/sessions');
      const { logSecurityEvent } = require('@/lib/auth/audit');

      const userId = 'user-123';
      const options = {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      await createSession(userId, options);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        userId,
        'login_success',
        expect.objectContaining({
          location: undefined,
        })
      );
    });
  });

  // =====================================================
  // validateSession Tests
  // =====================================================
  describe('validateSession', () => {
    it('should return valid false when session not found', async () => {
      mockQueryBuilder.single.mockResolvedValue({ data: null, error: null });

      const { validateSession } = require('@/lib/auth/sessions');
      const result = await validateSession('invalid-token');

      expect(result).toEqual({ valid: false });
    });

    it('should return valid true for active non-expired session', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      mockQueryBuilder.single.mockResolvedValue({
        data: {
          id: 'session-1',
          user_id: 'user-123',
          expires_at: futureDate,
          two_factor_verified: true,
          is_active: true,
        },
        error: null,
      });

      const { validateSession } = require('@/lib/auth/sessions');
      const result = await validateSession('valid-token');

      expect(result).toEqual({
        valid: true,
        userId: 'user-123',
        twoFactorVerified: true,
      });
    });

    it('should return false for expired sessions', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      mockQueryBuilder.single.mockResolvedValue({
        data: {
          id: 'session-1',
          user_id: 'user-123',
          expires_at: pastDate,
          is_active: true,
        },
        error: null,
      });

      const { validateSession } = require('@/lib/auth/sessions');
      const result = await validateSession('expired-token');

      expect(result).toEqual({ valid: false });
      // Should update session to inactive with expired reason
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        is_active: false,
        ended_reason: 'expired',
      });
    });

    it('should update last_active_at for valid sessions', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      mockQueryBuilder.single.mockResolvedValue({
        data: {
          id: 'session-1',
          user_id: 'user-123',
          expires_at: futureDate,
          two_factor_verified: false,
          is_active: true,
        },
        error: null,
      });

      const { validateSession } = require('@/lib/auth/sessions');
      await validateSession('valid-token');

      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        last_active_at: expect.any(String),
      });
    });

    it('should handle sessions with null expires_at', async () => {
      mockQueryBuilder.single.mockResolvedValue({
        data: {
          id: 'session-1',
          user_id: 'user-123',
          expires_at: null,
          two_factor_verified: false,
          is_active: true,
        },
        error: null,
      });

      const { validateSession } = require('@/lib/auth/sessions');
      const result = await validateSession('valid-token');

      expect(result.valid).toBe(true);
    });
  });

  // =====================================================
  // markSession2FAVerified Tests
  // =====================================================
  describe('markSession2FAVerified', () => {
    it('should update session with 2FA verified status', async () => {
      const { markSession2FAVerified } = require('@/lib/auth/sessions');

      await markSession2FAVerified('session-token');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_sessions');
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        two_factor_verified: true,
        two_factor_verified_at: expect.any(String),
      });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('session_token_hash', 'mock-token-hash');
    });

    it('should hash the session token before updating', async () => {
      const { createHash } = require('crypto');
      const { markSession2FAVerified } = require('@/lib/auth/sessions');

      await markSession2FAVerified('my-session-token');

      expect(createHash).toHaveBeenCalledWith('sha256');
    });
  });

  // =====================================================
  // getUserSessions Tests
  // =====================================================
  describe('getUserSessions', () => {
    it('should return formatted session data', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          device_name: 'Chrome on Windows',
          device_type: 'desktop',
          browser: 'Chrome',
          os: 'Windows',
          ip_address: '192.168.1.1',
          city: 'New York',
          country: 'USA',
          is_current: true,
          two_factor_verified: true,
          last_active_at: '2024-01-01T12:00:00Z',
          created_at: '2024-01-01T10:00:00Z',
        },
        {
          id: 'session-2',
          device_name: 'Safari on macOS',
          device_type: 'desktop',
          browser: 'Safari',
          os: 'macOS',
          ip_address: '192.168.1.2',
          city: null,
          country: null,
          is_current: false,
          two_factor_verified: false,
          last_active_at: '2024-01-01T11:00:00Z',
          created_at: '2024-01-01T09:00:00Z',
        },
      ];

      mockQueryBuilder.order.mockResolvedValue({ data: mockSessions, error: null });

      const { getUserSessions } = require('@/lib/auth/sessions');
      const result = await getUserSessions('user-123');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'session-1',
        deviceName: 'Chrome on Windows',
        deviceType: 'desktop',
        browser: 'Chrome',
        os: 'Windows',
        ipAddress: '192.168.1.1',
        location: 'New York, USA',
        isCurrent: true,
        twoFactorVerified: true,
        lastActive: '2024-01-01T12:00:00Z',
        createdAt: '2024-01-01T10:00:00Z',
      });
      expect(result[1].location).toBeNull();
    });

    it('should return empty array when no sessions found', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: null, error: null });

      const { getUserSessions } = require('@/lib/auth/sessions');
      const result = await getUserSessions('user-123');

      expect(result).toEqual([]);
    });

    it('should query for active sessions only', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });

      const { getUserSessions } = require('@/lib/auth/sessions');
      await getUserSessions('user-123');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_sessions');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('is_active', true);
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('last_active_at', { ascending: false });
    });

    it('should format location correctly when only city is present', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          device_name: 'Chrome on Windows',
          device_type: 'desktop',
          browser: 'Chrome',
          os: 'Windows',
          ip_address: '192.168.1.1',
          city: 'New York',
          country: null,
          is_current: true,
          two_factor_verified: true,
          last_active_at: '2024-01-01T12:00:00Z',
          created_at: '2024-01-01T10:00:00Z',
        },
      ];

      mockQueryBuilder.order.mockResolvedValue({ data: mockSessions, error: null });

      const { getUserSessions } = require('@/lib/auth/sessions');
      const result = await getUserSessions('user-123');

      // Location should be null if both city and country are not present
      expect(result[0].location).toBeNull();
    });
  });

  // =====================================================
  // revokeSession Tests
  // =====================================================
  describe('revokeSession', () => {
    it('should revoke a specific session', async () => {
      const { logSecurityEvent } = require('@/lib/auth/audit');
      const { revokeSession } = require('@/lib/auth/sessions');

      await revokeSession('user-123', 'session-456');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_sessions');
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        is_active: false,
        revoked_at: expect.any(String),
        ended_reason: 'revoked',
      });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'session-456');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('should log security event on session revocation', async () => {
      const { logSecurityEvent } = require('@/lib/auth/audit');
      const { revokeSession } = require('@/lib/auth/sessions');

      await revokeSession('user-123', 'session-456');

      expect(logSecurityEvent).toHaveBeenCalledWith('user-123', 'session_revoked', {
        sessionId: 'session-456',
      });
    });
  });

  // =====================================================
  // revokeAllOtherSessions Tests
  // =====================================================
  describe('revokeAllOtherSessions', () => {
    it('should revoke all sessions except current', async () => {
      const mockOtherSessions = [{ id: 'session-2' }, { id: 'session-3' }];
      mockQueryBuilder.neq.mockResolvedValue({ data: mockOtherSessions, error: null });

      const { logSecurityEvent } = require('@/lib/auth/audit');
      const { revokeAllOtherSessions } = require('@/lib/auth/sessions');

      const count = await revokeAllOtherSessions('user-123', 'current-token');

      expect(count).toBe(2);
      expect(mockQueryBuilder.neq).toHaveBeenCalledWith('session_token_hash', 'mock-token-hash');
      expect(logSecurityEvent).toHaveBeenCalledWith('user-123', 'all_sessions_revoked', {
        count: 2,
      });
    });

    it('should not revoke current session', async () => {
      const mockOtherSessions = [{ id: 'session-2' }];
      mockQueryBuilder.neq.mockResolvedValue({ data: mockOtherSessions, error: null });

      const { revokeAllOtherSessions } = require('@/lib/auth/sessions');

      await revokeAllOtherSessions('user-123', 'current-token');

      // Should use neq to exclude current session token hash
      expect(mockQueryBuilder.neq).toHaveBeenCalledWith('session_token_hash', 'mock-token-hash');
    });

    it('should return 0 and not log event when no other sessions exist', async () => {
      mockQueryBuilder.neq.mockResolvedValue({ data: [], error: null });

      const { logSecurityEvent } = require('@/lib/auth/audit');
      const { revokeAllOtherSessions } = require('@/lib/auth/sessions');

      const count = await revokeAllOtherSessions('user-123', 'current-token');

      expect(count).toBe(0);
      expect(logSecurityEvent).not.toHaveBeenCalled();
    });

    it('should return 0 when sessions data is null', async () => {
      mockQueryBuilder.neq.mockResolvedValue({ data: null, error: null });

      const { revokeAllOtherSessions } = require('@/lib/auth/sessions');

      const count = await revokeAllOtherSessions('user-123', 'current-token');

      expect(count).toBe(0);
    });
  });

  // =====================================================
  // revokeAllSessions Tests
  // =====================================================
  describe('revokeAllSessions', () => {
    it('should revoke all active sessions with given reason', async () => {
      const { logSecurityEvent } = require('@/lib/auth/audit');
      const { revokeAllSessions } = require('@/lib/auth/sessions');

      await revokeAllSessions('user-123', 'password_change');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_sessions');
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        is_active: false,
        revoked_at: expect.any(String),
        ended_reason: 'password_change',
      });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should log security event with reason', async () => {
      const { logSecurityEvent } = require('@/lib/auth/audit');
      const { revokeAllSessions } = require('@/lib/auth/sessions');

      await revokeAllSessions('user-123', 'security_breach');

      expect(logSecurityEvent).toHaveBeenCalledWith('user-123', 'all_sessions_revoked', {
        reason: 'security_breach',
      });
    });
  });

  // =====================================================
  // logout Tests
  // =====================================================
  describe('logout', () => {
    it('should deactivate session and log event', async () => {
      mockQueryBuilder.single.mockResolvedValue({
        data: { user_id: 'user-123' },
        error: null,
      });

      const { logSecurityEvent } = require('@/lib/auth/audit');
      const { logout } = require('@/lib/auth/sessions');

      await logout('session-token');

      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        is_active: false,
        ended_reason: 'logout',
      });
      expect(logSecurityEvent).toHaveBeenCalledWith('user-123', 'logout', {});
    });

    it('should not log event if session not found', async () => {
      mockQueryBuilder.single.mockResolvedValue({ data: null, error: null });

      const { logSecurityEvent } = require('@/lib/auth/audit');
      const { logout } = require('@/lib/auth/sessions');

      await logout('invalid-token');

      expect(logSecurityEvent).not.toHaveBeenCalled();
    });

    it('should hash the token before querying', async () => {
      mockQueryBuilder.single.mockResolvedValue({ data: null, error: null });
      const { createHash } = require('crypto');
      const { logout } = require('@/lib/auth/sessions');

      await logout('my-session-token');

      expect(createHash).toHaveBeenCalledWith('sha256');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('session_token_hash', 'mock-token-hash');
    });
  });

  // =====================================================
  // getActiveSessionCount Tests
  // =====================================================
  describe('getActiveSessionCount', () => {
    it('should return count of active sessions', async () => {
      // For chained .eq().eq() calls, the last one must resolve
      mockQueryBuilder.eq
        .mockReturnValueOnce(mockQueryBuilder) // first eq returns chain
        .mockResolvedValueOnce({ count: 5, error: null }); // second eq returns result

      const { getActiveSessionCount } = require('@/lib/auth/sessions');
      const count = await getActiveSessionCount('user-123');

      expect(count).toBe(5);
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should return 0 when count is null', async () => {
      mockQueryBuilder.eq
        .mockReturnValueOnce(mockQueryBuilder)
        .mockResolvedValueOnce({ count: null, error: null });

      const { getActiveSessionCount } = require('@/lib/auth/sessions');
      const count = await getActiveSessionCount('user-123');

      expect(count).toBe(0);
    });
  });

  // =====================================================
  // extendSession Tests
  // =====================================================
  describe('extendSession', () => {
    it('should extend session by default 30 days', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const { extendSession } = require('@/lib/auth/sessions');

      await extendSession('session-token');

      const expectedExpiry = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        expires_at: expectedExpiry,
      });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('session_token_hash', 'mock-token-hash');

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should extend session by custom number of days', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const { extendSession } = require('@/lib/auth/sessions');

      await extendSession('session-token', 7);

      const expectedExpiry = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        expires_at: expectedExpiry,
      });

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should hash the token before updating', async () => {
      const { createHash } = require('crypto');
      const { extendSession } = require('@/lib/auth/sessions');

      await extendSession('my-session-token', 14);

      expect(createHash).toHaveBeenCalledWith('sha256');
    });
  });
});
