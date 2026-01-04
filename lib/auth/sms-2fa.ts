// =====================================================
// SMS TWO-FACTOR AUTHENTICATION
// 2FA via SMS text messages
// =====================================================

import { createClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import { generateNumericCode } from '@/lib/crypto';
import { logSecurityEvent } from './audit';
import { ensureBackupCodes } from './backup-codes';
import { smsLogger } from '@/lib/logger';

const CODE_LENGTH = 6;
const CODE_EXPIRY_MINUTES = 10;

/**
 * Generate and send SMS 2FA code
 */
export async function sendSMS2FACode(
  userId: string,
  phone: string
): Promise<void> {
  // Generate 6-digit code
  const code = generateNumericCode(CODE_LENGTH);
  const codeHash = await bcrypt.hash(code, 10);

  const supabase = await createClient();

  // Store hashed code with expiry
  await supabase.from('two_factor_attempts').insert({
    user_id: userId,
    method: 'sms',
    code_hash: codeHash,
    expires_at: new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000).toISOString(),
  });

  // Send SMS via Twilio
  try {
    const { sendSms } = await import('@/lib/sms');
    await sendSms({
      to: phone,
      body: `Your TradesCaptain verification code is: ${code}. It expires in ${CODE_EXPIRY_MINUTES} minutes. Don't share this code with anyone.`,
    });
  } catch (error) {
    smsLogger.error({
      msg: 'Failed to send SMS 2FA code',
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
      userId,
      phone,
    });
  }
}

/**
 * Verify SMS 2FA code
 */
export async function verifySMS2FACode(
  userId: string,
  code: string
): Promise<boolean> {
  const supabase = await createClient();

  // Get recent unexpired codes
  const { data: attempts } = await supabase
    .from('two_factor_attempts')
    .select('*')
    .eq('user_id', userId)
    .eq('method', 'sms')
    .is('success', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(5);

  if (!attempts?.length) {
    return false;
  }

  // Check each recent code
  for (const attempt of attempts) {
    const isValid = await bcrypt.compare(code, attempt.code_hash);

    if (isValid) {
      // Mark as used
      await supabase
        .from('two_factor_attempts')
        .update({ success: true })
        .eq('id', attempt.id);

      await logSecurityEvent(userId, '2fa_success', { method: 'sms' });
      return true;
    }
  }

  await logSecurityEvent(userId, '2fa_failed', { method: 'sms' });
  return false;
}

/**
 * Start SMS 2FA setup
 */
export async function setupSMS2FA(userId: string, phone: string): Promise<void> {
  const supabase = await createClient();

  // Validate phone format (basic validation)
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    throw new Error('Invalid phone number');
  }

  // Send verification code
  await sendSMS2FACode(userId, phone);

  // Store phone (unverified)
  await supabase
    .from('user_two_factor')
    .upsert(
      {
        user_id: userId,
        sms_phone: phone,
        sms_verified: false,
        sms_enabled: false,
      },
      {
        onConflict: 'user_id',
      }
    );
}

/**
 * Verify SMS 2FA setup
 */
export async function verifySMS2FASetup(
  userId: string,
  code: string
): Promise<boolean> {
  const isValid = await verifySMS2FACode(userId, code);

  if (isValid) {
    const supabase = await createClient();

    await supabase
      .from('user_two_factor')
      .update({
        sms_verified: true,
        sms_enabled: true,
        sms_enabled_at: new Date().toISOString(),
        is_enabled: true,
      })
      .eq('user_id', userId);

    // Generate backup codes if first 2FA method
    await ensureBackupCodes(userId);

    await logSecurityEvent(userId, '2fa_enabled', { method: 'sms' });
  }

  return isValid;
}

/**
 * Disable SMS 2FA
 */
export async function disableSMS2FA(userId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('user_two_factor')
    .update({
      sms_enabled: false,
      sms_verified: false,
      sms_phone: null,
      sms_enabled_at: null,
    })
    .eq('user_id', userId);

  // Update overall 2FA status
  await updateTwoFactorStatus(userId);

  await logSecurityEvent(userId, '2fa_disabled', { method: 'sms' });
}

/**
 * Get SMS phone number for user (masked)
 */
export async function getSMSPhoneMasked(userId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('user_two_factor')
    .select('sms_phone')
    .eq('user_id', userId)
    .single();

  if (!data?.sms_phone) return null;

  // Return masked phone: ***-***-1234
  const phone = data.sms_phone.replace(/\D/g, '');
  return `***-***-${phone.slice(-4)}`;
}

/**
 * Check if user has SMS 2FA enabled
 */
export async function hasSMS2FAEnabled(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('user_two_factor')
    .select('sms_enabled, sms_verified')
    .eq('user_id', userId)
    .single();

  return data?.sms_enabled === true && data?.sms_verified === true;
}

/**
 * Update overall 2FA enabled status
 */
async function updateTwoFactorStatus(userId: string): Promise<void> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('user_two_factor')
    .select('totp_verified, sms_enabled, sms_verified, email_enabled, email_verified')
    .eq('user_id', userId)
    .single();

  if (!data) return;

  const hasAnyMethod =
    data.totp_verified ||
    (data.sms_enabled && data.sms_verified) ||
    (data.email_enabled && data.email_verified);

  await supabase
    .from('user_two_factor')
    .update({ is_enabled: hasAnyMethod })
    .eq('user_id', userId);
}
