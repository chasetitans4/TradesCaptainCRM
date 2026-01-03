// =====================================================
// 4-DIGIT PIN SYSTEM TESTS
// Comprehensive tests for lib/auth/pin.ts
// =====================================================

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock audit logging
jest.mock('@/lib/auth/audit', () => ({
  logSecurityEvent: jest.fn(),
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

describe('setupPIN', () => {
  let setupPIN: typeof import('@/lib/auth/pin').setupPIN;
  let bcrypt: typeof import('bcryptjs');
  let logSecurityEvent: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    bcrypt = require('bcryptjs');
    logSecurityEvent = require('@/lib/auth/audit').logSecurityEvent;

    setupPIN = require('@/lib/auth/pin').setupPIN;

    // Reset mocks
    (bcrypt.hash as jest.Mock).mockReset();
    logSecurityEvent.mockReset();
  });

  it('should throw error for PIN shorter than 4 digits', async () => {
    await expect(setupPIN('user-123', '123'))
      .rejects.toThrow('PIN must be exactly 4 digits');
  });

  it('should throw error for PIN longer than 4 digits', async () => {
    await expect(setupPIN('user-123', '12345'))
      .rejects.toThrow('PIN must be exactly 4 digits');
  });

  it('should throw error for non-numeric PIN', async () => {
    await expect(setupPIN('user-123', '12ab'))
      .rejects.toThrow('PIN must be exactly 4 digits');
  });

  it('should throw error for weak PINs like 0000', async () => {
    await expect(setupPIN('user-123', '0000'))
      .rejects.toThrow('This PIN is too easy to guess');
  });

  it('should throw error for weak PINs like 1111', async () => {
    await expect(setupPIN('user-123', '1111'))
      .rejects.toThrow('This PIN is too easy to guess');
  });

  it('should throw error for weak PINs like 1234', async () => {
    await expect(setupPIN('user-123', '1234'))
      .rejects.toThrow('This PIN is too easy to guess');
  });

  it('should throw error for weak PINs like 4321', async () => {
    await expect(setupPIN('user-123', '4321'))
      .rejects.toThrow('This PIN is too easy to guess');
  });

  it('should accept valid 4-digit PIN', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_pin');
    logSecurityEvent.mockResolvedValue(undefined);

    await expect(setupPIN('user-123', '5839')).resolves.not.toThrow();
  });

  it('should hash the PIN before storing', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_pin');
    logSecurityEvent.mockResolvedValue(undefined);

    await setupPIN('user-123', '7529');

    expect(bcrypt.hash).toHaveBeenCalledWith('7529', 10);
  });

  it('should store PIN in database with correct settings', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_7529');
    logSecurityEvent.mockResolvedValue(undefined);

    await setupPIN('user-123', '7529');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_pins');
    expect(mockSupabaseClient.upsert).toHaveBeenCalledWith(
      {
        user_id: 'user-123',
        pin_hash: 'hashed_7529',
        is_enabled: true,
        failed_attempts: 0,
        locked_until: null,
      },
      {
        onConflict: 'user_id',
      }
    );
  });

  it('should log pin_set security event', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_pin');
    logSecurityEvent.mockResolvedValue(undefined);

    await setupPIN('user-123', '7529');

    expect(logSecurityEvent).toHaveBeenCalledWith('user-123', 'pin_set', {});
  });

  it('should reject all repeated digit PINs', async () => {
    const repeatedPins = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'];

    for (const pin of repeatedPins) {
      await expect(setupPIN('user-123', pin))
        .rejects.toThrow('This PIN is too easy to guess');
    }
  });
});

