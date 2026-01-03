// =====================================================
// EMAIL TWO-FACTOR AUTHENTICATION TESTS
// Comprehensive tests for lib/auth/email-2fa.ts
// =====================================================

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock crypto functions
jest.mock('@/lib/crypto', () => ({
  generateNumericCode: jest.fn(),
}));

// Mock audit logging
jest.mock('@/lib/auth/audit', () => ({
  logSecurityEvent: jest.fn(),
}));

// Mock backup codes
jest.mock('@/lib/auth/backup-codes', () => ({
  ensureBackupCodes: jest.fn(),
}));

// Mock email module
jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn(),
}));

// Create chainable mock functions for Supabase
const createMockSupabaseClient = () => {
  const mockResult = { data: null, error: null };

  const chainMethods = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(mockResult),
  };

  return {
    ...chainMethods,
    _mockResult: mockResult,
    _setMockResult: (result: { data?: any; error?: any }) => {
      Object.assign(mockResult, result);
    },
  };
};

let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => mockSupabaseClient),
}));

describe('sendEmail2FACode', () => {
  let sendEmail2FACode: typeof import('@/lib/auth/email-2fa').sendEmail2FACode;
  let generateNumericCode: jest.Mock;
  let bcrypt: typeof import('bcryptjs');
  let sendEmail: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    generateNumericCode = require('@/lib/crypto').generateNumericCode;
    bcrypt = require('bcryptjs');
    sendEmail = require('@/lib/email').sendEmail;

    sendEmail2FACode = require('@/lib/auth/email-2fa').sendEmail2FACode;

    // Reset mocks
    generateNumericCode.mockReset();
    (bcrypt.hash as jest.Mock).mockReset();
    sendEmail.mockReset();
  });

  it('should generate a 6-digit code and hash it', async () => {
    generateNumericCode.mockReturnValue('123456');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_code');
    sendEmail.mockResolvedValue(undefined);

    await sendEmail2FACode('user-123', 'user@example.com');

    expect(generateNumericCode).toHaveBeenCalledWith(6);
    expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);
  });

  it('should store the hashed code in the database', async () => {
    generateNumericCode.mockReturnValue('654321');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_654321');
    sendEmail.mockResolvedValue(undefined);

    await sendEmail2FACode('user-123', 'user@example.com');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('two_factor_attempts');
    expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
      user_id: 'user-123',
      method: 'email',
      code_hash: 'hashed_654321',
      expires_at: expect.any(String),
    });
  });

  it('should set code expiry to 15 minutes from now', async () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    generateNumericCode.mockReturnValue('123456');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_code');
    sendEmail.mockResolvedValue(undefined);

    await sendEmail2FACode('user-123', 'user@example.com');

    const expectedExpiry = new Date(now + 15 * 60 * 1000).toISOString();
    expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        expires_at: expectedExpiry,
      })
    );

    jest.spyOn(Date, 'now').mockRestore();
  });

  it('should send email with correct recipient and subject', async () => {
    generateNumericCode.mockReturnValue('987654');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_code');
    sendEmail.mockResolvedValue(undefined);

    await sendEmail2FACode('user-123', 'test@example.com');

    expect(sendEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: 'Your TradesCaptain Verification Code',
      html: expect.stringContaining('987654'),
      text: expect.stringContaining('987654'),
    });
  });

  it('should include expiry time in email content', async () => {
    generateNumericCode.mockReturnValue('123456');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_code');
    sendEmail.mockResolvedValue(undefined);

    await sendEmail2FACode('user-123', 'user@example.com');

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('15 minutes'),
        text: expect.stringContaining('15 minutes'),
      })
    );
  });

  it('should handle email sending failure gracefully', async () => {
    generateNumericCode.mockReturnValue('123456');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_code');
    sendEmail.mockRejectedValue(new Error('Email service error'));

    // Should not throw
    await expect(sendEmail2FACode('user-123', 'user@example.com')).resolves.not.toThrow();
  });

  it('should include security warning in email', async () => {
    generateNumericCode.mockReturnValue('123456');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_code');
    sendEmail.mockResolvedValue(undefined);

    await sendEmail2FACode('user-123', 'user@example.com');

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('Never share this code'),
      })
    );
  });
});

