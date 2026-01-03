// =====================================================
// SMS TWO-FACTOR AUTHENTICATION TESTS
// Comprehensive tests for lib/auth/sms-2fa.ts
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

// Mock SMS module
jest.mock('@/lib/sms', () => ({
  sendSms: jest.fn(),
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

describe('sendSMS2FACode', () => {
  let sendSMS2FACode: typeof import('@/lib/auth/sms-2fa').sendSMS2FACode;
  let generateNumericCode: jest.Mock;
  let bcrypt: typeof import('bcryptjs');
  let sendSms: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    generateNumericCode = require('@/lib/crypto').generateNumericCode;
    bcrypt = require('bcryptjs');
    sendSms = require('@/lib/sms').sendSms;

    sendSMS2FACode = require('@/lib/auth/sms-2fa').sendSMS2FACode;

    // Reset mocks
    generateNumericCode.mockReset();
    (bcrypt.hash as jest.Mock).mockReset();
    sendSms.mockReset();
  });

  it('should generate a 6-digit code and hash it', async () => {
    generateNumericCode.mockReturnValue('123456');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_code');
    sendSms.mockResolvedValue(undefined);

    await sendSMS2FACode('user-123', '+15551234567');

    expect(generateNumericCode).toHaveBeenCalledWith(6);
    expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);
  });

  it('should store the hashed code in the database', async () => {
    generateNumericCode.mockReturnValue('654321');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_654321');
    sendSms.mockResolvedValue(undefined);

    await sendSMS2FACode('user-123', '+15551234567');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('two_factor_attempts');
    expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
      user_id: 'user-123',
      method: 'sms',
      code_hash: 'hashed_654321',
      expires_at: expect.any(String),
    });
  });

  it('should set code expiry to 10 minutes from now', async () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    generateNumericCode.mockReturnValue('123456');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_code');
    sendSms.mockResolvedValue(undefined);

    await sendSMS2FACode('user-123', '+15551234567');

    const expectedExpiry = new Date(now + 10 * 60 * 1000).toISOString();
    expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        expires_at: expectedExpiry,
      })
    );

    jest.spyOn(Date, 'now').mockRestore();
  });

  it('should send SMS via Twilio with correct message', async () => {
    generateNumericCode.mockReturnValue('987654');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_code');
    sendSms.mockResolvedValue(undefined);

    await sendSMS2FACode('user-123', '+15559876543');

    expect(sendSms).toHaveBeenCalledWith({
      to: '+15559876543',
      body: expect.stringContaining('987654'),
    });
    expect(sendSms).toHaveBeenCalledWith({
      to: '+15559876543',
      body: expect.stringContaining('10 minutes'),
    });
  });

  it('should handle SMS sending failure gracefully', async () => {
    generateNumericCode.mockReturnValue('123456');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_code');
    sendSms.mockRejectedValue(new Error('Twilio error'));

    // Should not throw
    await expect(sendSMS2FACode('user-123', '+15551234567')).resolves.not.toThrow();
  });
});

