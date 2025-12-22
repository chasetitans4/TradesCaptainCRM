// =====================================================
// 4-DIGIT PIN SYSTEM
// Quick access when screen is locked
// =====================================================

import { createClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import { logSecurityEvent } from './audit';

const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export interface PINSettings {
  isEnabled: boolean;
  autoLockMinutes: number;
  requirePinFor: string[];
  isLocked: boolean;
  lockedUntil?: string;
}

export interface PINVerifyResult {
  success: boolean;
  locked?: boolean;
  remainingAttempts?: number;
  lockedUntil?: string;
}

/**
 * Set up PIN for user
 */
export async function setupPIN(userId: string, pin: string): Promise<void> {
  // Validate PIN format
  if (!/^\d{4}$/.test(pin)) {
    throw new Error('PIN must be exactly 4 digits');
  }

  // Check for weak PINs
  const weakPins = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321', '0123', '3210'];
  if (weakPins.includes(pin)) {
    throw new Error('This PIN is too easy to guess. Please choose a different PIN.');
  }

  const pinHash = await bcrypt.hash(pin, 10);

  const supabase = await createClient();
  await supabase
    .from('user_pins')
    .upsert(
      {
        user_id: userId,
        pin_hash: pinHash,
        is_enabled: true,
        failed_attempts: 0,
        locked_until: null,
      },
      {
        onConflict: 'user_id',
      }
    );

  await logSecurityEvent(userId, 'pin_set', {});
}

/**
 * Verify PIN
 */
export async function verifyPIN(
  userId: string,
  pin: string
): Promise<PINVerifyResult> {
  const supabase = await createClient();

  const { data: pinData } = await supabase
    .from('user_pins')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!pinData || !pinData.is_enabled) {
    return { success: false };
  }

  // Check if locked out
  if (pinData.locked_until && new Date(pinData.locked_until) > new Date()) {
    return {
      success: false,
      locked: true,
      lockedUntil: pinData.locked_until,
    };
  }

  const isValid = await bcrypt.compare(pin, pinData.pin_hash);

  if (isValid) {
    // Reset failed attempts
    await supabase
      .from('user_pins')
      .update({
        failed_attempts: 0,
        locked_until: null,
        last_used_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return { success: true };
  }

  // Increment failed attempts
  const newFailedAttempts = (pinData.failed_attempts || 0) + 1;
  const shouldLock = newFailedAttempts >= MAX_PIN_ATTEMPTS;
  const lockedUntil = shouldLock
    ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
    : null;

  await supabase
    .from('user_pins')
    .update({
      failed_attempts: newFailedAttempts,
      locked_until: lockedUntil,
    })
    .eq('user_id', userId);

  await logSecurityEvent(userId, 'pin_failed', {
    attempts: newFailedAttempts,
    locked: shouldLock,
  });

  return {
    success: false,
    locked: shouldLock,
    remainingAttempts: shouldLock ? 0 : MAX_PIN_ATTEMPTS - newFailedAttempts,
    lockedUntil: lockedUntil || undefined,
  };
}

/**
 * Change PIN (requires current PIN verification)
 */
export async function changePIN(
  userId: string,
  currentPIN: string,
  newPIN: string
): Promise<{ success: boolean; error?: string }> {
  const verification = await verifyPIN(userId, currentPIN);

  if (!verification.success) {
    if (verification.locked) {
      return { success: false, error: 'Too many failed attempts. Please try again later.' };
    }
    return { success: false, error: 'Current PIN is incorrect' };
  }

  try {
    await setupPIN(userId, newPIN);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Disable PIN
 */
export async function disablePIN(userId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('user_pins')
    .update({ is_enabled: false })
    .eq('user_id', userId);

  await logSecurityEvent(userId, 'pin_disabled', {});
}

/**
 * Get PIN settings
 */
export async function getPINSettings(userId: string): Promise<PINSettings> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('user_pins')
    .select('is_enabled, auto_lock_minutes, require_pin_for, locked_until')
    .eq('user_id', userId)
    .single();

  const isLocked = data?.locked_until
    ? new Date(data.locked_until) > new Date()
    : false;

  return {
    isEnabled: data?.is_enabled || false,
    autoLockMinutes: data?.auto_lock_minutes || 5,
    requirePinFor: data?.require_pin_for || ['unlock'],
    isLocked,
    lockedUntil: isLocked ? data?.locked_until : undefined,
  };
}

/**
 * Update PIN settings
 */
export async function updatePINSettings(
  userId: string,
  settings: {
    autoLockMinutes?: number;
    requirePinFor?: string[];
  }
): Promise<void> {
  const supabase = await createClient();

  const updates: Record<string, any> = {};

  if (settings.autoLockMinutes !== undefined) {
    // Validate auto-lock minutes (1-60)
    if (settings.autoLockMinutes < 1 || settings.autoLockMinutes > 60) {
      throw new Error('Auto-lock time must be between 1 and 60 minutes');
    }
    updates.auto_lock_minutes = settings.autoLockMinutes;
  }

  if (settings.requirePinFor !== undefined) {
    const validOptions = ['unlock', 'sensitive_actions', 'payments'];
    const invalidOptions = settings.requirePinFor.filter(
      (opt) => !validOptions.includes(opt)
    );
    if (invalidOptions.length > 0) {
      throw new Error(`Invalid requirePinFor options: ${invalidOptions.join(', ')}`);
    }
    updates.require_pin_for = settings.requirePinFor;
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from('user_pins').update(updates).eq('user_id', userId);
  }
}

/**
 * Check if PIN is required for an action
 */
export async function isPINRequiredFor(
  userId: string,
  action: 'unlock' | 'sensitive_actions' | 'payments'
): Promise<boolean> {
  const settings = await getPINSettings(userId);

  if (!settings.isEnabled) return false;

  return settings.requirePinFor.includes(action);
}

/**
 * Check if user has PIN set up
 */
export async function hasPINSetup(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('user_pins')
    .select('is_enabled')
    .eq('user_id', userId)
    .single();

  return data?.is_enabled === true;
}

/**
 * Force unlock PIN (admin function)
 */
export async function forceUnlockPIN(userId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('user_pins')
    .update({
      failed_attempts: 0,
      locked_until: null,
    })
    .eq('user_id', userId);

  await logSecurityEvent(userId, 'account_unlocked', { method: 'pin_force_unlock' });
}
