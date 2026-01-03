// =====================================================
// BACKUP CODES TEST SUITE
// Tests for 2FA backup code generation and verification
// =====================================================

import {
  generateBackupCodes,
  verifyBackupCode,
  ensureBackupCodes,
  getRemainingBackupCodesCount,
  shouldWarnLowBackupCodes,
  regenerateBackupCodes,
  formatBackupCodesForDisplay,
} from '@/lib/auth/backup-codes';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
}));

jest.mock('@/lib/auth/audit', () => ({
  logSecurityEvent: jest.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { logSecurityEvent } from '@/lib/auth/audit';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockBcryptHash = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;
const mockBcryptCompare = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;
const mockRandomBytes = crypto.randomBytes as jest.MockedFunction<typeof crypto.randomBytes>;
const mockLogSecurityEvent = logSecurityEvent as jest.MockedFunction<typeof logSecurityEvent>;

describe('backup-codes', () => {
  let mockSupabaseClient: {
    from: jest.Mock;
  };
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockEq: jest.Mock;
  let mockSingle: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Supabase mock chain
    mockSingle = jest.fn();
    mockEq = jest.fn().mockReturnValue({ single: mockSingle });
    mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    mockUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({}) });
    mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
    });

    mockSupabaseClient = {
      from: mockFrom,
    };

    mockCreateClient.mockResolvedValue(mockSupabaseClient as any);
  });

  describe('generateBackupCodes', () => {
    const userId = 'test-user-id';

    beforeEach(() => {
      // Mock randomBytes to return predictable hex values
      let callCount = 0;
      mockRandomBytes.mockImplementation((size: number) => {
        callCount++;
        // Return a buffer that produces a 4-character hex string (8 chars total when uppercased)
        const hexValue = callCount.toString(16).padStart(size * 2, '0');
        return Buffer.from(hexValue, 'hex');
      });

      mockBcryptHash.mockImplementation(async (code: string) => {
        return `hashed_${code}`;
      });
    });

    it('should generate exactly 10 backup codes', async () => {
      const codes = await generateBackupCodes(userId);

      expect(codes).toHaveLength(10);
    });

    it('should generate codes with 8 characters each', async () => {
      const codes = await generateBackupCodes(userId);

      codes.forEach((code) => {
        expect(code).toHaveLength(8);
      });
    });

    it('should generate uppercase alphanumeric codes', async () => {
      const codes = await generateBackupCodes(userId);

      codes.forEach((code) => {
        expect(code).toMatch(/^[A-F0-9]{8}$/);
      });
    });

    it('should hash codes with bcrypt before storing', async () => {
      await generateBackupCodes(userId);

      expect(mockBcryptHash).toHaveBeenCalledTimes(10);
      // Verify bcrypt.hash was called with salt rounds of 10
      mockBcryptHash.mock.calls.forEach((call) => {
        expect(call[1]).toBe(10);
      });
    });

    it('should store hashed codes in user_two_factor table', async () => {
      await generateBackupCodes(userId);

      expect(mockFrom).toHaveBeenCalledWith('user_two_factor');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          backup_codes: expect.arrayContaining([
            expect.objectContaining({
              hash: expect.stringContaining('hashed_'),
              used_at: null,
            }),
          ]),
          backup_codes_generated_at: expect.any(String),
        })
      );
    });

    it('should log security event for backup codes generation', async () => {
      await generateBackupCodes(userId);

      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        userId,
        'backup_codes_generated',
        { count: 10 }
      );
    });

    it('should return plain-text codes (not hashed)', async () => {
      const codes = await generateBackupCodes(userId);

      codes.forEach((code) => {
        expect(code).not.toContain('hashed_');
      });
    });
  });

  describe('verifyBackupCode', () => {
    const userId = 'test-user-id';

    it('should return false when no backup codes exist', async () => {
      mockSingle.mockResolvedValue({ data: null });

      const result = await verifyBackupCode(userId, 'ABCD1234');

      expect(result).toBe(false);
    });

    it('should return false when backup_codes is empty', async () => {
      mockSingle.mockResolvedValue({ data: { backup_codes: null } });

      const result = await verifyBackupCode(userId, 'ABCD1234');

      expect(result).toBe(false);
    });

    it('should skip already used codes', async () => {
      const backupCodes = [
        { hash: 'hash1', used_at: '2024-01-01T00:00:00Z' }, // Already used
        { hash: 'hash2', used_at: null },
      ];

      mockSingle.mockResolvedValue({ data: { backup_codes: backupCodes } });
      mockBcryptCompare.mockResolvedValue(true as never);

      await verifyBackupCode(userId, 'ABCD1234');

      // bcrypt.compare should only be called once (for the unused code)
      expect(mockBcryptCompare).toHaveBeenCalledTimes(1);
      expect(mockBcryptCompare).toHaveBeenCalledWith('ABCD1234', 'hash2');
    });

    it('should mark code as used on successful verification', async () => {
      const backupCodes = [{ hash: 'hash1', used_at: null }];

      mockSingle.mockResolvedValue({ data: { backup_codes: backupCodes } });
      mockBcryptCompare.mockResolvedValue(true as never);

      const result = await verifyBackupCode(userId, 'ABCD1234');

      expect(result).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        backup_codes: expect.arrayContaining([
          expect.objectContaining({
            hash: 'hash1',
            used_at: expect.any(String),
          }),
        ]),
      });
    });

    it('should be case-insensitive (uppercase input)', async () => {
      const backupCodes = [{ hash: 'hash1', used_at: null }];

      mockSingle.mockResolvedValue({ data: { backup_codes: backupCodes } });
      mockBcryptCompare.mockResolvedValue(true as never);

      await verifyBackupCode(userId, 'abcd1234');

      // Should uppercase the code before comparing
      expect(mockBcryptCompare).toHaveBeenCalledWith('ABCD1234', 'hash1');
    });

    it('should log success event on valid code', async () => {
      const backupCodes = [
        { hash: 'hash1', used_at: null },
        { hash: 'hash2', used_at: null },
      ];

      mockSingle.mockResolvedValue({ data: { backup_codes: backupCodes } });
      mockBcryptCompare.mockResolvedValueOnce(true as never);

      await verifyBackupCode(userId, 'ABCD1234');

      expect(mockLogSecurityEvent).toHaveBeenCalledWith(userId, '2fa_success', {
        method: 'backup_code',
        remaining_codes: 1,
      });
    });

    it('should log failure event on invalid code', async () => {
      const backupCodes = [{ hash: 'hash1', used_at: null }];

      mockSingle.mockResolvedValue({ data: { backup_codes: backupCodes } });
      mockBcryptCompare.mockResolvedValue(false as never);

      const result = await verifyBackupCode(userId, 'INVALID1');

      expect(result).toBe(false);
      expect(mockLogSecurityEvent).toHaveBeenCalledWith(userId, '2fa_failed', {
        method: 'backup_code',
      });
    });

    it('should return false when code does not match any hash', async () => {
      const backupCodes = [
        { hash: 'hash1', used_at: null },
        { hash: 'hash2', used_at: null },
      ];

      mockSingle.mockResolvedValue({ data: { backup_codes: backupCodes } });
      mockBcryptCompare.mockResolvedValue(false as never);

      const result = await verifyBackupCode(userId, 'WRONGCOD');

      expect(result).toBe(false);
      expect(mockBcryptCompare).toHaveBeenCalledTimes(2);
    });

    it('should correctly count remaining codes after use', async () => {
      const backupCodes = [
        { hash: 'hash1', used_at: null },
        { hash: 'hash2', used_at: null },
        { hash: 'hash3', used_at: '2024-01-01T00:00:00Z' }, // Already used
      ];

      mockSingle.mockResolvedValue({ data: { backup_codes: backupCodes } });
      mockBcryptCompare.mockResolvedValueOnce(true as never);

      await verifyBackupCode(userId, 'ABCD1234');

      // After using one code, 1 should remain (hash2)
      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        userId,
        '2fa_success',
        expect.objectContaining({
          remaining_codes: 1,
        })
      );
    });
  });

  describe('ensureBackupCodes', () => {
    const userId = 'test-user-id';

    beforeEach(() => {
      mockRandomBytes.mockImplementation((size: number) => {
        return Buffer.from('12345678'.slice(0, size * 2), 'hex');
      });
      mockBcryptHash.mockImplementation(async (code: string) => `hashed_${code}`);
    });

    it('should generate codes if none exist', async () => {
      mockSingle.mockResolvedValue({ data: null });

      await ensureBackupCodes(userId);

      // Should have called generateBackupCodes (which calls update)
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        userId,
        'backup_codes_generated',
        { count: 10 }
      );
    });

    it('should generate codes if backup_codes is null', async () => {
      mockSingle.mockResolvedValue({ data: { backup_codes: null } });

      await ensureBackupCodes(userId);

      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should do nothing if codes already exist', async () => {
      mockSingle.mockResolvedValue({
        data: { backup_codes: [{ hash: 'existing', used_at: null }] },
      });

      await ensureBackupCodes(userId);

      // Should only call from once for the select, not for update
      expect(mockFrom).toHaveBeenCalledTimes(1);
      expect(mockLogSecurityEvent).not.toHaveBeenCalled();
    });
  });

  describe('getRemainingBackupCodesCount', () => {
    const userId = 'test-user-id';

    it('should return 0 when no backup codes exist', async () => {
      mockSingle.mockResolvedValue({ data: null });

      const count = await getRemainingBackupCodesCount(userId);

      expect(count).toBe(0);
    });

    it('should return 0 when backup_codes is null', async () => {
      mockSingle.mockResolvedValue({ data: { backup_codes: null } });

      const count = await getRemainingBackupCodesCount(userId);

      expect(count).toBe(0);
    });

    it('should count only unused codes', async () => {
      const backupCodes = [
        { hash: 'hash1', used_at: null },
        { hash: 'hash2', used_at: '2024-01-01T00:00:00Z' }, // Used
        { hash: 'hash3', used_at: null },
        { hash: 'hash4', used_at: '2024-01-02T00:00:00Z' }, // Used
        { hash: 'hash5', used_at: null },
      ];

      mockSingle.mockResolvedValue({ data: { backup_codes: backupCodes } });

      const count = await getRemainingBackupCodesCount(userId);

      expect(count).toBe(3);
    });

    it('should return 0 when all codes are used', async () => {
      const backupCodes = [
        { hash: 'hash1', used_at: '2024-01-01T00:00:00Z' },
        { hash: 'hash2', used_at: '2024-01-02T00:00:00Z' },
      ];

      mockSingle.mockResolvedValue({ data: { backup_codes: backupCodes } });

      const count = await getRemainingBackupCodesCount(userId);

      expect(count).toBe(0);
    });

    it('should return correct count when no codes are used', async () => {
      const backupCodes = [
        { hash: 'hash1', used_at: null },
        { hash: 'hash2', used_at: null },
        { hash: 'hash3', used_at: null },
      ];

      mockSingle.mockResolvedValue({ data: { backup_codes: backupCodes } });

      const count = await getRemainingBackupCodesCount(userId);

      expect(count).toBe(3);
    });
  });

  describe('shouldWarnLowBackupCodes', () => {
    const userId = 'test-user-id';

    it('should return true when 1 code remaining', async () => {
      const backupCodes = [{ hash: 'hash1', used_at: null }];
      mockSingle.mockResolvedValue({ data: { backup_codes: backupCodes } });

      const result = await shouldWarnLowBackupCodes(userId);

      expect(result).toBe(true);
    });

    it('should return true when 2 codes remaining', async () => {
      const backupCodes = [
        { hash: 'hash1', used_at: null },
        { hash: 'hash2', used_at: null },
      ];
      mockSingle.mockResolvedValue({ data: { backup_codes: backupCodes } });

      const result = await shouldWarnLowBackupCodes(userId);

      expect(result).toBe(true);
    });

    it('should return true when 3 codes remaining', async () => {
      const backupCodes = [
        { hash: 'hash1', used_at: null },
        { hash: 'hash2', used_at: null },
        { hash: 'hash3', used_at: null },
      ];
      mockSingle.mockResolvedValue({ data: { backup_codes: backupCodes } });

      const result = await shouldWarnLowBackupCodes(userId);

      expect(result).toBe(true);
    });

    it('should return false when 0 codes remaining', async () => {
      mockSingle.mockResolvedValue({ data: { backup_codes: [] } });

      const result = await shouldWarnLowBackupCodes(userId);

      expect(result).toBe(false);
    });

    it('should return false when more than 3 codes remaining', async () => {
      const backupCodes = [
        { hash: 'hash1', used_at: null },
        { hash: 'hash2', used_at: null },
        { hash: 'hash3', used_at: null },
        { hash: 'hash4', used_at: null },
      ];
      mockSingle.mockResolvedValue({ data: { backup_codes: backupCodes } });

      const result = await shouldWarnLowBackupCodes(userId);

      expect(result).toBe(false);
    });

    it('should return false when no backup codes exist', async () => {
      mockSingle.mockResolvedValue({ data: null });

      const result = await shouldWarnLowBackupCodes(userId);

      expect(result).toBe(false);
    });

    it('should only count unused codes for warning', async () => {
      const backupCodes = [
        { hash: 'hash1', used_at: null },
        { hash: 'hash2', used_at: null },
        { hash: 'hash3', used_at: '2024-01-01T00:00:00Z' }, // Used
        { hash: 'hash4', used_at: '2024-01-02T00:00:00Z' }, // Used
      ];
      mockSingle.mockResolvedValue({ data: { backup_codes: backupCodes } });

      const result = await shouldWarnLowBackupCodes(userId);

      // Only 2 unused codes, should warn
      expect(result).toBe(true);
    });
  });

  describe('regenerateBackupCodes', () => {
    const userId = 'test-user-id';

    beforeEach(() => {
      mockRandomBytes.mockImplementation((size: number) => {
        return Buffer.from('abcdef12'.slice(0, size * 2), 'hex');
      });
      mockBcryptHash.mockImplementation(async (code: string) => `hashed_${code}`);
    });

    it('should log regeneration security event', async () => {
      await regenerateBackupCodes(userId);

      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        userId,
        'backup_codes_regenerated',
        { reason: 'user_requested' }
      );
    });

    it('should generate new backup codes', async () => {
      const codes = await regenerateBackupCodes(userId);

      expect(codes).toHaveLength(10);
    });

    it('should log both regeneration and generation events', async () => {
      await regenerateBackupCodes(userId);

      expect(mockLogSecurityEvent).toHaveBeenCalledTimes(2);
      expect(mockLogSecurityEvent).toHaveBeenNthCalledWith(
        1,
        userId,
        'backup_codes_regenerated',
        { reason: 'user_requested' }
      );
      expect(mockLogSecurityEvent).toHaveBeenNthCalledWith(
        2,
        userId,
        'backup_codes_generated',
        { count: 10 }
      );
    });

    it('should store new hashed codes replacing old ones', async () => {
      await regenerateBackupCodes(userId);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          backup_codes: expect.any(Array),
          backup_codes_generated_at: expect.any(String),
        })
      );
    });
  });

  describe('formatBackupCodesForDisplay', () => {
    it('should format codes with hyphen in the middle', () => {
      const codes = ['ABCD1234', 'EFGH5678'];

      const formatted = formatBackupCodesForDisplay(codes);

      expect(formatted).toEqual(['ABCD-1234', 'EFGH-5678']);
    });

    it('should handle empty array', () => {
      const formatted = formatBackupCodesForDisplay([]);

      expect(formatted).toEqual([]);
    });

    it('should format single code correctly', () => {
      const codes = ['12345678'];

      const formatted = formatBackupCodesForDisplay(codes);

      expect(formatted).toEqual(['1234-5678']);
    });

    it('should format lowercase codes', () => {
      const codes = ['abcd1234'];

      const formatted = formatBackupCodesForDisplay(codes);

      expect(formatted).toEqual(['abcd-1234']);
    });

    it('should format all 10 codes correctly', () => {
      const codes = [
        'AAAAAAAA',
        'BBBBBBBB',
        'CCCCCCCC',
        'DDDDDDDD',
        'EEEEEEEE',
        'FFFFFFFF',
        'GGGGGGGG',
        'HHHHHHHH',
        'IIIIIIII',
        'JJJJJJJJ',
      ];

      const formatted = formatBackupCodesForDisplay(codes);

      expect(formatted).toHaveLength(10);
      formatted.forEach((code) => {
        expect(code).toMatch(/^[A-Z]{4}-[A-Z]{4}$/);
      });
    });

    it('should preserve original code characters', () => {
      const codes = ['A1B2C3D4'];

      const formatted = formatBackupCodesForDisplay(codes);

      expect(formatted).toEqual(['A1B2-C3D4']);
    });
  });
});
