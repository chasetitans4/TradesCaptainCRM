// =====================================================
// PASSWORD TESTS
// Comprehensive tests for password validation, change,
// expiration, and account lockout functionality
// =====================================================

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

// Mock audit logging
jest.mock('@/lib/auth/audit', () => ({
  logSecurityEvent: jest.fn(),
}));

// Mock sessions
jest.mock('@/lib/auth/sessions', () => ({
  revokeAllSessions: jest.fn(),
}));

// Create chainable mock functions for Supabase
const createMockSupabaseClient = () => {
  const mockResult = { data: null, error: null, count: null };

  const chainMethods = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(mockResult),
  };

  return {
    ...chainMethods,
    _mockResult: mockResult,
    _setMockResult: (result: { data?: any; error?: any; count?: any }) => {
      Object.assign(mockResult, result);
    },
  };
};

let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => mockSupabaseClient),
}));

describe('validatePassword', () => {
  let validatePassword: typeof import('@/lib/auth/password').validatePassword;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();
    validatePassword = require('@/lib/auth/password').validatePassword;
  });

  describe('minimum length validation', () => {
    it('should reject password shorter than minLength', () => {
      const result = validatePassword('Abc1!', { minLength: 8, requireUppercase: false, requireLowercase: false, requireNumbers: false, requireSpecialChars: false, preventReuse: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('should accept password meeting minLength', () => {
      const result = validatePassword('abcdefgh', { minLength: 8, requireUppercase: false, requireLowercase: false, requireNumbers: false, requireSpecialChars: false, preventReuse: 0 });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should give bonus score for 12+ character passwords', () => {
      const short = validatePassword('Abcd1234!', { minLength: 8, requireUppercase: true, requireLowercase: true, requireNumbers: true, requireSpecialChars: true, preventReuse: 0 });
      const medium = validatePassword('Abcd12345678!', { minLength: 8, requireUppercase: true, requireLowercase: true, requireNumbers: true, requireSpecialChars: true, preventReuse: 0 });
      expect(medium.score).toBeGreaterThan(short.score);
    });

    it('should give bonus score for 16+ character passwords', () => {
      const medium = validatePassword('Abcd12345678!', { minLength: 8, requireUppercase: true, requireLowercase: true, requireNumbers: true, requireSpecialChars: true, preventReuse: 0 });
      const long = validatePassword('Abcd123456789012!', { minLength: 8, requireUppercase: true, requireLowercase: true, requireNumbers: true, requireSpecialChars: true, preventReuse: 0 });
      expect(long.score).toBeGreaterThan(medium.score);
    });
  });

  describe('uppercase validation', () => {
    it('should reject password without uppercase when required', () => {
      const result = validatePassword('abcd1234!', { minLength: 8, requireUppercase: true, requireLowercase: false, requireNumbers: false, requireSpecialChars: false, preventReuse: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should accept password with uppercase when required', () => {
      const result = validatePassword('Abcd1234', { minLength: 8, requireUppercase: true, requireLowercase: false, requireNumbers: false, requireSpecialChars: false, preventReuse: 0 });
      expect(result.valid).toBe(true);
    });

    it('should not require uppercase when not enabled in policy', () => {
      const result = validatePassword('abcd1234', { minLength: 8, requireUppercase: false, requireLowercase: false, requireNumbers: false, requireSpecialChars: false, preventReuse: 0 });
      expect(result.valid).toBe(true);
    });
  });

  describe('lowercase validation', () => {
    it('should reject password without lowercase when required', () => {
      const result = validatePassword('ABCD1234!', { minLength: 8, requireUppercase: false, requireLowercase: true, requireNumbers: false, requireSpecialChars: false, preventReuse: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should accept password with lowercase when required', () => {
      const result = validatePassword('ABCDabcd', { minLength: 8, requireUppercase: false, requireLowercase: true, requireNumbers: false, requireSpecialChars: false, preventReuse: 0 });
      expect(result.valid).toBe(true);
    });
  });

  describe('number validation', () => {
    it('should reject password without numbers when required', () => {
      const result = validatePassword('Abcdefgh!', { minLength: 8, requireUppercase: false, requireLowercase: false, requireNumbers: true, requireSpecialChars: false, preventReuse: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should accept password with numbers when required', () => {
      const result = validatePassword('Abcdefg1', { minLength: 8, requireUppercase: false, requireLowercase: false, requireNumbers: true, requireSpecialChars: false, preventReuse: 0 });
      expect(result.valid).toBe(true);
    });
  });

  describe('special character validation', () => {
    it('should reject password without special chars when required', () => {
      const result = validatePassword('Abcd1234', { minLength: 8, requireUppercase: false, requireLowercase: false, requireNumbers: false, requireSpecialChars: true, preventReuse: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should accept password with special chars when required', () => {
      const result = validatePassword('Abcd123!', { minLength: 8, requireUppercase: false, requireLowercase: false, requireNumbers: false, requireSpecialChars: true, preventReuse: 0 });
      expect(result.valid).toBe(true);
    });

    it('should accept various special characters', () => {
      const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '=', '+'];
      specialChars.forEach((char) => {
        const result = validatePassword(`Abcd1234${char}`, { minLength: 8, requireUppercase: false, requireLowercase: false, requireNumbers: false, requireSpecialChars: true, preventReuse: 0 });
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('common password rejection', () => {
    it('should reject common password "password123"', () => {
      const result = validatePassword('password123', { minLength: 8, requireUppercase: false, requireLowercase: false, requireNumbers: false, requireSpecialChars: false, preventReuse: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('This password is too common. Please choose a different password.');
      expect(result.score).toBe(0);
    });

    it('should reject common password "password" (case insensitive)', () => {
      const result = validatePassword('PASSWORD', { minLength: 8, requireUppercase: false, requireLowercase: false, requireNumbers: false, requireSpecialChars: false, preventReuse: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('This password is too common. Please choose a different password.');
    });

    it('should reject "123456"', () => {
      const result = validatePassword('123456', { minLength: 6, requireUppercase: false, requireLowercase: false, requireNumbers: false, requireSpecialChars: false, preventReuse: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('This password is too common. Please choose a different password.');
    });

    it('should reject "qwerty"', () => {
      const result = validatePassword('qwerty', { minLength: 6, requireUppercase: false, requireLowercase: false, requireNumbers: false, requireSpecialChars: false, preventReuse: 0 });
      expect(result.valid).toBe(false);
    });

    it('should reject "admin"', () => {
      const result = validatePassword('admin', { minLength: 5, requireUppercase: false, requireLowercase: false, requireNumbers: false, requireSpecialChars: false, preventReuse: 0 });
      expect(result.valid).toBe(false);
    });
  });

  describe('repeated character detection', () => {
    it('should reject password with 3+ repeated characters (aaa)', () => {
      const result = validatePassword('Abcdaaa1!', { minLength: 8, requireUppercase: false, requireLowercase: false, requireNumbers: false, requireSpecialChars: false, preventReuse: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password should not contain more than 2 repeated characters');
    });

    it('should reject password with repeated numbers (111)', () => {
      const result = validatePassword('Abcd111!', { minLength: 8, requireUppercase: false, requireLowercase: false, requireNumbers: false, requireSpecialChars: false, preventReuse: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password should not contain more than 2 repeated characters');
    });

    it('should accept password with 2 repeated characters', () => {
      const result = validatePassword('Abcdaa12!', { minLength: 8, requireUppercase: false, requireLowercase: false, requireNumbers: false, requireSpecialChars: false, preventReuse: 0 });
      expect(result.valid).toBe(true);
    });

    it('should reduce score for repeated characters', () => {
      const withRepeats = validatePassword('Abcdaaa1!', { minLength: 8, requireUppercase: true, requireLowercase: true, requireNumbers: true, requireSpecialChars: true, preventReuse: 0 });
      const noRepeats = validatePassword('Abcdefg1!', { minLength: 8, requireUppercase: true, requireLowercase: true, requireNumbers: true, requireSpecialChars: true, preventReuse: 0 });
      expect(withRepeats.score).toBeLessThan(noRepeats.score);
    });
  });

  describe('strength calculation', () => {
    it('should return weak for score <= 2', () => {
      const result = validatePassword('ab', { minLength: 2, requireUppercase: false, requireLowercase: false, requireNumbers: false, requireSpecialChars: false, preventReuse: 0 });
      expect(result.strength).toBe('weak');
    });

    it('should return fair for score 3-4', () => {
      const result = validatePassword('Abcd1234', { minLength: 8, requireUppercase: false, requireLowercase: false, requireNumbers: false, requireSpecialChars: false, preventReuse: 0 });
      expect(result.strength).toBe('fair');
    });

    it('should return strong for score 5-6', () => {
      const result = validatePassword('Abcd1234!', { minLength: 8, requireUppercase: false, requireLowercase: false, requireNumbers: false, requireSpecialChars: false, preventReuse: 0 });
      expect(result.strength).toBe('strong');
    });

    it('should return very_strong for score > 6', () => {
      const result = validatePassword('Abcdefghijk1234!', { minLength: 8, requireUppercase: false, requireLowercase: false, requireNumbers: false, requireSpecialChars: false, preventReuse: 0 });
      expect(result.strength).toBe('very_strong');
    });
  });

  describe('default policy', () => {
    it('should use default policy when none provided', () => {
      const result = validatePassword('weak');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should pass with strong password using default policy', () => {
      const result = validatePassword('StrongP@ssw0rd!');
      expect(result.valid).toBe(true);
    });
  });
});

describe('changePassword', () => {
  let changePassword: typeof import('@/lib/auth/password').changePassword;
  let bcrypt: typeof import('bcryptjs');
  let logSecurityEvent: jest.Mock;
  let revokeAllSessions: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    bcrypt = require('bcryptjs');
    logSecurityEvent = require('@/lib/auth/audit').logSecurityEvent;
    revokeAllSessions = require('@/lib/auth/sessions').revokeAllSessions;

    changePassword = require('@/lib/auth/password').changePassword;

    // Reset all mocks
    (bcrypt.compare as jest.Mock).mockReset();
    (bcrypt.hash as jest.Mock).mockReset();
    logSecurityEvent.mockReset();
    revokeAllSessions.mockReset();
  });

  it('should return error when user not found', async () => {
    mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });

    const result = await changePassword('user-123', 'oldPass', 'NewP@ssw0rd!');
    expect(result.success).toBe(false);
    expect(result.error).toBe('User not found');
  });

  it('should return error when current password is incorrect', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { password_hash: 'hashed_password' },
      error: null,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const result = await changePassword('user-123', 'wrongPassword', 'NewP@ssw0rd!');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Current password is incorrect');
    expect(logSecurityEvent).toHaveBeenCalledWith('user-123', 'password_change', {
      success: false,
      reason: 'invalid_current',
    });
  });

  it('should return error when new password fails validation', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { password_hash: 'hashed_password' },
      error: null,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await changePassword('user-123', 'correctPassword', 'weak');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Password must be at least');
  });

  it('should return error when new password was recently used', async () => {
    // First call for getting user password_hash
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { password_hash: 'current_hash' },
      error: null,
    });

    // Mock for password history check - limit() returns a promise with data
    mockSupabaseClient.limit.mockResolvedValueOnce({
      data: [{ password_hash: 'old_hash_1' }],
      error: null,
    });

    (bcrypt.compare as jest.Mock)
      .mockResolvedValueOnce(true) // current password is correct
      .mockResolvedValueOnce(true); // new password matches history

    const result = await changePassword('user-123', 'correctPassword', 'NewP@ssw0rd!');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Cannot reuse one of your last');
  });

  it('should return error when new password is same as current', async () => {
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { password_hash: 'current_hash' },
      error: null,
    });

    mockSupabaseClient.limit.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    (bcrypt.compare as jest.Mock)
      .mockResolvedValueOnce(true) // current password is correct
      .mockResolvedValueOnce(true); // new password matches current

    const result = await changePassword('user-123', 'correctPassword', 'NewP@ssw0rd!');

    expect(result.success).toBe(false);
    expect(result.error).toBe('New password must be different from current password');
  });

  it('should successfully change password', async () => {
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { password_hash: 'current_hash' },
      error: null,
    });

    mockSupabaseClient.limit.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    (bcrypt.compare as jest.Mock)
      .mockResolvedValueOnce(true) // current password is correct
      .mockResolvedValueOnce(false); // new password is different from current

    (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');

    const result = await changePassword('user-123', 'correctPassword', 'NewP@ssw0rd!');

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(bcrypt.hash).toHaveBeenCalledWith('NewP@ssw0rd!', 12);
    expect(logSecurityEvent).toHaveBeenCalledWith('user-123', 'password_change', { success: true });
    expect(revokeAllSessions).toHaveBeenCalledWith('user-123', 'password_change');
  });

  it('should not revoke sessions when revokeOtherSessions is false', async () => {
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { password_hash: 'current_hash' },
      error: null,
    });

    mockSupabaseClient.limit.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    (bcrypt.compare as jest.Mock)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');

    await changePassword('user-123', 'correctPassword', 'NewP@ssw0rd!', {
      revokeOtherSessions: false,
    });

    expect(revokeAllSessions).not.toHaveBeenCalled();
  });

  it('should use custom policy when provided', async () => {
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { password_hash: 'current_hash' },
      error: null,
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const customPolicy = {
      minLength: 20,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      preventReuse: 0,
    };

    const result = await changePassword('user-123', 'correctPassword', 'ShortPass1!', {
      policy: customPolicy,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Password must be at least 20 characters');
  });

  it('should skip password history check when preventReuse is 0', async () => {
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { password_hash: 'current_hash' },
      error: null,
    });

    (bcrypt.compare as jest.Mock)
      .mockResolvedValueOnce(true) // current password correct
      .mockResolvedValueOnce(false); // new password different

    (bcrypt.hash as jest.Mock).mockResolvedValue('new_hash');

    const customPolicy = {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      preventReuse: 0,
    };

    const result = await changePassword('user-123', 'correctPassword', 'NewP@ssw0rd!', {
      policy: customPolicy,
    });

    expect(result.success).toBe(true);
    // When preventReuse is 0, checkPasswordHistory should not be called
    // The function still inserts into password_history after successful change,
    // but it should not query password_history for history check (no .select on password_history)
    // We verify by checking order() was not called (used only in history check)
    const fromCalls = mockSupabaseClient.from.mock.calls;
    const passwordHistoryCalls = fromCalls.filter((call: any[]) => call[0] === 'password_history');
    // There should be exactly 1 call for password_history (the insert), not 2 (insert + select for history check)
    expect(passwordHistoryCalls.length).toBe(1);
  });
});

describe('isPasswordExpired', () => {
  let isPasswordExpired: typeof import('@/lib/auth/password').isPasswordExpired;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();
    isPasswordExpired = require('@/lib/auth/password').isPasswordExpired;
  });

  it('should return false when user not found', async () => {
    mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });

    const result = await isPasswordExpired('user-123');
    expect(result).toBe(false);
  });

  it('should return true when must_change_password is true', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { must_change_password: true, password_expires_at: null },
      error: null,
    });

    const result = await isPasswordExpired('user-123');
    expect(result).toBe(true);
  });

  it('should return true when password_expires_at is in the past', async () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(); // 1 day ago
    mockSupabaseClient.single.mockResolvedValue({
      data: { must_change_password: false, password_expires_at: pastDate },
      error: null,
    });

    const result = await isPasswordExpired('user-123');
    expect(result).toBe(true);
  });

  it('should return false when password_expires_at is in the future', async () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 1 day from now
    mockSupabaseClient.single.mockResolvedValue({
      data: { must_change_password: false, password_expires_at: futureDate },
      error: null,
    });

    const result = await isPasswordExpired('user-123');
    expect(result).toBe(false);
  });

  it('should return false when password_expires_at is null and must_change_password is false', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { must_change_password: false, password_expires_at: null },
      error: null,
    });

    const result = await isPasswordExpired('user-123');
    expect(result).toBe(false);
  });
});

