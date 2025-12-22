// =====================================================
// PASSWORD POLICIES
// Password strength, history, and expiration
// =====================================================

import { createClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import { logSecurityEvent } from './audit';
import { revokeAllSessions } from './sessions';

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventReuse: number; // Number of previous passwords to check
  maxAge?: number; // Days until password expires
}

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'strong' | 'very_strong';
  score: number;
}

const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventReuse: 5,
};

// Common passwords to reject
const COMMON_PASSWORDS = [
  'password',
  'password123',
  '123456',
  '12345678',
  'qwerty',
  'abc123',
  'letmein',
  'welcome',
  'admin',
  'login',
];

/**
 * Validate password against policy
 */
export function validatePassword(
  password: string,
  policy: PasswordPolicy = DEFAULT_POLICY
): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters`);
  } else {
    score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
  }

  // Check for uppercase
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (/[A-Z]/.test(password)) {
    score += 1;
  }

  // Check for lowercase
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else if (/[a-z]/.test(password)) {
    score += 1;
  }

  // Check for numbers
  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else if (/\d/.test(password)) {
    score += 1;
  }

  // Check for special characters
  if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>\-_=+[\]\\;'/`~]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else if (/[!@#$%^&*(),.?":{}|<>\-_=+[\]\\;'/`~]/.test(password)) {
    score += 1;
  }

  // Check for common passwords
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a different password.');
    score = 0;
  }

  // Check for repeated characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password should not contain more than 2 repeated characters');
    score = Math.max(0, score - 1);
  }

  // Determine strength
  let strength: 'weak' | 'fair' | 'strong' | 'very_strong';
  if (score <= 2) strength = 'weak';
  else if (score <= 4) strength = 'fair';
  else if (score <= 6) strength = 'strong';
  else strength = 'very_strong';

  return {
    valid: errors.length === 0,
    errors,
    strength,
    score,
  };
}

/**
 * Check if password was recently used
 */
async function checkPasswordHistory(
  userId: string,
  password: string,
  limit: number
): Promise<boolean> {
  const supabase = await createClient();

  const { data: history } = await supabase
    .from('password_history')
    .select('password_hash')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!history?.length) return false;

  for (const entry of history) {
    if (await bcrypt.compare(password, entry.password_hash)) {
      return true; // Password was used before
    }
  }

  return false;
}

/**
 * Change user password
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  options?: {
    revokeOtherSessions?: boolean;
    policy?: PasswordPolicy;
  }
): Promise<{ success: boolean; error?: string }> {
  const policy = options?.policy || DEFAULT_POLICY;
  const supabase = await createClient();

  // Get current password hash
  const { data: user } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', userId)
    .single();

  if (!user?.password_hash) {
    return { success: false, error: 'User not found' };
  }

  // Verify current password
  const isCurrentValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isCurrentValid) {
    await logSecurityEvent(userId, 'password_change', {
      success: false,
      reason: 'invalid_current',
    });
    return { success: false, error: 'Current password is incorrect' };
  }

  // Validate new password
  const validation = validatePassword(newPassword, policy);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join('. ') };
  }

  // Check password history
  if (policy.preventReuse > 0) {
    const wasUsed = await checkPasswordHistory(userId, newPassword, policy.preventReuse);
    if (wasUsed) {
      return {
        success: false,
        error: `Cannot reuse one of your last ${policy.preventReuse} passwords`,
      };
    }
  }

  // Check if same as current
  if (await bcrypt.compare(newPassword, user.password_hash)) {
    return {
      success: false,
      error: 'New password must be different from current password',
    };
  }

  // Hash new password
  const newHash = await bcrypt.hash(newPassword, 12);

  // Calculate expiration if policy has maxAge
  const expiresAt = policy.maxAge
    ? new Date(Date.now() + policy.maxAge * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Update password
  await supabase
    .from('users')
    .update({
      password_hash: newHash,
      password_changed_at: new Date().toISOString(),
      password_expires_at: expiresAt,
      must_change_password: false,
      failed_login_attempts: 0,
      locked_until: null,
    })
    .eq('id', userId);

  // Add to password history
  await supabase.from('password_history').insert({
    user_id: userId,
    password_hash: newHash,
  });

  // Revoke other sessions if requested (default: true)
  if (options?.revokeOtherSessions !== false) {
    await revokeAllSessions(userId, 'password_change');
  }

  await logSecurityEvent(userId, 'password_change', { success: true });

  return { success: true };
}

/**
 * Check if user's password is expired
 */
export async function isPasswordExpired(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: user } = await supabase
    .from('users')
    .select('password_expires_at, must_change_password')
    .eq('id', userId)
    .single();

  if (!user) return false;

  if (user.must_change_password) return true;

  if (user.password_expires_at) {
    return new Date(user.password_expires_at) < new Date();
  }

  return false;
}

/**
 * Force user to change password on next login
 */
export async function requirePasswordChange(userId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('users')
    .update({ must_change_password: true })
    .eq('id', userId);
}

/**
 * Record failed login attempt
 */
export async function recordFailedLogin(
  userId: string
): Promise<{ locked: boolean; remainingAttempts: number }> {
  const supabase = await createClient();

  const { data: user } = await supabase
    .from('users')
    .select('failed_login_attempts')
    .eq('id', userId)
    .single();

  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MINUTES = 30;

  const newAttempts = (user?.failed_login_attempts || 0) + 1;
  const shouldLock = newAttempts >= MAX_ATTEMPTS;

  await supabase
    .from('users')
    .update({
      failed_login_attempts: newAttempts,
      locked_until: shouldLock
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
        : null,
    })
    .eq('id', userId);

  if (shouldLock) {
    await logSecurityEvent(userId, 'account_locked', {
      reason: 'too_many_failed_logins',
      duration_minutes: LOCKOUT_MINUTES,
    });
  }

  return {
    locked: shouldLock,
    remainingAttempts: shouldLock ? 0 : MAX_ATTEMPTS - newAttempts,
  };
}

/**
 * Reset failed login attempts after successful login
 */
export async function resetFailedLoginAttempts(userId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('users')
    .update({
      failed_login_attempts: 0,
      locked_until: null,
    })
    .eq('id', userId);
}

/**
 * Check if account is locked
 */
export async function isAccountLocked(userId: string): Promise<{
  locked: boolean;
  lockedUntil?: string;
}> {
  const supabase = await createClient();

  const { data: user } = await supabase
    .from('users')
    .select('locked_until')
    .eq('id', userId)
    .single();

  if (!user?.locked_until) {
    return { locked: false };
  }

  const lockedUntil = new Date(user.locked_until);
  if (lockedUntil > new Date()) {
    return { locked: true, lockedUntil: user.locked_until };
  }

  // Lock has expired, clear it
  await supabase
    .from('users')
    .update({ locked_until: null, failed_login_attempts: 0 })
    .eq('id', userId);

  return { locked: false };
}

/**
 * Unlock user account (admin function)
 */
export async function unlockAccount(userId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('users')
    .update({
      locked_until: null,
      failed_login_attempts: 0,
    })
    .eq('id', userId);

  await logSecurityEvent(userId, 'account_unlocked', { method: 'admin' });
}

/**
 * Get password strength indicator color
 */
export function getStrengthColor(strength: 'weak' | 'fair' | 'strong' | 'very_strong'): string {
  switch (strength) {
    case 'weak':
      return 'red';
    case 'fair':
      return 'orange';
    case 'strong':
      return 'blue';
    case 'very_strong':
      return 'green';
  }
}