describe('verifySMS2FACode', () => {
  let verifySMS2FACode: typeof import('@/lib/auth/sms-2fa').verifySMS2FACode;
  let bcrypt: typeof import('bcryptjs');
  let logSecurityEvent: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    bcrypt = require('bcryptjs');
    logSecurityEvent = require('@/lib/auth/audit').logSecurityEvent;

    verifySMS2FACode = require('@/lib/auth/sms-2fa').verifySMS2FACode;

    // Reset mocks
    (bcrypt.compare as jest.Mock).mockReset();
    logSecurityEvent.mockReset();
  });

  it('should return false if no unexpired codes exist', async () => {
    mockSupabaseClient.limit.mockResolvedValue({ data: null, error: null });

    const result = await verifySMS2FACode('user-123', '123456');

    expect(result).toBe(false);
  });

  it('should return false if attempts array is empty', async () => {
    mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });

    const result = await verifySMS2FACode('user-123', '123456');

    expect(result).toBe(false);
  });

  it('should verify code against stored hash and return true for match', async () => {
    const mockAttempts = [
      { id: 'attempt-1', code_hash: 'hashed_123456' },
    ];
    mockSupabaseClient.limit.mockResolvedValue({ data: mockAttempts, error: null });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    logSecurityEvent.mockResolvedValue(undefined);

    const result = await verifySMS2FACode('user-123', '123456');

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

    await verifySMS2FACode('user-123', '123456');

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

    await verifySMS2FACode('user-123', '123456');

    expect(logSecurityEvent).toHaveBeenCalledWith('user-123', '2fa_success', { method: 'sms' });
  });

  it('should return false for invalid code', async () => {
    const mockAttempts = [
      { id: 'attempt-1', code_hash: 'hashed_123456' },
    ];
    mockSupabaseClient.limit.mockResolvedValue({ data: mockAttempts, error: null });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    logSecurityEvent.mockResolvedValue(undefined);

    const result = await verifySMS2FACode('user-123', '000000');

    expect(result).toBe(false);
  });

  it('should log 2fa_failed event on failed verification', async () => {
    const mockAttempts = [
      { id: 'attempt-1', code_hash: 'hashed_123456' },
    ];
    mockSupabaseClient.limit.mockResolvedValue({ data: mockAttempts, error: null });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    logSecurityEvent.mockResolvedValue(undefined);

    await verifySMS2FACode('user-123', '000000');

    expect(logSecurityEvent).toHaveBeenCalledWith('user-123', '2fa_failed', { method: 'sms' });
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

    const result = await verifySMS2FACode('user-123', '123456');

    expect(result).toBe(true);
    expect(bcrypt.compare).toHaveBeenCalledTimes(2);
    expect(mockSupabaseClient.update).toHaveBeenCalledWith({ success: true });
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'attempt-2');
  });

  it('should query for unexpired codes with correct filters', async () => {
    mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });

    await verifySMS2FACode('user-123', '123456');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('two_factor_attempts');
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user-123');
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('method', 'sms');
    expect(mockSupabaseClient.is).toHaveBeenCalledWith('success', null);
    expect(mockSupabaseClient.gt).toHaveBeenCalledWith('expires_at', expect.any(String));
    expect(mockSupabaseClient.limit).toHaveBeenCalledWith(5);
  });
});

describe('setupSMS2FA', () => {
  let setupSMS2FA: typeof import('@/lib/auth/sms-2fa').setupSMS2FA;
  let generateNumericCode: jest.Mock;
  let bcrypt: typeof import('bcryptjs');
  let sendSms: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    generateNumericCode = require('@/lib/crypto').generateNumericCode;
    bcrypt = require('bcryptjs');
    sendSms = require('@/lib/sms').sendSms;

    setupSMS2FA = require('@/lib/auth/sms-2fa').setupSMS2FA;

    // Reset mocks
    generateNumericCode.mockReset();
    (bcrypt.hash as jest.Mock).mockReset();
    sendSms.mockReset();
  });

  it('should throw error for invalid phone number (too short)', async () => {
    await expect(setupSMS2FA('user-123', '12345'))
      .rejects.toThrow('Invalid phone number');
  });

  it('should accept valid phone number with formatting', async () => {
    generateNumericCode.mockReturnValue('123456');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_code');
    sendSms.mockResolvedValue(undefined);

    // Phone with dashes, parentheses, etc.
    await expect(setupSMS2FA('user-123', '(555) 123-4567'))
      .resolves.not.toThrow();
  });

  it('should send verification code via SMS', async () => {
    generateNumericCode.mockReturnValue('123456');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_code');
    sendSms.mockResolvedValue(undefined);

    await setupSMS2FA('user-123', '+15551234567');

    expect(sendSms).toHaveBeenCalled();
  });

  it('should store phone number in database as unverified', async () => {
    generateNumericCode.mockReturnValue('123456');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_code');
    sendSms.mockResolvedValue(undefined);

    await setupSMS2FA('user-123', '+15551234567');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_two_factor');
    expect(mockSupabaseClient.upsert).toHaveBeenCalledWith(
      {
        user_id: 'user-123',
        sms_phone: '+15551234567',
        sms_verified: false,
        sms_enabled: false,
      },
      {
        onConflict: 'user_id',
      }
    );
  });

  it('should clean phone number before validation', async () => {
    generateNumericCode.mockReturnValue('123456');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_code');
    sendSms.mockResolvedValue(undefined);

    await setupSMS2FA('user-123', '+1 (555) 123-4567');

    // Should not throw because cleaned phone is 11 digits
    expect(mockSupabaseClient.upsert).toHaveBeenCalled();
  });
});