describe('verifyEmail2FACode', () => {
  let verifyEmail2FACode: typeof import('@/lib/auth/email-2fa').verifyEmail2FACode;
  let bcrypt: typeof import('bcryptjs');
  let logSecurityEvent: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    bcrypt = require('bcryptjs');
    logSecurityEvent = require('@/lib/auth/audit').logSecurityEvent;

    verifyEmail2FACode = require('@/lib/auth/email-2fa').verifyEmail2FACode;

    // Reset mocks
    (bcrypt.compare as jest.Mock).mockReset();
    logSecurityEvent.mockReset();
  });

  it('should return false if no unexpired codes exist', async () => {
    mockSupabaseClient.limit.mockResolvedValue({ data: null, error: null });

    const result = await verifyEmail2FACode('user-123', '123456');

    expect(result).toBe(false);
  });

  it('should return false if attempts array is empty', async () => {
    mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });

    const result = await verifyEmail2FACode('user-123', '123456');

    expect(result).toBe(false);
  });

  it('should verify code against stored hash and return true for match', async () => {
    const mockAttempts = [
      { id: 'attempt-1', code_hash: 'hashed_123456' },
    ];
    mockSupabaseClient.limit.mockResolvedValue({ data: mockAttempts, error: null });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    logSecurityEvent.mockResolvedValue(undefined);

    const result = await verifyEmail2FACode('user-123', '123456');

    expect(result).toBe(true);
    expect(bcrypt.compare).toHaveBeenCalledWith('123456', 'hashed_123456');
  });

  it('should mark code as used after successful verification', async () => {
    const mockAttempts = [
      { id: 'attempt-1', code_hash: 'hashed_123456' },
    ];
    mockSupabaseClient.limit.mockResolvedValue({ data: mockAttempts, error: null });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    logSecurityEvent.mockResolvedValue(undefined);

    await verifyEmail2FACode('user-123', '123456');

    expect(mockSupabaseClient.update).toHaveBeenCalledWith({ success: true });
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'attempt-1');
  });

  it('should log 2fa_success event on successful verification', async () => {
    const mockAttempts = [
      { id: 'attempt-1', code_hash: 'hashed_123456' },
    ];
    mockSupabaseClient.limit.mockResolvedValue({ data: mockAttempts, error: null });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    logSecurityEvent.mockResolvedValue(undefined);

    await verifyEmail2FACode('user-123', '123456');

    expect(logSecurityEvent).toHaveBeenCalledWith('user-123', '2fa_success', { method: 'email' });
  });

  it('should return false for invalid code', async () => {
    const mockAttempts = [
      { id: 'attempt-1', code_hash: 'hashed_123456' },
    ];
    mockSupabaseClient.limit.mockResolvedValue({ data: mockAttempts, error: null });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    logSecurityEvent.mockResolvedValue(undefined);

    const result = await verifyEmail2FACode('user-123', '000000');

    expect(result).toBe(false);
  });

  it('should log 2fa_failed event on failed verification', async () => {
    const mockAttempts = [
      { id: 'attempt-1', code_hash: 'hashed_123456' },
    ];
    mockSupabaseClient.limit.mockResolvedValue({ data: mockAttempts, error: null });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    logSecurityEvent.mockResolvedValue(undefined);

    await verifyEmail2FACode('user-123', '000000');

    expect(logSecurityEvent).toHaveBeenCalledWith('user-123', '2fa_failed', { method: 'email' });
  });

  it('should check multiple recent codes', async () => {
    const mockAttempts = [
      { id: 'attempt-1', code_hash: 'hashed_wrong1' },
      { id: 'attempt-2', code_hash: 'hashed_correct' },
      { id: 'attempt-3', code_hash: 'hashed_wrong2' },
    ];
    mockSupabaseClient.limit.mockResolvedValue({ data: mockAttempts, error: null });
    (bcrypt.compare as jest.Mock)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    logSecurityEvent.mockResolvedValue(undefined);

    const result = await verifyEmail2FACode('user-123', '123456');

    expect(result).toBe(true);
    expect(bcrypt.compare).toHaveBeenCalledTimes(2);
    expect(mockSupabaseClient.update).toHaveBeenCalledWith({ success: true });
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'attempt-2');
  });

  it('should query for unexpired codes with correct filters', async () => {
    mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });

    await verifyEmail2FACode('user-123', '123456');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('two_factor_attempts');
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user-123');
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('method', 'email');
    expect(mockSupabaseClient.is).toHaveBeenCalledWith('success', null);
    expect(mockSupabaseClient.gt).toHaveBeenCalledWith('expires_at', expect.any(String));
    expect(mockSupabaseClient.limit).toHaveBeenCalledWith(5);
  });
});