describe('verifyPIN', () => {
  let verifyPIN: typeof import('@/lib/auth/pin').verifyPIN;
  let bcrypt: typeof import('bcryptjs');
  let logSecurityEvent: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    bcrypt = require('bcryptjs');
    logSecurityEvent = require('@/lib/auth/audit').logSecurityEvent;

    verifyPIN = require('@/lib/auth/pin').verifyPIN;

    // Reset mocks
    (bcrypt.compare as jest.Mock).mockReset();
    logSecurityEvent.mockReset();
  });

  it('should return success false if PIN not found', async () => {
    mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });

    const result = await verifyPIN('user-123', '1234');

    expect(result).toEqual({ success: false });
  });

  it('should return success false if PIN is not enabled', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { pin_hash: 'hashed_pin', is_enabled: false },
      error: null,
    });

    const result = await verifyPIN('user-123', '1234');

    expect(result).toEqual({ success: false });
  });

  it('should return locked if user is locked out', async () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        pin_hash: 'hashed_pin',
        is_enabled: true,
        locked_until: futureDate,
      },
      error: null,
    });

    const result = await verifyPIN('user-123', '1234');

    expect(result).toEqual({
      success: false,
      locked: true,
      lockedUntil: futureDate,
    });
  });

  it('should return success true for correct PIN', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        pin_hash: 'hashed_correct',
        is_enabled: true,
        locked_until: null,
        failed_attempts: 0,
      },
      error: null,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await verifyPIN('user-123', '7529');

    expect(result).toEqual({ success: true });
    expect(bcrypt.compare).toHaveBeenCalledWith('7529', 'hashed_correct');
  });

  it('should reset failed attempts on successful PIN verification', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        pin_hash: 'hashed_correct',
        is_enabled: true,
        locked_until: null,
        failed_attempts: 3,
      },
      error: null,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await verifyPIN('user-123', '7529');

    expect(mockSupabaseClient.update).toHaveBeenCalledWith({
      failed_attempts: 0,
      locked_until: null,
      last_used_at: expect.any(String),
    });
  });

  it('should return success false for incorrect PIN', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        pin_hash: 'hashed_correct',
        is_enabled: true,
        locked_until: null,
        failed_attempts: 0,
      },
      error: null,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    logSecurityEvent.mockResolvedValue(undefined);

    const result = await verifyPIN('user-123', '0000');

    expect(result.success).toBe(false);
  });

  it('should increment failed attempts on incorrect PIN', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        pin_hash: 'hashed_correct',
        is_enabled: true,
        locked_until: null,
        failed_attempts: 2,
      },
      error: null,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    logSecurityEvent.mockResolvedValue(undefined);

    await verifyPIN('user-123', '0000');

    expect(mockSupabaseClient.update).toHaveBeenCalledWith({
      failed_attempts: 3,
      locked_until: null,
    });
  });

  it('should return remaining attempts on failed verification', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        pin_hash: 'hashed_correct',
        is_enabled: true,
        locked_until: null,
        failed_attempts: 2,
      },
      error: null,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    logSecurityEvent.mockResolvedValue(undefined);

    const result = await verifyPIN('user-123', '0000');

    expect(result.remainingAttempts).toBe(2); // 5 - 3 = 2
  });

  it('should lock account after 5 failed attempts', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        pin_hash: 'hashed_correct',
        is_enabled: true,
        locked_until: null,
        failed_attempts: 4,
      },
      error: null,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    logSecurityEvent.mockResolvedValue(undefined);

    const result = await verifyPIN('user-123', '0000');

    expect(result.locked).toBe(true);
    expect(result.remainingAttempts).toBe(0);
    expect(mockSupabaseClient.update).toHaveBeenCalledWith({
      failed_attempts: 5,
      locked_until: expect.any(String),
    });
  });

  it('should set lockout time to 15 minutes', async () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    mockSupabaseClient.single.mockResolvedValue({
      data: {
        pin_hash: 'hashed_correct',
        is_enabled: true,
        locked_until: null,
        failed_attempts: 4,
      },
      error: null,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    logSecurityEvent.mockResolvedValue(undefined);

    await verifyPIN('user-123', '0000');

    const expectedLockout = new Date(now + 15 * 60 * 1000).toISOString();
    expect(mockSupabaseClient.update).toHaveBeenCalledWith({
      failed_attempts: 5,
      locked_until: expectedLockout,
    });

    jest.spyOn(Date, 'now').mockRestore();
  });

  it('should log pin_failed event on failed verification', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        pin_hash: 'hashed_correct',
        is_enabled: true,
        locked_until: null,
        failed_attempts: 2,
      },
      error: null,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    logSecurityEvent.mockResolvedValue(undefined);

    await verifyPIN('user-123', '0000');

    expect(logSecurityEvent).toHaveBeenCalledWith('user-123', 'pin_failed', {
      attempts: 3,
      locked: false,
    });
  });

  it('should log locked status in pin_failed event when account is locked', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        pin_hash: 'hashed_correct',
        is_enabled: true,
        locked_until: null,
        failed_attempts: 4,
      },
      error: null,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    logSecurityEvent.mockResolvedValue(undefined);

    await verifyPIN('user-123', '0000');

    expect(logSecurityEvent).toHaveBeenCalledWith('user-123', 'pin_failed', {
      attempts: 5,
      locked: true,
    });
  });

  it('should allow verification if lockout has expired', async () => {
    const pastDate = new Date(Date.now() - 1000).toISOString();
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        pin_hash: 'hashed_correct',
        is_enabled: true,
        locked_until: pastDate,
        failed_attempts: 5,
      },
      error: null,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await verifyPIN('user-123', '7529');

    expect(result).toEqual({ success: true });
  });
});