describe('verifySMS2FASetup', () => {
  let verifySMS2FASetup: typeof import('@/lib/auth/sms-2fa').verifySMS2FASetup;
  let bcrypt: typeof import('bcryptjs');
  let logSecurityEvent: jest.Mock;
  let ensureBackupCodes: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    bcrypt = require('bcryptjs');
    logSecurityEvent = require('@/lib/auth/audit').logSecurityEvent;
    ensureBackupCodes = require('@/lib/auth/backup-codes').ensureBackupCodes;

    verifySMS2FASetup = require('@/lib/auth/sms-2fa').verifySMS2FASetup;

    // Reset mocks
    (bcrypt.compare as jest.Mock).mockReset();
    logSecurityEvent.mockReset();
    ensureBackupCodes.mockReset();
  });

  it('should return false for invalid code', async () => {
    mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });

    const result = await verifySMS2FASetup('user-123', '000000');

    expect(result).toBe(false);
  });

  it('should enable SMS 2FA after successful verification', async () => {
    const mockAttempts = [{ id: 'attempt-1', code_hash: 'hashed_123456' }];
    mockSupabaseClient.limit.mockResolvedValue({ data: mockAttempts, error: null });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    logSecurityEvent.mockResolvedValue(undefined);
    ensureBackupCodes.mockResolvedValue(undefined);

    const result = await verifySMS2FASetup('user-123', '123456');

    expect(result).toBe(true);
    expect(mockSupabaseClient.update).toHaveBeenCalledWith({
      sms_verified: true,
      sms_enabled: true,
      sms_enabled_at: expect.any(String),
      is_enabled: true,
    });
  });

  it('should generate backup codes after successful setup', async () => {
    const mockAttempts = [{ id: 'attempt-1', code_hash: 'hashed_123456' }];
    mockSupabaseClient.limit.mockResolvedValue({ data: mockAttempts, error: null });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    logSecurityEvent.mockResolvedValue(undefined);
    ensureBackupCodes.mockResolvedValue(undefined);

    await verifySMS2FASetup('user-123', '123456');

    expect(ensureBackupCodes).toHaveBeenCalledWith('user-123');
  });

  it('should log 2fa_enabled security event', async () => {
    const mockAttempts = [{ id: 'attempt-1', code_hash: 'hashed_123456' }];
    mockSupabaseClient.limit.mockResolvedValue({ data: mockAttempts, error: null });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    logSecurityEvent.mockResolvedValue(undefined);
    ensureBackupCodes.mockResolvedValue(undefined);

    await verifySMS2FASetup('user-123', '123456');

    expect(logSecurityEvent).toHaveBeenCalledWith('user-123', '2fa_enabled', { method: 'sms' });
  });

  it('should not enable 2FA or generate backup codes on failed verification', async () => {
    mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });

    await verifySMS2FASetup('user-123', '000000');

    expect(ensureBackupCodes).not.toHaveBeenCalled();
    // Only 2fa_failed should be logged, not 2fa_enabled
    expect(logSecurityEvent).not.toHaveBeenCalledWith('user-123', '2fa_enabled', expect.anything());
  });
});