describe('requirePasswordChange', () => {
  let requirePasswordChange: typeof import('@/lib/auth/password').requirePasswordChange;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();
    requirePasswordChange = require('@/lib/auth/password').requirePasswordChange;
  });

  it('should update user to require password change', async () => {
    await requirePasswordChange('user-123');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
    expect(mockSupabaseClient.update).toHaveBeenCalledWith({ must_change_password: true });
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'user-123');
  });
});

describe('recordFailedLogin', () => {
  let recordFailedLogin: typeof import('@/lib/auth/password').recordFailedLogin;
  let logSecurityEvent: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();
    logSecurityEvent = require('@/lib/auth/audit').logSecurityEvent;
    logSecurityEvent.mockReset();
    recordFailedLogin = require('@/lib/auth/password').recordFailedLogin;
  });

  it('should increment failed attempts for first failure', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { failed_login_attempts: 0 },
      error: null,
    });

    const result = await recordFailedLogin('user-123');

    expect(result.locked).toBe(false);
    expect(result.remainingAttempts).toBe(4); // 5 - 1 = 4
    expect(mockSupabaseClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        failed_login_attempts: 1,
        locked_until: null,
      })
    );
  });

  it('should lock account after 5 failed attempts', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { failed_login_attempts: 4 },
      error: null,
    });

    const result = await recordFailedLogin('user-123');

    expect(result.locked).toBe(true);
    expect(result.remainingAttempts).toBe(0);
    expect(mockSupabaseClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        failed_login_attempts: 5,
        locked_until: expect.any(String),
      })
    );
    expect(logSecurityEvent).toHaveBeenCalledWith('user-123', 'account_locked', {
      reason: 'too_many_failed_logins',
      duration_minutes: 30,
    });
  });

  it('should handle user with no previous failed attempts (null)', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { failed_login_attempts: null },
      error: null,
    });

    const result = await recordFailedLogin('user-123');

    expect(result.locked).toBe(false);
    expect(result.remainingAttempts).toBe(4);
  });

  it('should handle user not found', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await recordFailedLogin('user-123');

    expect(result.locked).toBe(false);
    expect(result.remainingAttempts).toBe(4);
  });

  it('should return correct remaining attempts at various counts', async () => {
    const testCases = [
      { current: 0, expectedRemaining: 4 },
      { current: 1, expectedRemaining: 3 },
      { current: 2, expectedRemaining: 2 },
      { current: 3, expectedRemaining: 1 },
      { current: 4, expectedRemaining: 0, locked: true },
    ];

    for (const testCase of testCases) {
      jest.resetModules();
      mockSupabaseClient = createMockSupabaseClient();
      mockSupabaseClient.single.mockResolvedValue({
        data: { failed_login_attempts: testCase.current },
        error: null,
      });

      const fn = require('@/lib/auth/password').recordFailedLogin;
      const result = await fn('user-123');

      expect(result.remainingAttempts).toBe(testCase.expectedRemaining);
      expect(result.locked).toBe(testCase.locked || false);
    }
  });
});

