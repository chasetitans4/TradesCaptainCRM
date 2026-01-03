// =====================================================
// TOTP (TIME-BASED ONE-TIME PASSWORD) TESTS
// Comprehensive tests for lib/auth/totp.ts
// =====================================================

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock otplib authenticator
jest.mock('otplib', () => ({
  authenticator: {
    options: {},
    generateSecret: jest.fn(),
    keyuri: jest.fn(),
    verify: jest.fn(),
  },
}));

// Mock QRCode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}));

// Mock crypto functions
jest.mock('@/lib/crypto', () => ({
  encrypt: jest.fn((val: string) => `encrypted_${val}`),
  decrypt: jest.fn((val: string) => val.replace('encrypted_', '')),
}));

// Mock audit logging
jest.mock('@/lib/auth/audit', () => ({
  logSecurityEvent: jest.fn(),
}));

// Mock backup codes
jest.mock('@/lib/auth/backup-codes', () => ({
  generateBackupCodes: jest.fn(),
}));

// Create chainable mock functions for Supabase
const createMockSupabaseClient = () => {
  const mockResult = { data: null, error: null };

  const chainMethods = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
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

describe('generateTOTPSecret', () => {
  let generateTOTPSecret: typeof import('@/lib/auth/totp').generateTOTPSecret;
  let authenticator: typeof import('otplib').authenticator;
  let QRCode: typeof import('qrcode');
  let encrypt: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    authenticator = require('otplib').authenticator;
    QRCode = require('qrcode');
    encrypt = require('@/lib/crypto').encrypt;

    generateTOTPSecret = require('@/lib/auth/totp').generateTOTPSecret;

    // Reset mocks
    (authenticator.generateSecret as jest.Mock).mockReset();
    (authenticator.keyuri as jest.Mock).mockReset();
    (QRCode.toDataURL as jest.Mock).mockReset();
    encrypt.mockReset();
  });

  it('should generate a TOTP secret and QR code', async () => {
    const mockSecret = 'JBSWY3DPEHPK3PXP';
    const mockOtpauthUrl = 'otpauth://totp/TradesCaptain:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=TradesCaptain';
    const mockQRCodeDataUrl = 'data:image/png;base64,iVBORw0KGgo...';

    (authenticator.generateSecret as jest.Mock).mockReturnValue(mockSecret);
    (authenticator.keyuri as jest.Mock).mockReturnValue(mockOtpauthUrl);
    (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQRCodeDataUrl);
    encrypt.mockImplementation((val: string) => `encrypted_${val}`);

    const result = await generateTOTPSecret('user-123', 'user@example.com');

    expect(result).toEqual({
      secret: mockSecret,
      qrCodeUrl: mockQRCodeDataUrl,
      manualEntryKey: mockSecret,
    });

    expect(authenticator.generateSecret).toHaveBeenCalled();
    expect(authenticator.keyuri).toHaveBeenCalledWith(
      'user@example.com',
      'TradesCaptain',
      mockSecret
    );
    expect(QRCode.toDataURL).toHaveBeenCalledWith(mockOtpauthUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  });

  it('should store encrypted secret in database with totp_verified false', async () => {
    const mockSecret = 'ABCDEFGH';

    (authenticator.generateSecret as jest.Mock).mockReturnValue(mockSecret);
    (authenticator.keyuri as jest.Mock).mockReturnValue('otpauth://...');
    (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,...');
    encrypt.mockImplementation((val: string) => `encrypted_${val}`);

    await generateTOTPSecret('user-123', 'user@example.com');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_two_factor');
    expect(mockSupabaseClient.upsert).toHaveBeenCalledWith(
      {
        user_id: 'user-123',
        totp_secret: `encrypted_${mockSecret}`,
        totp_verified: false,
      },
      {
        onConflict: 'user_id',
      }
    );
  });

  it('should return secret as manualEntryKey for manual entry', async () => {
    const mockSecret = 'MANUALSECRET123';

    (authenticator.generateSecret as jest.Mock).mockReturnValue(mockSecret);
    (authenticator.keyuri as jest.Mock).mockReturnValue('otpauth://...');
    (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,...');
    encrypt.mockImplementation((val: string) => `encrypted_${val}`);

    const result = await generateTOTPSecret('user-456', 'test@test.com');

    expect(result.secret).toBe(mockSecret);
    expect(result.manualEntryKey).toBe(mockSecret);
  });
});

describe('verifyTOTPSetup', () => {
  let verifyTOTPSetup: typeof import('@/lib/auth/totp').verifyTOTPSetup;
  let authenticator: typeof import('otplib').authenticator;
  let logSecurityEvent: jest.Mock;
  let generateBackupCodes: jest.Mock;
  let decrypt: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    authenticator = require('otplib').authenticator;
    logSecurityEvent = require('@/lib/auth/audit').logSecurityEvent;
    generateBackupCodes = require('@/lib/auth/backup-codes').generateBackupCodes;
    decrypt = require('@/lib/crypto').decrypt;

    verifyTOTPSetup = require('@/lib/auth/totp').verifyTOTPSetup;

    // Reset mocks
    (authenticator.verify as jest.Mock).mockReset();
    logSecurityEvent.mockReset();
    generateBackupCodes.mockReset();
    decrypt.mockReset();
  });

  it('should throw error if TOTP is not set up', async () => {
    mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });

    await expect(verifyTOTPSetup('user-123', '123456'))
      .rejects.toThrow('TOTP not set up. Please start setup first.');
  });

  it('should throw error if totp_secret is null', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { totp_secret: null },
      error: null,
    });

    await expect(verifyTOTPSetup('user-123', '123456'))
      .rejects.toThrow('TOTP not set up. Please start setup first.');
  });

  it('should return false for invalid TOTP code', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { totp_secret: 'encrypted_MYSECRET' },
      error: null,
    });
    decrypt.mockImplementation((val: string) => val.replace('encrypted_', ''));
    (authenticator.verify as jest.Mock).mockReturnValue(false);

    const result = await verifyTOTPSetup('user-123', '000000');

    expect(result).toBe(false);
    expect(authenticator.verify).toHaveBeenCalledWith({
      token: '000000',
      secret: 'MYSECRET',
    });
  });

  it('should return true and enable TOTP for valid code', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { totp_secret: 'encrypted_VALIDSECRET' },
      error: null,
    });
    decrypt.mockImplementation((val: string) => val.replace('encrypted_', ''));
    (authenticator.verify as jest.Mock).mockReturnValue(true);
    generateBackupCodes.mockResolvedValue([]);
    logSecurityEvent.mockResolvedValue(undefined);

    const result = await verifyTOTPSetup('user-123', '123456');

    expect(result).toBe(true);
    expect(mockSupabaseClient.update).toHaveBeenCalledWith({
      totp_verified: true,
      totp_enabled_at: expect.any(String),
      is_enabled: true,
      preferred_method: 'totp',
    });
  });

  it('should generate backup codes after successful setup', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { totp_secret: 'encrypted_SECRET' },
      error: null,
    });
    decrypt.mockImplementation((val: string) => val.replace('encrypted_', ''));
    (authenticator.verify as jest.Mock).mockReturnValue(true);
    generateBackupCodes.mockResolvedValue([]);
    logSecurityEvent.mockResolvedValue(undefined);

    await verifyTOTPSetup('user-123', '123456');

    expect(generateBackupCodes).toHaveBeenCalledWith('user-123');
  });

  it('should log security event after successful setup', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { totp_secret: 'encrypted_SECRET' },
      error: null,
    });
    decrypt.mockImplementation((val: string) => val.replace('encrypted_', ''));
    (authenticator.verify as jest.Mock).mockReturnValue(true);
    generateBackupCodes.mockResolvedValue([]);
    logSecurityEvent.mockResolvedValue(undefined);

    await verifyTOTPSetup('user-123', '123456');

    expect(logSecurityEvent).toHaveBeenCalledWith('user-123', '2fa_enabled', { method: 'totp' });
  });

  it('should not generate backup codes or log event on failed verification', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { totp_secret: 'encrypted_SECRET' },
      error: null,
    });
    decrypt.mockImplementation((val: string) => val.replace('encrypted_', ''));
    (authenticator.verify as jest.Mock).mockReturnValue(false);

    await verifyTOTPSetup('user-123', '000000');

    expect(generateBackupCodes).not.toHaveBeenCalled();
    expect(logSecurityEvent).not.toHaveBeenCalled();
  });
});

