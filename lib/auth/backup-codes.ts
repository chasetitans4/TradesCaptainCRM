// =====================================================
// BACKUP CODES FOR 2FA
// One-time use recovery codes when primary 2FA is unavailable
// =====================================================

import { createClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { logSecurityEvent } from './audit';

const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8; // 8 character codes

/**
 * Generate new backup codes for a user
 * Returns the plain-text codes (only shown once)
 */
export async function generateBackupCodes(userId: string): Promise<string[]> {
  const codes: string[] = [];
  const hashedCodes: { hash: string; used_at: null }[] = [];

  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto.randomBytes(BACKUP_CODE_LENGTH / 2).toString('hex').toUpperCase();
    codes.push(code);
    hashedCodes.push({
      hash: await bcrypt.hash(code, 10),
      used_at: null,
    });
  }

  const supabase = await createClient();
  await supabase
    .from('user_two_factor')
    .update({
      backup_codes: hashedCodes,
      backup_codes_generated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  await logSecurityEvent(userId, 'backup_codes_generated', {
    count: BACKUP_CODE_COUNT,
  });

  return codes;
}

/**
 * Verify a backup code
 * Marks the code as used if valid
 */
export async function verifyBackupCode(
  userId: string,
  code: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data: twoFactor } = await supabase
    .from('user_two_factor')
    .select('backup_codes')
    .eq('user_id', userId)
    .single();

  if (!twoFactor?.backup_codes) {
    return false;
  }

  const backupCodes = twoFactor.backup_codes as {
    hash: string;
    used_at: string | null;
  }[];

  for (let i = 0; i < backupCodes.length; i++) {
    const backupCode = backupCodes[i];

    // Skip already used codes
    if (backupCode.used_at) continue;

    const isValid = await bcrypt.compare(code.toUpperCase(), backupCode.hash);

    if (isValid) {
      // Mark code as used
      backupCodes[i].used_at = new Date().toISOString();

      await supabase
        .from('user_two_factor')
        .update({ backup_codes: backupCodes })
        .eq('user_id', userId);

      const remainingCodes = backupCodes.filter((c) => !c.used_at).length;

      await logSecurityEvent(userId, '2fa_success', {
        method: 'backup_code',
        remaining_codes: remainingCodes,
      });

      return true;
    }
  }

  await logSecurityEvent(userId, '2fa_failed', { method: 'backup_code' });
  return false;
}

/**
 * Ensure backup codes exist for user
 * Generates new codes if none exist
 */
export async function ensureBackupCodes(userId: string): Promise<void> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('user_two_factor')
    .select('backup_codes')
    .eq('user_id', userId)
    .single();

  if (!data?.backup_codes) {
    await generateBackupCodes(userId);
  }
}

/**
 * Get count of remaining (unused) backup codes
 */
export async function getRemainingBackupCodesCount(userId: string): Promise<number> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('user_two_factor')
    .select('backup_codes')
    .eq('user_id', userId)
    .single();

  if (!data?.backup_codes) return 0;

  const backupCodes = data.backup_codes as { used_at: string | null }[];
  return backupCodes.filter((c) => !c.used_at).length;
}

/**
 * Check if user should be warned about low backup codes
 */
export async function shouldWarnLowBackupCodes(userId: string): Promise<boolean> {
  const remaining = await getRemainingBackupCodesCount(userId);
  return remaining > 0 && remaining <= 3;
}

/**
 * Regenerate backup codes (invalidates all previous codes)
 */
export async function regenerateBackupCodes(userId: string): Promise<string[]> {
  await logSecurityEvent(userId, 'backup_codes_regenerated', {
    reason: 'user_requested',
  });

  return generateBackupCodes(userId);
}

/**
 * Format backup codes for display (grouped for readability)
 */
export function formatBackupCodesForDisplay(codes: string[]): string[] {
  return codes.map((code) => {
    // Format as XXXX-XXXX for readability
    return `${code.slice(0, 4)}-${code.slice(4)}`;
  });
}