describe('resetFailedLoginAttempts', () => {
  let resetFailedLoginAttempts: typeof import('@/lib/auth/password').resetFailedLoginAttempts;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();
    resetFailedLoginAttempts = require('@/lib/auth/password').resetFailedLoginAttempts;
  });

  it('should reset failed attempts and clear lock', async () => {
    await resetFailedLoginAttempts('user-123');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
    expect(mockSupabaseClient.update).toHaveBeenCalledWith({
      failed_login_attempts: 0,
      locked_until: null,
    });
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'user-123');
  });
});

describe('isAccountLocked', () => {
  let isAccountLocked: typeof import('@/lib/auth/password').isAccountLocked;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();
    isAccountLocked = require('@/lib/auth/password').isAccountLocked;
  });

  it('should return not locked when user has no locked_until', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { locked_until: null },
      error: null,
    });

    const result = await isAccountLocked('user-123');

    expect(result.locked).toBe(false);
    expect(result.lockedUntil).toBeUndefined();
  });

  it('should return locked when locked_until is in the future', async () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 30).toISOString(); // 30 minutes from now
    mockSupabaseClient.single.mockResolvedValue({
      data: { locked_until: futureDate },
      error: null,
    });

    const result = await isAccountLocked('user-123');

    expect(result.locked).toBe(true);
    expect(result.lockedUntil).toBe(futureDate);
  });

  it('should return not locked and clear lock when locked_until has expired', async () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 30).toISOString(); // 30 minutes ago
    mockSupabaseClient.single.mockResolvedValue({
      data: { locked_until: pastDate },
      error: null,
    });

    const result = await isAccountLocked('user-123');

    expect(result.locked).toBe(false);
    expect(mockSupabaseClient.update).toHaveBeenCalledWith({
      locked_until: null,
      failed_login_attempts: 0,
    });
  });

  it('should return not locked when user not found', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await isAccountLocked('user-123');

    expect(result.locked).toBe(false);
  });
});

