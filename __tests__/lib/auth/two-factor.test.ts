// ==========================================================
// TWO-FACTOR AUTHENTICATION TESTS
// Tests for lib/auth/two-factor.ts
// ==========================================================

// Mock @/lib/supabase/server
const mockSingle = jest.fn();
const mockEq = jest.fn(() => ({ single: mockSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockUpdate = jest.fn(() => ({ eq: jest.fn() }));
const mockFrom = jest.fn(() => ({
  select: mockSelect,
  update: mockUpdate,
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    from: mockFrom,
  })),
}));

// Mock ./totp
const mockVerifyTOTP = jest.fn();
jest.mock('@/lib/auth/totp', () => ({
  verifyTOTP: mockVerifyTOTP,
}));

// Mock ./sms-2fa
const mockVerifySMS2FACode = jest.fn();
const mockSendSMS2FACode = jest.fn();
jest.mock('@/lib/auth/sms-2fa', () => ({
  verifySMS2FACode: mockVerifySMS2FACode,
  sendSMS2FACode: mockSendSMS2FACode,
}));

// Mock ./email-2fa
const mockVerifyEmail2FACode = jest.fn();
const mockSendEmail2FACode = jest.fn();
jest.mock('@/lib/auth/email-2fa', () => ({
  verifyEmail2FACode: mockVerifyEmail2FACode,
  sendEmail2FACode: mockSendEmail2FACode,
}));

// Mock ./backup-codes
const mockVerifyBackupCode = jest.fn();
const mockGetRemainingBackupCodesCount = jest.fn();
jest.mock('@/lib/auth/backup-codes', () => ({
  verifyBackupCode: mockVerifyBackupCode,
  getRemainingBackupCodesCount: mockGetRemainingBackupCodesCount,
}));