describe('verifyTOTP', () => {
  let verifyTOTP: typeof import('@/lib/auth/totp').verifyTOTP;
  let authenticator: typeof import('otplib').authenticator;
  let logSecurityEvent: jest.Mock;
  let decrypt: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    authenticator = require('otplib').authenticator;
    logSecurityEvent = require('@/lib/auth/audit').logSecurityEvent;
    decrypt = require('@/lib/crypto').decrypt;

    verifyTOTP = require('@/lib/auth/totp').verifyTOTP;

    // Reset mocks
    (authenticator.verify as jest.Mock).mockReset();
    logSecurityEvent.mockReset();
    decrypt.mockReset();
  });

  it('should return false if no two-factor record exists', async () => {
    mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });

    const result = await verifyTOTP('user-123', '123456');

    expect(result).toBe(false);
  });

  it('should return false if totp_secret is null', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { totp_secret: null, totp_verified: true },
      error: null,
    });

    const result = await verifyTOTP('user-123', '123456');

    expect(result).toBe(false);
  });

  it('should return false if totp_verified is false', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { totp_secret: 'encrypted_SECRET', totp_verified: false },
      error: null,
    });

    const result = await verifyTOTP('user-123', '123456');

    expect(result).toBe(false);
  });

  it('should verify code and return true for valid code', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { totp_secret: 'encrypted_VALIDSECRET', totp_verified: true },
      error: null,
    });
    decrypt.mockImplementation((val: string) => val.replace('encrypted_', ''));
    (authenticator.verify as jest.Mock).mockReturnValue(true);
    logSecurityEvent.mockResolvedValue(undefined);

    const result = await verifyTOTP('user-123', '123456');

    expect(result).toBe(true);
    expect(authenticator.verify).toHaveBeenCalledWith({
      token: '123456',
      secret: 'VALIDSECRET',
    });
  });

  it('should return false for invalid code', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { totp_secret: 'encrypted_SECRET', totp_verified: true },
      error: null,
    });
    decrypt.mockImplementation((val: string) => val.replace('encrypted_', ''));
    (authenticator.verify as jest.Mock).mockReturnValue(false);
    logSecurityEvent.mockResolvedValue(undefined);

    const result = await verifyTOTP('user-123', '000000');

    expect(result).toBe(false);
  });

  it('should log 2fa_success event for valid code', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { totp_secret: 'encrypted_SECRET', totp_verified: true },
      error: null,
    });
    decrypt.mockImplementation((val: string) => val.replace('encrypted_', ''));
    (authenticator.verify as jest.Mock).mockReturnValue(true);
    logSecurityEvent.mockResolvedValue(undefined);

    await verifyTOTP('user-123', '123456');

    expect(logSecurityEvent).toHaveBeenCalledWith('user-123', '2fa_success', { method: 'totp' });
  });

  it('should log 2fa_failed event for invalid code', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { totp_secret: 'encrypted_SECRET', totp_verified: true },
      error: null,
    });
    decrypt.mockImplementation((val: string) => val.replace('encrypted_', ''));
    (authenticator.verify as jest.Mock).mockReturnValue(false);
    logSecurityEvent.mockResolvedValue(undefined);

    await verifyTOTP('user-123', '000000');

    expect(logSecurityEvent).toHaveBeenCalledWith('user-123', '2fa_failed', { method: 'totp' });
  });
});