describe('setupEmail2FA', () => {
  let setupEmail2FA: typeof import('@/lib/auth/email-2fa').setupEmail2FA;
  let generateNumericCode: jest.Mock;
  let bcrypt: typeof import('bcryptjs');
  let sendEmail: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    generateNumericCode = require('@/lib/crypto').generateNumericCode;
    bcrypt = require('bcryptjs');
    sendEmail = require('@/lib/email').sendEmail;

    setupEmail2FA = require('@/lib/auth/email-2fa').setupEmail2FA;

    // Reset mocks
    generateNumericCode.mockReset();
    (bcrypt.hash as jest.Mock).mockReset();
    sendEmail.mockReset();
  });

  it('should send verification code to email', async () => {
    generateNumericCode.mockReturnValue('123456');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_code');
    sendEmail.mockResolvedValue(undefined);

    await setupEmail2FA('user-123', 'user@example.com');

    expect(sendEmail).toHaveBeenCalled();
  });

  it('should store email 2FA settings in database as unverified', async () => {
    generateNumericCode.mockReturnValue('123456');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_code');
    sendEmail.mockResolvedValue(undefined);

    await setupEmail2FA('user-123', 'user@example.com');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_two_factor');
    expect(mockSupabaseClient.upsert).toHaveBeenCalledWith(
      {
        user_id: 'user-123',
        email_enabled: false,
        email_verified: false,
      },
      {
        onConflict: 'user_id',
      }
    );
  });

  it('should call sendEmail2FACode first, then update database', async () => {
    const callOrder: string[] = [];

    generateNumericCode.mockImplementation(() => {
      callOrder.push('generateCode');
      return '123456';
    });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_code');
    sendEmail.mockImplementation(() => {
      callOrder.push('sendEmail');
      return Promise.resolve(undefined);
    });
    mockSupabaseClient.upsert.mockImplementation(function(this: any) {
      callOrder.push('upsert');
      return this;
    });

    await setupEmail2FA('user-123', 'user@example.com');

    expect(callOrder).toContain('generateCode');
    expect(callOrder).toContain('sendEmail');
    expect(callOrder).toContain('upsert');
  });
});

describe('verifyEmail2FASetup', () => {
  let verifyEmail2FASetup: typeof import('@/lib/auth/email-2fa').verifyEmail2FASetup;
  let bcrypt: typeof import('bcryptjs');
  let logSecurityEvent: jest.Mock;
  let ensureBackupCodes: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    bcrypt = require('bcryptjs');
    logSecurityEvent = require('@/lib/auth/audit').logSecurityEvent;
    ensureBackupCodes = require('@/lib/auth/backup-codes').ensureBackupCodes;

    verifyEmail2FASetup = require('@/lib/auth/email-2fa').verifyEmail2FASetup;

    // Reset mocks
    (bcrypt.compare as jest.Mock).mockReset();
    logSecurityEvent.mockReset();
    ensureBackupCodes.mockReset();
  });

  it('should return false for invalid code', async () => {
    mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });

    const result = await verifyEmail2FASetup('user-123', '000000');

    expect(result).toBe(false);
  });

  it('should enable email 2FA after successful verification', async () => {
    const mockAttempts = [{ id: 'attempt-1', code_hash: 'hashed_123456' }];
    mockSupabaseClient.limit.mockResolvedValue({ data: mockAttempts, error: null });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    logSecurityEvent.mockResolvedValue(undefined);
    ensureBackupCodes.mockResolvedValue(undefined);

    const result = await verifyEmail2FASetup('user-123', '123456');

    expect(result).toBe(true);
    expect(mockSupabaseClient.update).toHaveBeenCalledWith({
      email_verified: true,
      email_enabled: true,
      email_enabled_at: expect.any(String),
      is_enabled: true,
    });
  });

  it('should generate backup codes after successful setup', async () => {
    const mockAttempts = [{ id: 'attempt-1', code_hash: 'hashed_123456' }];
    mockSupabaseClient.limit.mockResolvedValue({ data: mockAttempts, error: null });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    logSecurityEvent.mockResolvedValue(undefined);
    ensureBackupCodes.mockResolvedValue(undefined);

    await verifyEmail2FASetup('user-123', '123456');

    expect(ensureBackupCodes).toHaveBeenCalledWith('user-123');
  });

  it('should log 2fa_enabled security event', async () => {
    const mockAttempts = [{ id: 'attempt-1', code_hash: 'hashed_123456' }];
    mockSupabaseClient.limit.mockResolvedValue({ data: mockAttempts, error: null });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    logSecurityEvent.mockResolvedValue(undefined);
    ensureBackupCodes.mockResolvedValue(undefined);

    await verifyEmail2FASetup('user-123', '123456');

    expect(logSecurityEvent).toHaveBeenCalledWith('user-123', '2fa_enabled', { method: 'email' });
  });

  it('should not enable 2FA or generate backup codes on failed verification', async () => {
    mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });

    await verifyEmail2FASetup('user-123', '000000');

    expect(ensureBackupCodes).not.toHaveBeenCalled();
    expect(logSecurityEvent).not.toHaveBeenCalledWith('user-123', '2fa_enabled', expect.anything());
  });
});