describe('disableSMS2FA', () => {
  let disableSMS2FA: typeof import('@/lib/auth/sms-2fa').disableSMS2FA;
  let logSecurityEvent: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    logSecurityEvent = require('@/lib/auth/audit').logSecurityEvent;
    logSecurityEvent.mockReset();

    disableSMS2FA = require('@/lib/auth/sms-2fa').disableSMS2FA;
  });

  it('should disable SMS 2FA and clear phone number', async () => {
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

    await disableSMS2FA('user-123');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_two_factor');
    expect(mockSupabaseClient.update).toHaveBeenCalledWith({
      sms_enabled: false,
      sms_verified: false,
      sms_phone: null,
      sms_enabled_at: null,
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

    await disableSMS2FA('user-123');

    expect(logSecurityEvent).toHaveBeenCalledWith('user-123', '2fa_disabled', { method: 'sms' });
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

    await disableSMS2FA('user-123');

    expect(mockSupabaseClient.update).toHaveBeenCalledWith({ is_enabled: false });
  });

  it('should keep is_enabled true if other 2FA methods remain (TOTP)', async () => {
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

    await disableSMS2FA('user-123');

    expect(mockSupabaseClient.update).toHaveBeenCalledWith({ is_enabled: true });
  });

  it('should keep is_enabled true if other 2FA methods remain (email)', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        totp_verified: false,
        sms_enabled: false,
        sms_verified: false,
        email_enabled: true,
        email_verified: true,
      },
      error: null,
    });
    logSecurityEvent.mockResolvedValue(undefined);

    await disableSMS2FA('user-123');

    expect(mockSupabaseClient.update).toHaveBeenCalledWith({ is_enabled: true });
  });
});

describe('getSMSPhoneMasked', () => {
  let getSMSPhoneMasked: typeof import('@/lib/auth/sms-2fa').getSMSPhoneMasked;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    getSMSPhoneMasked = require('@/lib/auth/sms-2fa').getSMSPhoneMasked;
  });

  it('should return null if no phone number exists', async () => {
    mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });

    const result = await getSMSPhoneMasked('user-123');

    expect(result).toBeNull();
  });

  it('should return null if sms_phone is null', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { sms_phone: null },
      error: null,
    });

    const result = await getSMSPhoneMasked('user-123');

    expect(result).toBeNull();
  });

  it('should return masked phone number', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { sms_phone: '+15551234567' },
      error: null,
    });

    const result = await getSMSPhoneMasked('user-123');

    expect(result).toBe('***-***-4567');
  });

  it('should handle phone numbers with various formats', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { sms_phone: '(555) 123-9999' },
      error: null,
    });

    const result = await getSMSPhoneMasked('user-123');

    expect(result).toBe('***-***-9999');
  });
});

describe('hasSMS2FAEnabled', () => {
  let hasSMS2FAEnabled: typeof import('@/lib/auth/sms-2fa').hasSMS2FAEnabled;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    hasSMS2FAEnabled = require('@/lib/auth/sms-2fa').hasSMS2FAEnabled;
  });

  it('should return true when sms_enabled and sms_verified are both true', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { sms_enabled: true, sms_verified: true },
      error: null,
    });

    const result = await hasSMS2FAEnabled('user-123');

    expect(result).toBe(true);
  });

  it('should return false when sms_enabled is false', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { sms_enabled: false, sms_verified: true },
      error: null,
    });

    const result = await hasSMS2FAEnabled('user-123');

    expect(result).toBe(false);
  });

  it('should return false when sms_verified is false', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { sms_enabled: true, sms_verified: false },
      error: null,
    });

    const result = await hasSMS2FAEnabled('user-123');

    expect(result).toBe(false);
  });

  it('should return false when no record exists', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await hasSMS2FAEnabled('user-123');

    expect(result).toBe(false);
  });

  it('should query the correct table with correct filters', async () => {
    mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });

    await hasSMS2FAEnabled('user-123');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_two_factor');
    expect(mockSupabaseClient.select).toHaveBeenCalledWith('sms_enabled, sms_verified');
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user-123');
  });
});