describe('two-factor authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSingle.mockReset();
    mockEq.mockReset().mockReturnValue({ single: mockSingle });
    mockSelect.mockReset().mockReturnValue({ eq: mockEq });
    mockUpdate.mockReset().mockReturnValue({ eq: jest.fn() });
    mockFrom.mockReset().mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
    });
  });

  // ============================================================
  // getTwoFactorStatus
  // ============================================================
  describe('getTwoFactorStatus', () => {
    it('returns default disabled status when no data exists', async () => {
      mockSingle.mockResolvedValue({ data: null });

      const { getTwoFactorStatus } = require('@/lib/auth/two-factor');
      const status = await getTwoFactorStatus('user-123');

      expect(status).toEqual({
        isEnabled: false,
        methods: { totp: false, sms: false, email: false },
        preferredMethod: null,
        backupCodesRemaining: 0,
      });
      expect(mockFrom).toHaveBeenCalledWith('user_two_factor');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('returns correct status when 2FA is enabled with all methods', async () => {
      mockSingle.mockResolvedValue({
        data: {
          is_enabled: true,
          totp_verified: true,
          sms_enabled: true,
          sms_verified: true,
          email_enabled: true,
          email_verified: true,
          preferred_method: 'totp',
          backup_codes: [
            { hash: 'code1', used_at: null },
            { hash: 'code2', used_at: null },
            { hash: 'code3', used_at: '2024-01-01' },
          ],
          sms_phone: '+15551234567',
        },
      });

      const { getTwoFactorStatus } = require('@/lib/auth/two-factor');
      const status = await getTwoFactorStatus('user-123');

      expect(status.isEnabled).toBe(true);
      expect(status.methods.totp).toBe(true);
      expect(status.methods.sms).toBe(true);
      expect(status.methods.email).toBe(true);
      expect(status.preferredMethod).toBe('totp');
      expect(status.backupCodesRemaining).toBe(2);
    });

    it('masks phone number as ***-***-XXXX', async () => {
      mockSingle.mockResolvedValue({
        data: {
          is_enabled: true,
          totp_verified: false,
          sms_enabled: true,
          sms_verified: true,
          email_enabled: false,
          email_verified: false,
          preferred_method: 'sms',
          backup_codes: [],
          sms_phone: '+15551234567',
        },
      });

      const { getTwoFactorStatus } = require('@/lib/auth/two-factor');
      const status = await getTwoFactorStatus('user-123');

      expect(status.smsPhoneMasked).toBe('***-***-4567');
    });

    it('masks phone number with special characters correctly', async () => {
      mockSingle.mockResolvedValue({
        data: {
          is_enabled: true,
          totp_verified: false,
          sms_enabled: true,
          sms_verified: true,
          email_enabled: false,
          email_verified: false,
          preferred_method: 'sms',
          backup_codes: [],
          sms_phone: '(555) 123-9876',
        },
      });

      const { getTwoFactorStatus } = require('@/lib/auth/two-factor');
      const status = await getTwoFactorStatus('user-123');

      expect(status.smsPhoneMasked).toBe('***-***-9876');
    });

    it('does not include smsPhoneMasked when no phone configured', async () => {
      mockSingle.mockResolvedValue({
        data: {
          is_enabled: true,
          totp_verified: true,
          sms_enabled: false,
          sms_verified: false,
          email_enabled: false,
          email_verified: false,
          preferred_method: 'totp',
          backup_codes: [],
          sms_phone: null,
        },
      });

      const { getTwoFactorStatus } = require('@/lib/auth/two-factor');
      const status = await getTwoFactorStatus('user-123');

      expect(status.smsPhoneMasked).toBeUndefined();
    });

    it('counts only unused backup codes', async () => {
      mockSingle.mockResolvedValue({
        data: {
          is_enabled: true,
          totp_verified: true,
          sms_enabled: false,
          sms_verified: false,
          email_enabled: false,
          email_verified: false,
          preferred_method: 'totp',
          backup_codes: [
            { hash: 'code1', used_at: null },
            { hash: 'code2', used_at: '2024-01-01' },
            { hash: 'code3', used_at: null },
            { hash: 'code4', used_at: '2024-01-02' },
            { hash: 'code5', used_at: null },
          ],
        },
      });

      const { getTwoFactorStatus } = require('@/lib/auth/two-factor');
      const status = await getTwoFactorStatus('user-123');

      expect(status.backupCodesRemaining).toBe(3);
    });

    it('handles empty backup_codes array', async () => {
      mockSingle.mockResolvedValue({
        data: {
          is_enabled: true,
          totp_verified: true,
          sms_enabled: false,
          sms_verified: false,
          email_enabled: false,
          email_verified: false,
          preferred_method: 'totp',
          backup_codes: [],
        },
      });

      const { getTwoFactorStatus } = require('@/lib/auth/two-factor');
      const status = await getTwoFactorStatus('user-123');

      expect(status.backupCodesRemaining).toBe(0);
    });

    it('handles null backup_codes', async () => {
      mockSingle.mockResolvedValue({
        data: {
          is_enabled: false,
          totp_verified: false,
          sms_enabled: false,
          sms_verified: false,
          email_enabled: false,
          email_verified: false,
          preferred_method: null,
          backup_codes: null,
        },
      });

      const { getTwoFactorStatus } = require('@/lib/auth/two-factor');
      const status = await getTwoFactorStatus('user-123');

      expect(status.backupCodesRemaining).toBe(0);
    });

    it('returns sms method as false when sms_enabled but not sms_verified', async () => {
      mockSingle.mockResolvedValue({
        data: {
          is_enabled: false,
          totp_verified: false,
          sms_enabled: true,
          sms_verified: false,
          email_enabled: false,
          email_verified: false,
          preferred_method: null,
          backup_codes: [],
        },
      });

      const { getTwoFactorStatus } = require('@/lib/auth/two-factor');
      const status = await getTwoFactorStatus('user-123');

      expect(status.methods.sms).toBe(false);
    });

    it('returns email method as false when email_enabled but not email_verified', async () => {
      mockSingle.mockResolvedValue({
        data: {
          is_enabled: false,
          totp_verified: false,
          sms_enabled: false,
          sms_verified: false,
          email_enabled: true,
          email_verified: false,
          preferred_method: null,
          backup_codes: [],
        },
      });

      const { getTwoFactorStatus } = require('@/lib/auth/two-factor');
      const status = await getTwoFactorStatus('user-123');

      expect(status.methods.email).toBe(false);
    });
  });

  // ============================================================
  // requiresTwoFactor
  // ============================================================
  describe('requiresTwoFactor', () => {
    it('returns true when 2FA is enabled', async () => {
      mockSingle.mockResolvedValue({
        data: {
          is_enabled: true,
          totp_verified: true,
          sms_enabled: false,
          sms_verified: false,
          email_enabled: false,
          email_verified: false,
          preferred_method: 'totp',
          backup_codes: [],
        },
      });

      const { requiresTwoFactor } = require('@/lib/auth/two-factor');
      const result = await requiresTwoFactor('user-123');

      expect(result).toBe(true);
    });

    it('returns false when 2FA is disabled', async () => {
      mockSingle.mockResolvedValue({
        data: {
          is_enabled: false,
          totp_verified: false,
          sms_enabled: false,
          sms_verified: false,
          email_enabled: false,
          email_verified: false,
          preferred_method: null,
          backup_codes: [],
        },
      });

      const { requiresTwoFactor } = require('@/lib/auth/two-factor');
      const result = await requiresTwoFactor('user-123');

      expect(result).toBe(false);
    });

    it('returns false when no 2FA data exists', async () => {
      mockSingle.mockResolvedValue({ data: null });

      const { requiresTwoFactor } = require('@/lib/auth/two-factor');
      const result = await requiresTwoFactor('user-123');

      expect(result).toBe(false);
    });
  });

  // ============================================================
  // send2FACode
  // ============================================================
  describe('send2FACode', () => {
    it('sends SMS code using phone from user_two_factor when available', async () => {
      // Setup mock for two-table queries
      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { email: 'user@example.com', phone: '+15559999999' },
                }),
              })),
            })),
          };
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { sms_phone: '+15551234567' },
              }),
            })),
          })),
        };
      });

      const { send2FACode } = require('@/lib/auth/two-factor');
      await send2FACode('user-123', 'sms');

      expect(mockSendSMS2FACode).toHaveBeenCalledWith('user-123', '+15551234567');
    });

    it('sends SMS code using phone from users table when no 2FA phone', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { email: 'user@example.com', phone: '+15559999999' },
                }),
              })),
            })),
          };
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { sms_phone: null },
              }),
            })),
          })),
        };
      });

      const { send2FACode } = require('@/lib/auth/two-factor');
      await send2FACode('user-123', 'sms');

      expect(mockSendSMS2FACode).toHaveBeenCalledWith('user-123', '+15559999999');
    });

    it('throws error when no phone configured for SMS', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { email: 'user@example.com', phone: null },
                }),
              })),
            })),
          };
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { sms_phone: null },
              }),
            })),
          })),
        };
      });

      const { send2FACode } = require('@/lib/auth/two-factor');
      await expect(send2FACode('user-123', 'sms')).rejects.toThrow(
        'No phone number configured for SMS 2FA'
      );
    });

    it('sends email code using email from users table', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { email: 'user@example.com', phone: '+15559999999' },
                }),
              })),
            })),
          };
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { sms_phone: '+15551234567' },
              }),
            })),
          })),
        };
      });

      const { send2FACode } = require('@/lib/auth/two-factor');
      await send2FACode('user-123', 'email');

      expect(mockSendEmail2FACode).toHaveBeenCalledWith('user-123', 'user@example.com');
    });

    it('throws error when no email configured for Email 2FA', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { email: null, phone: '+15559999999' },
                }),
              })),
            })),
          };
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { sms_phone: '+15551234567' },
              }),
            })),
          })),
        };
      });

      const { send2FACode } = require('@/lib/auth/two-factor');
      await expect(send2FACode('user-123', 'email')).rejects.toThrow(
        'No email configured for Email 2FA'
      );
    });
  });

  // ============================================================
  // verify2FA
  // ============================================================
  describe('verify2FA', () => {
    it('delegates to verifyTOTP for totp method', async () => {
      mockVerifyTOTP.mockResolvedValue(true);

      const { verify2FA } = require('@/lib/auth/two-factor');
      const result = await verify2FA('user-123', '123456', 'totp');

      expect(mockVerifyTOTP).toHaveBeenCalledWith('user-123', '123456');
      expect(result.success).toBe(true);
    });

    it('delegates to verifySMS2FACode for sms method', async () => {
      mockVerifySMS2FACode.mockResolvedValue(true);

      const { verify2FA } = require('@/lib/auth/two-factor');
      const result = await verify2FA('user-123', '123456', 'sms');

      expect(mockVerifySMS2FACode).toHaveBeenCalledWith('user-123', '123456');
      expect(result.success).toBe(true);
    });

    it('delegates to verifyEmail2FACode for email method', async () => {
      mockVerifyEmail2FACode.mockResolvedValue(true);

      const { verify2FA } = require('@/lib/auth/two-factor');
      const result = await verify2FA('user-123', '123456', 'email');

      expect(mockVerifyEmail2FACode).toHaveBeenCalledWith('user-123', '123456');
      expect(result.success).toBe(true);
    });

    it('delegates to verifyBackupCode for backup method', async () => {
      mockVerifyBackupCode.mockResolvedValue(true);
      mockGetRemainingBackupCodesCount.mockResolvedValue(5);

      const { verify2FA } = require('@/lib/auth/two-factor');
      const result = await verify2FA('user-123', 'ABCD1234', 'backup');

      expect(mockVerifyBackupCode).toHaveBeenCalledWith('user-123', 'ABCD1234');
      expect(result.success).toBe(true);
    });

    it('returns backupCodesRemaining when using backup method successfully', async () => {
      mockVerifyBackupCode.mockResolvedValue(true);
      mockGetRemainingBackupCodesCount.mockResolvedValue(3);

      const { verify2FA } = require('@/lib/auth/two-factor');
      const result = await verify2FA('user-123', 'ABCD1234', 'backup');

      expect(result.success).toBe(true);
      expect(result.backupCodesRemaining).toBe(3);
      expect(mockGetRemainingBackupCodesCount).toHaveBeenCalledWith('user-123');
    });

    it('does not include backupCodesRemaining for non-backup methods', async () => {
      mockVerifyTOTP.mockResolvedValue(true);

      const { verify2FA } = require('@/lib/auth/two-factor');
      const result = await verify2FA('user-123', '123456', 'totp');

      expect(result.success).toBe(true);
      expect(result.backupCodesRemaining).toBeUndefined();
    });

    it('returns error for invalid totp code', async () => {
      mockVerifyTOTP.mockResolvedValue(false);

      const { verify2FA } = require('@/lib/auth/two-factor');
      const result = await verify2FA('user-123', '000000', 'totp');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid verification code');
    });

    it('returns error for invalid sms code', async () => {
      mockVerifySMS2FACode.mockResolvedValue(false);

      const { verify2FA } = require('@/lib/auth/two-factor');
      const result = await verify2FA('user-123', '000000', 'sms');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid verification code');
    });

    it('returns error for invalid email code', async () => {
      mockVerifyEmail2FACode.mockResolvedValue(false);

      const { verify2FA } = require('@/lib/auth/two-factor');
      const result = await verify2FA('user-123', '000000', 'email');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid verification code');
    });

    it('returns error for invalid backup code', async () => {
      mockVerifyBackupCode.mockResolvedValue(false);

      const { verify2FA } = require('@/lib/auth/two-factor');
      const result = await verify2FA('user-123', 'INVALID', 'backup');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid verification code');
      expect(result.backupCodesRemaining).toBeUndefined();
    });

    it('returns error for invalid 2FA method', async () => {
      const { verify2FA } = require('@/lib/auth/two-factor');
      const result = await verify2FA('user-123', '123456', 'invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid 2FA method');
    });
  });

  // ============================================================
  // getAvailable2FAMethods
  // ============================================================
  describe('getAvailable2FAMethods', () => {
    it('returns empty array when no methods enabled', async () => {
      mockSingle.mockResolvedValue({ data: null });

      const { getAvailable2FAMethods } = require('@/lib/auth/two-factor');
      const methods = await getAvailable2FAMethods('user-123');

      expect(methods).toEqual([]);
    });

    it('returns all methods when all enabled', async () => {
      mockSingle.mockResolvedValue({
        data: {
          is_enabled: true,
          totp_verified: true,
          sms_enabled: true,
          sms_verified: true,
          email_enabled: true,
          email_verified: true,
          preferred_method: 'totp',
          backup_codes: [
            { hash: 'code1', used_at: null },
          ],
        },
      });

      const { getAvailable2FAMethods } = require('@/lib/auth/two-factor');
      const methods = await getAvailable2FAMethods('user-123');

      expect(methods).toContain('totp');
      expect(methods).toContain('sms');
      expect(methods).toContain('email');
      expect(methods).toContain('backup');
    });

    it('includes backup only if codes remaining > 0', async () => {
      mockSingle.mockResolvedValue({
        data: {
          is_enabled: true,
          totp_verified: true,
          sms_enabled: false,
          sms_verified: false,
          email_enabled: false,
          email_verified: false,
          preferred_method: 'totp',
          backup_codes: [
            { hash: 'code1', used_at: '2024-01-01' },
            { hash: 'code2', used_at: '2024-01-02' },
          ],
        },
      });

      const { getAvailable2FAMethods } = require('@/lib/auth/two-factor');
      const methods = await getAvailable2FAMethods('user-123');

      expect(methods).toContain('totp');
      expect(methods).not.toContain('backup');
    });

    it('does not include backup when all codes used', async () => {
      mockSingle.mockResolvedValue({
        data: {
          is_enabled: true,
          totp_verified: true,
          sms_enabled: true,
          sms_verified: true,
          email_enabled: false,
          email_verified: false,
          preferred_method: 'totp',
          backup_codes: [],
        },
      });

      const { getAvailable2FAMethods } = require('@/lib/auth/two-factor');
      const methods = await getAvailable2FAMethods('user-123');

      expect(methods).toContain('totp');
      expect(methods).toContain('sms');
      expect(methods).not.toContain('email');
      expect(methods).not.toContain('backup');
    });

    it('returns only totp when only totp enabled', async () => {
      mockSingle.mockResolvedValue({
        data: {
          is_enabled: true,
          totp_verified: true,
          sms_enabled: false,
          sms_verified: false,
          email_enabled: false,
          email_verified: false,
          preferred_method: 'totp',
          backup_codes: [],
        },
      });

      const { getAvailable2FAMethods } = require('@/lib/auth/two-factor');
      const methods = await getAvailable2FAMethods('user-123');

      expect(methods).toEqual(['totp']);
    });

    it('returns only sms when only sms enabled and verified', async () => {
      mockSingle.mockResolvedValue({
        data: {
          is_enabled: true,
          totp_verified: false,
          sms_enabled: true,
          sms_verified: true,
          email_enabled: false,
          email_verified: false,
          preferred_method: 'sms',
          backup_codes: [],
        },
      });

      const { getAvailable2FAMethods } = require('@/lib/auth/two-factor');
      const methods = await getAvailable2FAMethods('user-123');

      expect(methods).toEqual(['sms']);
    });
  });

  // ============================================================
  // setPreferred2FAMethod
  // ============================================================
  describe('setPreferred2FAMethod', () => {
    it('updates preferred method in database', async () => {
      const mockUpdateEq = jest.fn();
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      const { setPreferred2FAMethod } = require('@/lib/auth/two-factor');
      await setPreferred2FAMethod('user-123', 'sms');

      expect(mockFrom).toHaveBeenCalledWith('user_two_factor');
      expect(mockUpdate).toHaveBeenCalledWith({ preferred_method: 'sms' });
      expect(mockUpdateEq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('can set totp as preferred method', async () => {
      const mockUpdateEq = jest.fn();
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      const { setPreferred2FAMethod } = require('@/lib/auth/two-factor');
      await setPreferred2FAMethod('user-123', 'totp');

      expect(mockUpdate).toHaveBeenCalledWith({ preferred_method: 'totp' });
    });

    it('can set email as preferred method', async () => {
      const mockUpdateEq = jest.fn();
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      const { setPreferred2FAMethod } = require('@/lib/auth/two-factor');
      await setPreferred2FAMethod('user-123', 'email');

      expect(mockUpdate).toHaveBeenCalledWith({ preferred_method: 'email' });
    });

    it('can set backup as preferred method', async () => {
      const mockUpdateEq = jest.fn();
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      const { setPreferred2FAMethod } = require('@/lib/auth/two-factor');
      await setPreferred2FAMethod('user-123', 'backup');

      expect(mockUpdate).toHaveBeenCalledWith({ preferred_method: 'backup' });
    });
  });

  // ============================================================
  // disableAll2FA
  // ============================================================
  describe('disableAll2FA', () => {
    it('resets all 2FA fields in database', async () => {
      const mockUpdateEq = jest.fn();
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      const { disableAll2FA } = require('@/lib/auth/two-factor');
      await disableAll2FA('user-123');

      expect(mockFrom).toHaveBeenCalledWith('user_two_factor');
      expect(mockUpdate).toHaveBeenCalledWith({
        is_enabled: false,
        totp_secret: null,
        totp_verified: false,
        totp_enabled_at: null,
        sms_enabled: false,
        sms_verified: false,
        sms_phone: null,
        sms_enabled_at: null,
        email_enabled: false,
        email_verified: false,
        email_enabled_at: null,
        backup_codes: null,
        backup_codes_generated_at: null,
        preferred_method: null,
      });
      expect(mockUpdateEq).toHaveBeenCalledWith('user_id', 'user-123');
    });
  });

  // ============================================================
  // updateTwoFactorStatus
  // ============================================================
  describe('updateTwoFactorStatus', () => {
    it('does nothing when no 2FA data exists', async () => {
      mockSingle.mockResolvedValue({ data: null });

      const { updateTwoFactorStatus } = require('@/lib/auth/two-factor');
      await updateTwoFactorStatus('user-123');

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('enables 2FA if totp is verified', async () => {
      mockSingle.mockResolvedValue({
        data: {
          totp_verified: true,
          sms_enabled: false,
          sms_verified: false,
          email_enabled: false,
          email_verified: false,
        },
      });
      const mockUpdateEq = jest.fn();
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      const { updateTwoFactorStatus } = require('@/lib/auth/two-factor');
      await updateTwoFactorStatus('user-123');

      expect(mockUpdate).toHaveBeenCalledWith({ is_enabled: true });
      expect(mockUpdateEq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('enables 2FA if sms is enabled and verified', async () => {
      mockSingle.mockResolvedValue({
        data: {
          totp_verified: false,
          sms_enabled: true,
          sms_verified: true,
          email_enabled: false,
          email_verified: false,
        },
      });
      const mockUpdateEq = jest.fn();
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      const { updateTwoFactorStatus } = require('@/lib/auth/two-factor');
      await updateTwoFactorStatus('user-123');

      expect(mockUpdate).toHaveBeenCalledWith({ is_enabled: true });
    });

    it('enables 2FA if email is enabled and verified', async () => {
      mockSingle.mockResolvedValue({
        data: {
          totp_verified: false,
          sms_enabled: false,
          sms_verified: false,
          email_enabled: true,
          email_verified: true,
        },
      });
      const mockUpdateEq = jest.fn();
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      const { updateTwoFactorStatus } = require('@/lib/auth/two-factor');
      await updateTwoFactorStatus('user-123');

      expect(mockUpdate).toHaveBeenCalledWith({ is_enabled: true });
    });

    it('disables 2FA if no method is active', async () => {
      mockSingle.mockResolvedValue({
        data: {
          totp_verified: false,
          sms_enabled: false,
          sms_verified: false,
          email_enabled: false,
          email_verified: false,
        },
      });
      const mockUpdateEq = jest.fn();
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      const { updateTwoFactorStatus } = require('@/lib/auth/two-factor');
      await updateTwoFactorStatus('user-123');

      expect(mockUpdate).toHaveBeenCalledWith({ is_enabled: false });
    });

    it('disables 2FA if sms enabled but not verified', async () => {
      mockSingle.mockResolvedValue({
        data: {
          totp_verified: false,
          sms_enabled: true,
          sms_verified: false,
          email_enabled: false,
          email_verified: false,
        },
      });
      const mockUpdateEq = jest.fn();
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      const { updateTwoFactorStatus } = require('@/lib/auth/two-factor');
      await updateTwoFactorStatus('user-123');

      expect(mockUpdate).toHaveBeenCalledWith({ is_enabled: false });
    });

    it('disables 2FA if email enabled but not verified', async () => {
      mockSingle.mockResolvedValue({
        data: {
          totp_verified: false,
          sms_enabled: false,
          sms_verified: false,
          email_enabled: true,
          email_verified: false,
        },
      });
      const mockUpdateEq = jest.fn();
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      const { updateTwoFactorStatus } = require('@/lib/auth/two-factor');
      await updateTwoFactorStatus('user-123');

      expect(mockUpdate).toHaveBeenCalledWith({ is_enabled: false });
    });

    it('enables 2FA when multiple methods are active', async () => {
      mockSingle.mockResolvedValue({
        data: {
          totp_verified: true,
          sms_enabled: true,
          sms_verified: true,
          email_enabled: true,
          email_verified: true,
        },
      });
      const mockUpdateEq = jest.fn();
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      const { updateTwoFactorStatus } = require('@/lib/auth/two-factor');
      await updateTwoFactorStatus('user-123');

      expect(mockUpdate).toHaveBeenCalledWith({ is_enabled: true });
    });
  });
});