describe('disableEmail2FA', () => {
  let disableEmail2FA: typeof import('@/lib/auth/email-2fa').disableEmail2FA;
  let logSecurityEvent: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    logSecurityEvent = require('@/lib/auth/audit').logSecurityEvent;
    logSecurityEvent.mockReset();

    disableEmail2FA = require('@/lib/auth/email-2fa').disableEmail2FA;
  });

  it('should disable email 2FA settings', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        totp_verified: false,
        sms_enabled: false,
        sms_verified: false,
        email_enabled: false,
        email_verified: false,
      },
      error: null,
    });
    logSecurityEvent.mockResolvedValue(undefined);

    await disableEmail2FA('user-123');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_two_factor');
    expect(mockSupabaseClient.update).toHaveBeenCalledWith({
      email_enabled: false,
      email_verified: false,
      email_enabled_at: null,
    });
  });

  it('should log 2fa_disabled security event', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        totp_verified: false,
        sms_enabled: false,
        sms_verified: false,
        email_enabled: false,
        email_verified: false,
      },
      error: null,
    });
    logSecurityEvent.mockResolvedValue(undefined);

    await disableEmail2FA('user-123');

    expect(logSecurityEvent).toHaveBeenCalledWith('user-123', '2fa_disabled', { method: 'email' });
  });

  it('should update overall 2FA status when no methods remain', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        totp_verified: false,
        sms_enabled: false,
        sms_verified: false,
        email_enabled: false,
        email_verified: false,
      },
      error: null,
    });
    logSecurityEvent.mockResolvedValue(undefined);

    await disableEmail2FA('user-123');

    expect(mockSupabaseClient.update).toHaveBeenCalledWith({ is_enabled: false });
  });

  it('should keep is_enabled true if TOTP remains', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        totp_verified: true,
        sms_enabled: false,
        sms_verified: false,
        email_enabled: false,
        email_verified: false,
      },
      error: null,
    });
    logSecurityEvent.mockResolvedValue(undefined);

    await disableEmail2FA('user-123');

    expect(mockSupabaseClient.update).toHaveBeenCalledWith({ is_enabled: true });
  });

  it('should keep is_enabled true if SMS 2FA remains', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        totp_verified: false,
        sms_enabled: true,
        sms_verified: true,
        email_enabled: false,
        email_verified: false,
      },
      error: null,
    });
    logSecurityEvent.mockResolvedValue(undefined);

    await disableEmail2FA('user-123');

    expect(mockSupabaseClient.update).toHaveBeenCalledWith({ is_enabled: true });
  });
});

describe('hasEmail2FAEnabled', () => {
  let hasEmail2FAEnabled: typeof import('@/lib/auth/email-2fa').hasEmail2FAEnabled;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    hasEmail2FAEnabled = require('@/lib/auth/email-2fa').hasEmail2FAEnabled;
  });

  it('should return true when email_enabled and email_verified are both true', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { email_enabled: true, email_verified: true },
      error: null,
    });

    const result = await hasEmail2FAEnabled('user-123');

    expect(result).toBe(true);
  });

  it('should return false when email_enabled is false', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { email_enabled: false, email_verified: true },
      error: null,
    });

    const result = await hasEmail2FAEnabled('user-123');

    expect(result).toBe(false);
  });

  it('should return false when email_verified is false', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { email_enabled: true, email_verified: false },
      error: null,
    });

    const result = await hasEmail2FAEnabled('user-123');

    expect(result).toBe(false);
  });

  it('should return false when no record exists', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await hasEmail2FAEnabled('user-123');

    expect(result).toBe(false);
  });

  it('should query the correct table with correct filters', async () => {
    mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });

    await hasEmail2FAEnabled('user-123');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_two_factor');
    expect(mockSupabaseClient.select).toHaveBeenCalledWith('email_enabled, email_verified');
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user-123');
  });
});