describe('changePIN', () => {
  let changePIN: typeof import('@/lib/auth/pin').changePIN;
  let bcrypt: typeof import('bcryptjs');
  let logSecurityEvent: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    bcrypt = require('bcryptjs');
    logSecurityEvent = require('@/lib/auth/audit').logSecurityEvent;

    changePIN = require('@/lib/auth/pin').changePIN;

    // Reset mocks
    (bcrypt.hash as jest.Mock).mockReset();
    (bcrypt.compare as jest.Mock).mockReset();
    logSecurityEvent.mockReset();
  });

  it('should return error if current PIN is incorrect', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        pin_hash: 'hashed_current',
        is_enabled: true,
        locked_until: null,
        failed_attempts: 0,
      },
      error: null,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    logSecurityEvent.mockResolvedValue(undefined);

    const result = await changePIN('user-123', '0000', '5678');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Current PIN is incorrect');
  });

  it('should return error if account is locked', async () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        pin_hash: 'hashed_current',
        is_enabled: true,
        locked_until: futureDate,
        failed_attempts: 5,
      },
      error: null,
    });

    const result = await changePIN('user-123', '1234', '5678');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Too many failed attempts. Please try again later.');
  });

  it('should return error if new PIN is weak', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        pin_hash: 'hashed_current',
        is_enabled: true,
        locked_until: null,
        failed_attempts: 0,
      },
      error: null,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await changePIN('user-123', '7529', '1111');

    expect(result.success).toBe(false);
    expect(result.error).toContain('too easy to guess');
  });

  it('should successfully change PIN', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        pin_hash: 'hashed_current',
        is_enabled: true,
        locked_until: null,
        failed_attempts: 0,
      },
      error: null,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_new');
    logSecurityEvent.mockResolvedValue(undefined);

    const result = await changePIN('user-123', '7529', '8642');

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe('disablePIN', () => {
  let disablePIN: typeof import('@/lib/auth/pin').disablePIN;
  let logSecurityEvent: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    logSecurityEvent = require('@/lib/auth/audit').logSecurityEvent;
    logSecurityEvent.mockReset();

    disablePIN = require('@/lib/auth/pin').disablePIN;
  });

  it('should disable PIN for user', async () => {
    logSecurityEvent.mockResolvedValue(undefined);

    await disablePIN('user-123');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_pins');
    expect(mockSupabaseClient.update).toHaveBeenCalledWith({ is_enabled: false });
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user-123');
  });

  it('should log pin_disabled security event', async () => {
    logSecurityEvent.mockResolvedValue(undefined);

    await disablePIN('user-123');

    expect(logSecurityEvent).toHaveBeenCalledWith('user-123', 'pin_disabled', {});
  });
});

