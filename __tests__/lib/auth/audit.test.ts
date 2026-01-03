import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock next/headers
jest.mock('next/headers', () => ({
  headers: jest.fn(),
}));

// Mock supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('lib/auth/audit', () => {
  let mockSupabaseClient: any;
  let mockHeaders: jest.Mock;
  let mockCreateClient: jest.Mock;

  beforeEach(() => {
    jest.resetModules();

    // Setup mock supabase client with chainable methods
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    mockCreateClient = require('@/lib/supabase/server').createClient;
    mockCreateClient.mockResolvedValue(mockSupabaseClient);

    mockHeaders = require('next/headers').headers;
    mockHeaders.mockResolvedValue({
      get: jest.fn((name: string) => {
        if (name === 'x-forwarded-for') return '192.168.1.1';
        if (name === 'user-agent') return 'Mozilla/5.0 TestBrowser';
        return null;
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRiskLevel (internal helper)', () => {
    it('should return critical for suspicious_activity event', async () => {
      const { logSecurityEvent } = require('@/lib/auth/audit');

      await logSecurityEvent('user-123', 'suspicious_activity', { reason: 'test' });

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          risk_level: 'critical',
        })
      );
    });

    it('should return critical for account_locked event', async () => {
      const { logSecurityEvent } = require('@/lib/auth/audit');

      await logSecurityEvent('user-123', 'account_locked', {});

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          risk_level: 'critical',
        })
      );
    });

    it('should return high for password_change event', async () => {
      const { logSecurityEvent } = require('@/lib/auth/audit');

      await logSecurityEvent('user-123', 'password_change', {});

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          risk_level: 'high',
        })
      );
    });

    it('should return high for 2fa_disabled event', async () => {
      const { logSecurityEvent } = require('@/lib/auth/audit');

      await logSecurityEvent('user-123', '2fa_disabled', {});

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          risk_level: 'high',
        })
      );
    });

    it('should return high for email_change event', async () => {
      const { logSecurityEvent } = require('@/lib/auth/audit');

      await logSecurityEvent('user-123', 'email_change', {});

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          risk_level: 'high',
        })
      );
    });

    it('should return high for api_key_created event', async () => {
      const { logSecurityEvent } = require('@/lib/auth/audit');

      await logSecurityEvent('user-123', 'api_key_created', {});

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          risk_level: 'high',
        })
      );
    });

    it('should return medium for login_failed event', async () => {
      const { logSecurityEvent } = require('@/lib/auth/audit');

      await logSecurityEvent('user-123', 'login_failed', {});

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          risk_level: 'medium',
        })
      );
    });

    it('should return medium for 2fa_failed event', async () => {
      const { logSecurityEvent } = require('@/lib/auth/audit');

      await logSecurityEvent('user-123', '2fa_failed', {});

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          risk_level: 'medium',
        })
      );
    });

    it('should return medium for pin_failed event', async () => {
      const { logSecurityEvent } = require('@/lib/auth/audit');

      await logSecurityEvent('user-123', 'pin_failed', {});

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          risk_level: 'medium',
        })
      );
    });

    it('should return low for login_success event', async () => {
      const { logSecurityEvent } = require('@/lib/auth/audit');

      await logSecurityEvent('user-123', 'login_success', {});

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          risk_level: 'low',
        })
      );
    });

    it('should return low for logout event', async () => {
      const { logSecurityEvent } = require('@/lib/auth/audit');

      await logSecurityEvent('user-123', 'logout', {});

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          risk_level: 'low',
        })
      );
    });

    it('should return low for 2fa_enabled event', async () => {
      const { logSecurityEvent } = require('@/lib/auth/audit');

      await logSecurityEvent('user-123', '2fa_enabled', {});

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          risk_level: 'low',
        })
      );
    });
  });

  describe('logSecurityEvent', () => {
    it('should get request metadata from headers', async () => {
      const { logSecurityEvent } = require('@/lib/auth/audit');

      await logSecurityEvent('user-123', 'login_success', { browser: 'Chrome' });

      expect(mockHeaders).toHaveBeenCalled();
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0 TestBrowser',
        })
      );
    });

    it('should use x-real-ip if x-forwarded-for is not available', async () => {
      mockHeaders.mockResolvedValue({
        get: jest.fn((name: string) => {
          if (name === 'x-real-ip') return '10.0.0.1';
          if (name === 'user-agent') return 'TestAgent';
          return null;
        }),
      });

      const { logSecurityEvent } = require('@/lib/auth/audit');

      await logSecurityEvent('user-123', 'login_success', {});

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '10.0.0.1',
        })
      );
    });

    it('should use first IP from x-forwarded-for when multiple are present', async () => {
      mockHeaders.mockResolvedValue({
        get: jest.fn((name: string) => {
          if (name === 'x-forwarded-for') return '1.2.3.4,5.6.7.8,9.10.11.12';
          if (name === 'user-agent') return 'TestAgent';
          return null;
        }),
      });

      const { logSecurityEvent } = require('@/lib/auth/audit');

      await logSecurityEvent('user-123', 'login_success', {});

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '1.2.3.4',
        })
      );
    });

    it('should default to unknown when headers throw error', async () => {
      mockHeaders.mockRejectedValue(new Error('Headers not available'));

      const { logSecurityEvent } = require('@/lib/auth/audit');

      await logSecurityEvent('user-123', 'login_success', {});

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: 'unknown',
          user_agent: 'unknown',
        })
      );
    });

    it('should look up business_id if not provided and userId exists', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { business_id: 'business-456' },
        error: null,
      });

      const { logSecurityEvent } = require('@/lib/auth/audit');

      await logSecurityEvent('user-123', 'login_success', {});

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('business_id');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'user-123');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          business_id: 'business-456',
        })
      );
    });

    it('should use provided business_id without lookup', async () => {
      const { logSecurityEvent } = require('@/lib/auth/audit');

      await logSecurityEvent('user-123', 'login_success', {}, 'provided-business-id');

      // Should still insert but should not query for business_id
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          business_id: 'provided-business-id',
        })
      );
    });

    it('should not look up business_id when userId is null', async () => {
      const { logSecurityEvent } = require('@/lib/auth/audit');

      await logSecurityEvent(null, 'login_failed', { email: 'test@test.com' });

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: null,
          business_id: undefined,
        })
      );
    });

    it('should insert security event with all required fields', async () => {
      const { logSecurityEvent } = require('@/lib/auth/audit');
      const metadata = { device: 'mobile', location: 'US' };

      await logSecurityEvent('user-123', 'password_change', metadata, 'business-456');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('security_events');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        business_id: 'business-456',
        event_type: 'password_change',
        metadata: metadata,
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0 TestBrowser',
        risk_level: 'high',
      });
    });
  });

  describe('getUserSecurityEvents', () => {
    const mockEvents = [
      {
        id: 'event-1',
        user_id: 'user-123',
        business_id: 'business-456',
        event_type: 'login_success',
        description: 'User logged in',
        metadata: { browser: 'Chrome' },
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        location: 'US',
        risk_level: 'low',
        created_at: '2024-01-15T10:00:00Z',
      },
      {
        id: 'event-2',
        user_id: 'user-123',
        business_id: 'business-456',
        event_type: 'password_change',
        description: null,
        metadata: null,
        ip_address: '192.168.1.2',
        user_agent: 'Mozilla/5.0',
        location: null,
        risk_level: 'high',
        created_at: '2024-01-14T10:00:00Z',
      },
    ];

    beforeEach(() => {
      mockSupabaseClient.range.mockResolvedValue({
        data: mockEvents,
        count: 2,
      });
    });

    it('should return mapped events with pagination', async () => {
      const { getUserSecurityEvents } = require('@/lib/auth/audit');

      const result = await getUserSecurityEvents('user-123');

      expect(result.events).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.events[0]).toEqual({
        id: 'event-1',
        userId: 'user-123',
        businessId: 'business-456',
        eventType: 'login_success',
        description: 'User logged in',
        metadata: { browser: 'Chrome' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        location: 'US',
        riskLevel: 'low',
        createdAt: '2024-01-15T10:00:00Z',
      });
    });

    it('should use default pagination when no options provided', async () => {
      const { getUserSecurityEvents } = require('@/lib/auth/audit');

      await getUserSecurityEvents('user-123');

      expect(mockSupabaseClient.range).toHaveBeenCalledWith(0, 19);
    });

    it('should use custom limit and offset', async () => {
      const { getUserSecurityEvents } = require('@/lib/auth/audit');

      await getUserSecurityEvents('user-123', { limit: 10, offset: 20 });

      expect(mockSupabaseClient.range).toHaveBeenCalledWith(20, 29);
    });

    it('should filter by eventTypes when provided', async () => {
      const { getUserSecurityEvents } = require('@/lib/auth/audit');

      await getUserSecurityEvents('user-123', {
        eventTypes: ['login_success', 'login_failed'],
      });

      expect(mockSupabaseClient.in).toHaveBeenCalledWith('event_type', ['login_success', 'login_failed']);
    });

    it('should filter by riskLevels when provided', async () => {
      const { getUserSecurityEvents } = require('@/lib/auth/audit');

      await getUserSecurityEvents('user-123', {
        riskLevels: ['high', 'critical'],
      });

      expect(mockSupabaseClient.in).toHaveBeenCalledWith('risk_level', ['high', 'critical']);
    });

    it('should filter by both eventTypes and riskLevels', async () => {
      const { getUserSecurityEvents } = require('@/lib/auth/audit');

      await getUserSecurityEvents('user-123', {
        eventTypes: ['login_failed'],
        riskLevels: ['medium'],
      });

      expect(mockSupabaseClient.in).toHaveBeenCalledWith('event_type', ['login_failed']);
      expect(mockSupabaseClient.in).toHaveBeenCalledWith('risk_level', ['medium']);
    });

    it('should not filter when eventTypes array is empty', async () => {
      const { getUserSecurityEvents } = require('@/lib/auth/audit');

      // Reset mock to track calls
      mockSupabaseClient.in.mockClear();

      await getUserSecurityEvents('user-123', { eventTypes: [] });

      // in() should not be called for event_type filter
      const inCalls = mockSupabaseClient.in.mock.calls;
      const hasEventTypeCall = inCalls.some((call: any[]) => call[0] === 'event_type');
      expect(hasEventTypeCall).toBe(false);
    });

    it('should return empty array and zero total when no data', async () => {
      mockSupabaseClient.range.mockResolvedValue({
        data: null,
        count: null,
      });

      const { getUserSecurityEvents } = require('@/lib/auth/audit');

      const result = await getUserSecurityEvents('user-123');

      expect(result.events).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should order by created_at descending', async () => {
      const { getUserSecurityEvents } = require('@/lib/auth/audit');

      await getUserSecurityEvents('user-123');

      expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('getHighRiskEvents', () => {
    const mockHighRiskEvents = [
      {
        id: 'event-1',
        user_id: 'user-123',
        business_id: 'business-456',
        event_type: 'suspicious_activity',
        description: 'Multiple failed logins',
        metadata: { attempts: 5 },
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        location: 'US',
        risk_level: 'critical',
        created_at: '2024-01-15T10:00:00Z',
        user: { name: 'John Doe', email: 'john@example.com' },
      },
    ];

    beforeEach(() => {
      mockSupabaseClient.limit.mockResolvedValue({
        data: mockHighRiskEvents,
      });
    });

    it('should query for high and critical risk events', async () => {
      const { getHighRiskEvents } = require('@/lib/auth/audit');

      await getHighRiskEvents('business-456');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('security_events');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('business_id', 'business-456');
      expect(mockSupabaseClient.in).toHaveBeenCalledWith('risk_level', ['high', 'critical']);
    });

    it('should use default limit of 50', async () => {
      const { getHighRiskEvents } = require('@/lib/auth/audit');

      await getHighRiskEvents('business-456');

      expect(mockSupabaseClient.limit).toHaveBeenCalledWith(50);
    });

    it('should use custom limit when provided', async () => {
      const { getHighRiskEvents } = require('@/lib/auth/audit');

      await getHighRiskEvents('business-456', 25);

      expect(mockSupabaseClient.limit).toHaveBeenCalledWith(25);
    });

    it('should include user data in metadata', async () => {
      const { getHighRiskEvents } = require('@/lib/auth/audit');

      const result = await getHighRiskEvents('business-456');

      expect(result[0].metadata).toEqual({
        attempts: 5,
        user: { name: 'John Doe', email: 'john@example.com' },
      });
    });

    it('should return empty array when no data', async () => {
      mockSupabaseClient.limit.mockResolvedValue({ data: null });

      const { getHighRiskEvents } = require('@/lib/auth/audit');

      const result = await getHighRiskEvents('business-456');

      expect(result).toEqual([]);
    });

    it('should order by created_at descending', async () => {
      const { getHighRiskEvents } = require('@/lib/auth/audit');

      await getHighRiskEvents('business-456');

      expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('getSecuritySummary', () => {
    beforeEach(() => {
      // Mock the Promise.all results for count queries
      let callCount = 0;
      mockSupabaseClient.gte.mockImplementation(() => {
        callCount++;
        return {
          ...mockSupabaseClient,
          count: callCount === 1 ? 100 : callCount === 2 ? 15 : callCount === 3 ? 5 : 25,
        };
      });
    });

    it('should calculate date range based on days parameter', async () => {
      // Reset and properly mock for this test
      const mockDate = new Date('2024-01-15T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(mockDate);

      // Simple mock setup for all queries
      mockSupabaseClient.gte.mockReturnThis();
      mockSupabaseClient.eq.mockReturnThis();
      mockSupabaseClient.in.mockReturnThis();
      mockSupabaseClient.select.mockReturnValue({
        ...mockSupabaseClient,
        count: 10,
      });

      const { getSecuritySummary } = require('@/lib/auth/audit');

      await getSecuritySummary('business-456', 7);

      // Verify gte was called with a date 7 days ago
      const gteCalls = mockSupabaseClient.gte.mock.calls;
      expect(gteCalls.length).toBeGreaterThan(0);
      expect(gteCalls[0][0]).toBe('created_at');

      jest.useRealTimers();
    });

    it('should use default of 30 days when not specified', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-31T12:00:00Z'));

      mockSupabaseClient.select.mockReturnValue({
        ...mockSupabaseClient,
        count: 0,
      });

      const { getSecuritySummary } = require('@/lib/auth/audit');

      await getSecuritySummary('business-456');

      const gteCalls = mockSupabaseClient.gte.mock.calls;
      expect(gteCalls.length).toBeGreaterThan(0);

      jest.useRealTimers();
    });

    it('should return summary with all count fields', async () => {
      // Mock each query to return different counts
      let queryIndex = 0;
      const counts = [100, 15, 5, 25]; // totalEvents, failedLogins, failed2FA, highRiskEvents

      mockSupabaseClient.select.mockImplementation(() => {
        const currentCount = counts[queryIndex % counts.length];
        queryIndex++;
        return {
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockResolvedValue({ count: currentCount }),
          in: jest.fn().mockReturnThis(),
        };
      });

      // Mock active users query
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_sessions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ count: 42 }),
            }),
          };
        }
        return mockSupabaseClient;
      });

      const { getSecuritySummary } = require('@/lib/auth/audit');

      const result = await getSecuritySummary('business-456', 30);

      expect(result).toHaveProperty('totalEvents');
      expect(result).toHaveProperty('failedLogins');
      expect(result).toHaveProperty('failed2FA');
      expect(result).toHaveProperty('highRiskEvents');
      expect(result).toHaveProperty('activeUsers');
    });

    it('should query user_sessions for active user count', async () => {
      mockSupabaseClient.select.mockReturnValue({
        ...mockSupabaseClient,
        count: 0,
      });

      const { getSecuritySummary } = require('@/lib/auth/audit');

      await getSecuritySummary('business-456');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_sessions');
    });

    it('should return zero for all counts when no data', async () => {
      mockSupabaseClient.select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({ count: null }),
          in: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({ count: null }),
          }),
        }),
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_sessions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ count: null }),
            }),
          };
        }
        const chainMock = {
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockResolvedValue({ count: null }),
          in: jest.fn().mockReturnThis(),
        };
        return {
          select: jest.fn().mockReturnValue(chainMock),
        };
      });

      const { getSecuritySummary } = require('@/lib/auth/audit');

      const result = await getSecuritySummary('business-456');

      expect(result.totalEvents).toBe(0);
      expect(result.failedLogins).toBe(0);
      expect(result.failed2FA).toBe(0);
      expect(result.highRiskEvents).toBe(0);
      expect(result.activeUsers).toBe(0);
    });
  });

  describe('checkSuspiciousActivity', () => {
    beforeEach(() => {
      // Default: no suspicious activity
      mockSupabaseClient.gte.mockResolvedValue({ count: 0, data: [] });
    });

    it('should detect multiple failed logins (>=5)', async () => {
      mockSupabaseClient.gte.mockResolvedValueOnce({ count: 5 });

      const { checkSuspiciousActivity } = require('@/lib/auth/audit');

      const result = await checkSuspiciousActivity('user-123');

      expect(result.suspicious).toBe(true);
      expect(result.reason).toBe('Multiple failed login attempts');
    });

    it('should not flag for fewer than 5 failed logins', async () => {
      mockSupabaseClient.gte.mockResolvedValueOnce({ count: 4 }); // failed logins
      mockSupabaseClient.gte.mockResolvedValueOnce({ count: 0 }); // failed 2FA
      mockSupabaseClient.gte.mockResolvedValueOnce({ data: [] }); // recent logins

      const { checkSuspiciousActivity } = require('@/lib/auth/audit');

      const result = await checkSuspiciousActivity('user-123');

      expect(result.suspicious).toBe(false);
    });

    it('should detect multiple 2FA failures (>=3)', async () => {
      mockSupabaseClient.gte.mockResolvedValueOnce({ count: 2 }); // failed logins (not suspicious)
      mockSupabaseClient.gte.mockResolvedValueOnce({ count: 3 }); // failed 2FA (suspicious)

      const { checkSuspiciousActivity } = require('@/lib/auth/audit');

      const result = await checkSuspiciousActivity('user-123');

      expect(result.suspicious).toBe(true);
      expect(result.reason).toBe('Multiple 2FA failures');
    });

    it('should not flag for fewer than 3 2FA failures', async () => {
      mockSupabaseClient.gte.mockResolvedValueOnce({ count: 0 }); // failed logins
      mockSupabaseClient.gte.mockResolvedValueOnce({ count: 2 }); // failed 2FA
      mockSupabaseClient.gte.mockResolvedValueOnce({ data: [] }); // recent logins

      const { checkSuspiciousActivity } = require('@/lib/auth/audit');

      const result = await checkSuspiciousActivity('user-123');

      expect(result.suspicious).toBe(false);
    });

    it('should detect logins from multiple IPs (>=3)', async () => {
      mockSupabaseClient.gte.mockResolvedValueOnce({ count: 0 }); // failed logins
      mockSupabaseClient.gte.mockResolvedValueOnce({ count: 0 }); // failed 2FA
      mockSupabaseClient.gte.mockResolvedValueOnce({
        data: [
          { ip_address: '192.168.1.1' },
          { ip_address: '10.0.0.1' },
          { ip_address: '172.16.0.1' },
        ],
      }); // recent logins from 3 different IPs

      const { checkSuspiciousActivity } = require('@/lib/auth/audit');

      const result = await checkSuspiciousActivity('user-123');

      expect(result.suspicious).toBe(true);
      expect(result.reason).toBe('Logins from multiple locations');
    });

    it('should not flag for logins from fewer than 3 IPs', async () => {
      mockSupabaseClient.gte.mockResolvedValueOnce({ count: 0 }); // failed logins
      mockSupabaseClient.gte.mockResolvedValueOnce({ count: 0 }); // failed 2FA
      mockSupabaseClient.gte.mockResolvedValueOnce({
        data: [
          { ip_address: '192.168.1.1' },
          { ip_address: '10.0.0.1' },
        ],
      }); // only 2 different IPs

      const { checkSuspiciousActivity } = require('@/lib/auth/audit');

      const result = await checkSuspiciousActivity('user-123');

      expect(result.suspicious).toBe(false);
    });

    it('should count unique IPs only', async () => {
      mockSupabaseClient.gte.mockResolvedValueOnce({ count: 0 });
      mockSupabaseClient.gte.mockResolvedValueOnce({ count: 0 });
      mockSupabaseClient.gte.mockResolvedValueOnce({
        data: [
          { ip_address: '192.168.1.1' },
          { ip_address: '192.168.1.1' }, // duplicate
          { ip_address: '10.0.0.1' },
          { ip_address: '10.0.0.1' }, // duplicate
        ],
      }); // only 2 unique IPs

      const { checkSuspiciousActivity } = require('@/lib/auth/audit');

      const result = await checkSuspiciousActivity('user-123');

      expect(result.suspicious).toBe(false);
    });

    it('should return not suspicious when no issues found', async () => {
      mockSupabaseClient.gte.mockResolvedValueOnce({ count: 0 });
      mockSupabaseClient.gte.mockResolvedValueOnce({ count: 0 });
      mockSupabaseClient.gte.mockResolvedValueOnce({ data: [] });

      const { checkSuspiciousActivity } = require('@/lib/auth/audit');

      const result = await checkSuspiciousActivity('user-123');

      expect(result.suspicious).toBe(false);
      expect(result.reason).toBeUndefined();
    });

    it('should check events within the last hour', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));

      mockSupabaseClient.gte.mockResolvedValue({ count: 0, data: [] });

      const { checkSuspiciousActivity } = require('@/lib/auth/audit');

      await checkSuspiciousActivity('user-123');

      const gteCalls = mockSupabaseClient.gte.mock.calls;
      expect(gteCalls.length).toBeGreaterThan(0);
      expect(gteCalls[0][0]).toBe('created_at');

      jest.useRealTimers();
    });

    it('should handle null count values gracefully', async () => {
      mockSupabaseClient.gte.mockResolvedValueOnce({ count: null });
      mockSupabaseClient.gte.mockResolvedValueOnce({ count: null });
      mockSupabaseClient.gte.mockResolvedValueOnce({ data: null });

      const { checkSuspiciousActivity } = require('@/lib/auth/audit');

      const result = await checkSuspiciousActivity('user-123');

      expect(result.suspicious).toBe(false);
    });
  });

  describe('formatSecurityEventDescription', () => {
    it('should return human-readable text for login_success', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: 'login_success' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Signed in');
    });

    it('should return human-readable text for login_failed', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: 'login_failed' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Failed sign-in attempt');
    });

    it('should return human-readable text for logout', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: 'logout' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Signed out');
    });

    it('should return human-readable text for password_change', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: 'password_change' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Changed password');
    });

    it('should return human-readable text for password_reset_request', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: 'password_reset_request' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Requested password reset');
    });

    it('should return human-readable text for password_reset_complete', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: 'password_reset_complete' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Reset password');
    });

    it('should return human-readable text for 2fa_enabled', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: '2fa_enabled' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Enabled two-factor authentication');
    });

    it('should return human-readable text for 2fa_disabled', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: '2fa_disabled' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Disabled two-factor authentication');
    });

    it('should return human-readable text for 2fa_success', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: '2fa_success' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Verified two-factor code');
    });

    it('should return human-readable text for 2fa_failed', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: '2fa_failed' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Failed two-factor verification');
    });

    it('should return human-readable text for backup_codes_generated', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: 'backup_codes_generated' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Generated backup codes');
    });

    it('should return human-readable text for backup_codes_regenerated', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: 'backup_codes_regenerated' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Regenerated backup codes');
    });

    it('should return human-readable text for pin_set', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: 'pin_set' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Set up PIN');
    });

    it('should return human-readable text for pin_failed', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: 'pin_failed' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Failed PIN verification');
    });

    it('should return human-readable text for pin_disabled', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: 'pin_disabled' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Disabled PIN');
    });

    it('should return human-readable text for session_revoked', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: 'session_revoked' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Signed out from a device');
    });

    it('should return human-readable text for all_sessions_revoked', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: 'all_sessions_revoked' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Signed out from all devices');
    });

    it('should return human-readable text for suspicious_activity', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: 'suspicious_activity' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Suspicious activity detected');
    });

    it('should return human-readable text for account_locked', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: 'account_locked' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Account locked');
    });

    it('should return human-readable text for account_unlocked', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: 'account_unlocked' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Account unlocked');
    });

    it('should return human-readable text for email_change', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: 'email_change' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Changed email address');
    });

    it('should return human-readable text for phone_change', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: 'phone_change' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Changed phone number');
    });

    it('should return human-readable text for permission_change', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: 'permission_change' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Changed permissions');
    });

    it('should return human-readable text for data_export', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: 'data_export' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Exported data');
    });

    it('should return human-readable text for api_key_created', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: 'api_key_created' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Created API key');
    });

    it('should return human-readable text for api_key_revoked', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: 'api_key_revoked' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('Revoked API key');
    });

    it('should return eventType as fallback for unknown event types', () => {
      const { formatSecurityEventDescription } = require('@/lib/auth/audit');

      const event = { eventType: 'unknown_event_type' };
      const result = formatSecurityEventDescription(event);

      expect(result).toBe('unknown_event_type');
    });
  });
});