describe('disableTOTP', () => {
  let disableTOTP: typeof import('@/lib/auth/totp').disableTOTP;
  let logSecurityEvent: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    logSecurityEvent = require('@/lib/auth/audit').logSecurityEvent;
    logSecurityEvent.mockReset();

    disableTOTP = require('@/lib/auth/totp').disableTOTP;
  });

  it('should clear TOTP secret and verified status', async () => {
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

    await disableTOTP('user-123');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_two_factor');
    expect(mockSupabaseClient.update).toHaveBeenCalledWith({
      totp_secret: null,
      totp_verified: false,
      totp_enabled_at: null,
    });
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user-123');
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

    await disableTOTP('user-123');

    expect(logSecurityEvent).toHaveBeenCalledWith('user-123', '2fa_disabled', { method: 'totp' });
  });

  it('should update overall 2FA status when no methods remain', async () => {
    // First call for disabling TOTP
    // Second call for updateTwoFactorStatus
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

    await disableTOTP('user-123');

    // Should update is_enabled to false since no methods remain
    expect(mockSupabaseClient.update).toHaveBeenCalledWith({ is_enabled: false });
  });

  it('should keep is_enabled true if other 2FA methods remain', async () => {
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

    await disableTOTP('user-123');

    // Should update is_enabled to true since SMS 2FA remains
    expect(mockSupabaseClient.update).toHaveBeenCalledWith({ is_enabled: true });
  });
});

describe('hasTOTPEnabled', () => {
  let hasTOTPEnabled: typeof import('@/lib/auth/totp').hasTOTPEnabled;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    hasTOTPEnabled = require('@/lib/auth/totp').hasTOTPEnabled;
  });

  it('should return true when totp_verified is true', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { totp_verified: true },
      error: null,
    });

    const result = await hasTOTPEnabled('user-123');

    expect(result).toBe(true);
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_two_factor');
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user-123');
  });

  it('should return false when totp_verified is false', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { totp_verified: false },
      error: null,
    });

    const result = await hasTOTPEnabled('user-123');

    expect(result).toBe(false);
  });

  it('should return false when no record exists', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await hasTOTPEnabled('user-123');

    expect(result).toBe(false);
  });

  it('should return false when totp_verified is undefined', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: {},
      error: null,
    });

    const result = await hasTOTPEnabled('user-123');

    expect(result).toBe(false);
  });
});