describe('getPINSettings', () => {
  let getPINSettings: typeof import('@/lib/auth/pin').getPINSettings;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    getPINSettings = require('@/lib/auth/pin').getPINSettings;
  });

  it('should return default settings when no record exists', async () => {
    mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });

    const result = await getPINSettings('user-123');

    expect(result).toEqual({
      isEnabled: false,
      autoLockMinutes: 5,
      requirePinFor: ['unlock'],
      isLocked: false,
      lockedUntil: undefined,
    });
  });

  it('should return actual settings from database', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        is_enabled: true,
        auto_lock_minutes: 10,
        require_pin_for: ['unlock', 'sensitive_actions'],
        locked_until: null,
      },
      error: null,
    });

    const result = await getPINSettings('user-123');

    expect(result).toEqual({
      isEnabled: true,
      autoLockMinutes: 10,
      requirePinFor: ['unlock', 'sensitive_actions'],
      isLocked: false,
      lockedUntil: undefined,
    });
  });

  it('should return locked status if lockout is active', async () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        is_enabled: true,
        auto_lock_minutes: 5,
        require_pin_for: ['unlock'],
        locked_until: futureDate,
      },
      error: null,
    });

    const result = await getPINSettings('user-123');

    expect(result.isLocked).toBe(true);
    expect(result.lockedUntil).toBe(futureDate);
  });

  it('should not return locked status if lockout has expired', async () => {
    const pastDate = new Date(Date.now() - 1000).toISOString();
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        is_enabled: true,
        auto_lock_minutes: 5,
        require_pin_for: ['unlock'],
        locked_until: pastDate,
      },
      error: null,
    });

    const result = await getPINSettings('user-123');

    expect(result.isLocked).toBe(false);
    expect(result.lockedUntil).toBeUndefined();
  });
});

describe('updatePINSettings', () => {
  let updatePINSettings: typeof import('@/lib/auth/pin').updatePINSettings;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    updatePINSettings = require('@/lib/auth/pin').updatePINSettings;
  });

  it('should update autoLockMinutes', async () => {
    await updatePINSettings('user-123', { autoLockMinutes: 15 });

    expect(mockSupabaseClient.update).toHaveBeenCalledWith({ auto_lock_minutes: 15 });
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user-123');
  });

  it('should throw error for autoLockMinutes less than 1', async () => {
    await expect(updatePINSettings('user-123', { autoLockMinutes: 0 }))
      .rejects.toThrow('Auto-lock time must be between 1 and 60 minutes');
  });

  it('should throw error for autoLockMinutes greater than 60', async () => {
    await expect(updatePINSettings('user-123', { autoLockMinutes: 61 }))
      .rejects.toThrow('Auto-lock time must be between 1 and 60 minutes');
  });

  it('should update requirePinFor', async () => {
    await updatePINSettings('user-123', { requirePinFor: ['unlock', 'payments'] });

    expect(mockSupabaseClient.update).toHaveBeenCalledWith({
      require_pin_for: ['unlock', 'payments'],
    });
  });

  it('should throw error for invalid requirePinFor options', async () => {
    await expect(updatePINSettings('user-123', { requirePinFor: ['invalid_option'] }))
      .rejects.toThrow('Invalid requirePinFor options: invalid_option');
  });

  it('should accept valid requirePinFor options', async () => {
    await expect(
      updatePINSettings('user-123', { requirePinFor: ['unlock', 'sensitive_actions', 'payments'] })
    ).resolves.not.toThrow();
  });

  it('should not update if no settings provided', async () => {
    await updatePINSettings('user-123', {});

    expect(mockSupabaseClient.update).not.toHaveBeenCalled();
  });

  it('should update both settings at once', async () => {
    await updatePINSettings('user-123', {
      autoLockMinutes: 30,
      requirePinFor: ['unlock', 'sensitive_actions'],
    });

    expect(mockSupabaseClient.update).toHaveBeenCalledWith({
      auto_lock_minutes: 30,
      require_pin_for: ['unlock', 'sensitive_actions'],
    });
  });
});