describe('unlockAccount', () => {
  let unlockAccount: typeof import('@/lib/auth/password').unlockAccount;
  let logSecurityEvent: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();
    logSecurityEvent = require('@/lib/auth/audit').logSecurityEvent;
    logSecurityEvent.mockReset();
    unlockAccount = require('@/lib/auth/password').unlockAccount;
  });

  it('should unlock account and log security event', async () => {
    await unlockAccount('user-123');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
    expect(mockSupabaseClient.update).toHaveBeenCalledWith({
      locked_until: null,
      failed_login_attempts: 0,
    });
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'user-123');
    expect(logSecurityEvent).toHaveBeenCalledWith('user-123', 'account_unlocked', { method: 'admin' });
  });
});

describe('getStrengthColor', () => {
  let getStrengthColor: typeof import('@/lib/auth/password').getStrengthColor;

  beforeEach(() => {
    jest.resetModules();
    getStrengthColor = require('@/lib/auth/password').getStrengthColor;
  });

  it('should return red for weak strength', () => {
    expect(getStrengthColor('weak')).toBe('red');
  });

  it('should return orange for fair strength', () => {
    expect(getStrengthColor('fair')).toBe('orange');
  });

  it('should return blue for strong strength', () => {
    expect(getStrengthColor('strong')).toBe('blue');
  });

  it('should return green for very_strong strength', () => {
    expect(getStrengthColor('very_strong')).toBe('green');
  });
});
