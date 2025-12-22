// =====================================================
// TWO-FACTOR AUTHENTICATION - MAIN VERIFICATION FLOW
// Unified 2FA verification and status management
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { verifyTOTP } from './totp';
import { verifySMS2FACode, sendSMS2FACode } from './sms-2fa';
import { verifyEmail2FACode, sendEmail2FACode } from './email-2fa';
import { verifyBackupCode, getRemainingBackupCodesCount } from './backup-codes';

export type TwoFactorMethod = 'totp' | 'sms' | 'email' | 'backup';

export interface TwoFactorStatus {
  isEnabled: boolean;
  methods: {
    totp: boolean;
    sms: boolean;
    email: boolean;
  };
  preferredMethod: TwoFactorMethod | null;
  backupCodesRemaining: number;
  smsPhoneMasked?: string;
}

export interface TwoFactorVerifyResult {
  success: boolean;
  error?: string;
  backupCodesRemaining?: number;
}

/**
 * Get user's 2FA status
 */
export async function getTwoFactorStatus(userId: string): Promise<TwoFactorStatus> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('user_two_factor')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!data) {
    return {
      isEnabled: false,
      methods: { totp: false, sms: false, email: false },
      preferredMethod: null,
      backupCodesRemaining: 0,
    };
  }

  const backupCodes = (data.backup_codes || []) as { used_at: string | null }[];
  const backupCodesRemaining = backupCodes.filter((c) => !c.used_at).length;

  // Mask phone number
  let smsPhoneMasked: string | undefined;
  if (data.sms_phone) {
    const phone = data.sms_phone.replace(/\D/g, '');
    smsPhoneMasked = `***-***-${phone.slice(-4)}`;
  }

  return {
    isEnabled: data.is_enabled,
    methods: {
      totp: data.totp_verified === true,
      sms: data.sms_enabled === true && data.sms_verified === true,
      email: data.email_enabled === true && data.email_verified === true,
    },
    preferredMethod: data.preferred_method as TwoFactorMethod | null,
    backupCodesRemaining,
    smsPhoneMasked,
  };
}

/**
 * Check if user requires 2FA verification
 */
export async function requiresTwoFactor(userId: string): Promise<boolean> {
  const status = await getTwoFactorStatus(userId);
  return status.isEnabled;
}

/**
 * Send 2FA code (for SMS/email methods)
 */
export async function send2FACode(
  userId: string,
  method: 'sms' | 'email'
): Promise<void> {
  const supabase = await createClient();

  const { data: user } = await supabase
    .from('users')
    .select('email, phone')
    .eq('id', userId)
    .single();

  const { data: twoFactor } = await supabase
    .from('user_two_factor')
    .select('sms_phone')
    .eq('user_id', userId)
    .single();

  if (method === 'sms') {
    const phone = twoFactor?.sms_phone || user?.phone;
    if (!phone) throw new Error('No phone number configured for SMS 2FA');
    await sendSMS2FACode(userId, phone);
  } else {
    if (!user?.email) throw new Error('No email configured for Email 2FA');
    await sendEmail2FACode(userId, user.email);
  }
}

/**
 * Verify 2FA code
 */
export async function verify2FA(
  userId: string,
  code: string,
  method: TwoFactorMethod
): Promise<TwoFactorVerifyResult> {
  let isValid = false;

  switch (method) {
    case 'totp':
      isValid = await verifyTOTP(userId, code);
      break;
    case 'sms':
      isValid = await verifySMS2FACode(userId, code);
      break;
    case 'email':
      isValid = await verifyEmail2FACode(userId, code);
      break;
    case 'backup':
      isValid = await verifyBackupCode(userId, code);
      break;
    default:
      return { success: false, error: 'Invalid 2FA method' };
  }

  if (isValid) {
    const result: TwoFactorVerifyResult = { success: true };

    // If backup code was used, include remaining count
    if (method === 'backup') {
      result.backupCodesRemaining = await getRemainingBackupCodesCount(userId);
    }

    return result;
  }

  return { success: false, error: 'Invalid verification code' };
}

/**
 * Get available 2FA methods for user
 */
export async function getAvailable2FAMethods(
  userId: string
): Promise<TwoFactorMethod[]> {
  const status = await getTwoFactorStatus(userId);
  const methods: TwoFactorMethod[] = [];

  if (status.methods.totp) methods.push('totp');
  if (status.methods.sms) methods.push('sms');
  if (status.methods.email) methods.push('email');
  if (status.backupCodesRemaining > 0) methods.push('backup');

  return methods;
}

/**
 * Set preferred 2FA method
 */
export async function setPreferred2FAMethod(
  userId: string,
  method: TwoFactorMethod
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('user_two_factor')
    .update({ preferred_method: method })
    .eq('user_id', userId);
}

/**
 * Disable all 2FA methods for user
 * Use with caution - requires re-authentication
 */
export async function disableAll2FA(userId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('user_two_factor')
    .update({
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
    })
    .eq('user_id', userId);
}

/**
 * Update overall 2FA enabled status based on active methods
 */
export async function updateTwoFactorStatus(userId: string): Promise<void> {
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