describe('isPINRequiredFor', () => {
  let isPINRequiredFor: typeof import('@/lib/auth/pin').isPINRequiredFor;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    isPINRequiredFor = require('@/lib/auth/pin').isPINRequiredFor;
  });

  it('should return false if PIN is not enabled', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        is_enabled: false,
        require_pin_for: ['unlock', 'payments'],
      },
      error: null,
    });

    const result = await isPINRequiredFor('user-123', 'payments');

    expect(result).toBe(false);
  });

  it('should return true if action is in requirePinFor list', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        is_enabled: true,
        require_pin_for: ['unlock', 'payments'],
      },
      error: null,
    });

    const result = await isPINRequiredFor('user-123', 'payments');

    expect(result).toBe(true);
  });

  it('should return false if action is not in requirePinFor list', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        is_enabled: true,
        require_pin_for: ['unlock'],
      },
      error: null,
    });

    const result = await isPINRequiredFor('user-123', 'payments');

    expect(result).toBe(false);
  });

  it('should check for unlock action', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        is_enabled: true,
        require_pin_for: ['unlock'],
      },
      error: null,
    });

    const result = await isPINRequiredFor('user-123', 'unlock');

    expect(result).toBe(true);
  });

  it('should check for sensitive_actions action', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        is_enabled: true,
        require_pin_for: ['sensitive_actions'],
      },
      error: null,
    });

    const result = await isPINRequiredFor('user-123', 'sensitive_actions');

    expect(result).toBe(true);
  });
});

describe('hasPINSetup', () => {
  let hasPINSetup: typeof import('@/lib/auth/pin').hasPINSetup;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    hasPINSetup = require('@/lib/auth/pin').hasPINSetup;
  });

  it('should return true when PIN is enabled', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { is_enabled: true },
      error: null,
    });

    const result = await hasPINSetup('user-123');

    expect(result).toBe(true);
  });

  it('should return false when PIN is not enabled', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: { is_enabled: false },
      error: null,
    });

    const result = await hasPINSetup('user-123');

    expect(result).toBe(false);
  });

  it('should return false when no record exists', async () => {
    mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });

    const result = await hasPINSetup('user-123');

    expect(result).toBe(false);
  });

  it('should query the correct table', async () => {
    mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });

    await hasPINSetup('user-123');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_pins');
    expect(mockSupabaseClient.select).toHaveBeenCalledWith('is_enabled');
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user-123');
  });
});

describe('forceUnlockPIN', () => {
  let forceUnlockPIN: typeof import('@/lib/auth/pin').forceUnlockPIN;
  let logSecurityEvent: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockSupabaseClient = createMockSupabaseClient();

    logSecurityEvent = require('@/lib/auth/audit').logSecurityEvent;
    logSecurityEvent.mockReset();

    forceUnlockPIN = require('@/lib/auth/pin').forceUnlockPIN;
  });

  it('should reset failed attempts and clear lock', async () => {
    logSecurityEvent.mockResolvedValue(undefined);

    await forceUnlockPIN('user-123');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_pins');
    expect(mockSupabaseClient.update).toHaveBeenCalledWith({
      failed_attempts: 0,
      locked_until: null,
    });
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user-123');
  });

  it('should log account_unlocked security event', async () => {
    logSecurityEvent.mockResolvedValue(undefined);

    await forceUnlockPIN('user-123');

    expect(logSecurityEvent).toHaveBeenCalledWith('user-123', 'account_unlocked', {
      method: 'pin_force_unlock',
    });
  });
});
