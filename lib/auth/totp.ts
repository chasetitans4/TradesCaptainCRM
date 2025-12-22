// =====================================================
// TOTP (TIME-BASED ONE-TIME PASSWORD) - Google Authenticator
// Two-factor authentication using authenticator apps
// =====================================================

import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/crypto';
import { logSecurityEvent } from './audit';
import { generateBackupCodes } from './backup-codes';

// Configure TOTP
authenticator.options = {
  digits: 6,
  step: 30, // 30 second window
  window: 1, // Allow 1 step before/after for clock drift
};

export interface TOTPSetupResult {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
}

/**
 * Generate new TOTP secret for setup
 */
export async function generateTOTPSecret(
  userId: string,
  userEmail: string
): Promise<TOTPSetupResult> {
  const secret = authenticator.generateSecret();

  // Create otpauth URL
  const otpauthUrl = authenticator.keyuri(
    userEmail,
    'TradesCaptain', // App name shown in authenticator
    secret
  );

  // Generate QR code as data URL
  const qrCodeUrl = await QRCode.toDataURL(otpauthUrl, {
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  // Store encrypted secret (not yet verified)
  const supabase = await createClient();
  await supabase
    .from('user_two_factor')
    .upsert(
      {
        user_id: userId,
        totp_secret: encrypt(secret),
        totp_verified: false,
      },
      {
        onConflict: 'user_id',
      }
    );

  return {
    secret,
    qrCodeUrl,
    manualEntryKey: secret, // For manual entry
  };
}

/**
 * Verify TOTP code during initial setup
 */
export async function verifyTOTPSetup(
  userId: string,
  code: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data: twoFactor } = await supabase
    .from('user_two_factor')
    .select('totp_secret')
    .eq('user_id', userId)
    .single();

  if (!twoFactor?.totp_secret) {
    throw new Error('TOTP not set up. Please start setup first.');
  }

  const secret = decrypt(twoFactor.totp_secret);
  const isValid = authenticator.verify({ token: code, secret });

  if (isValid) {
    // Mark as verified and enable
    await supabase
      .from('user_two_factor')
      .update({
        totp_verified: true,
        totp_enabled_at: new Date().toISOString(),
        is_enabled: true,
        preferred_method: 'totp',
      })
      .eq('user_id', userId);

    // Generate backup codes
    await generateBackupCodes(userId);

    // Log security event
    await logSecurityEvent(userId, '2fa_enabled', { method: 'totp' });
  }

  return isValid;
}

/**
 * Verify TOTP code during login
 */
export async function verifyTOTP(userId: string, code: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: twoFactor } = await supabase
    .from('user_two_factor')
    .select('totp_secret, totp_verified')
    .eq('user_id', userId)
    .single();

  if (!twoFactor?.totp_secret || !twoFactor.totp_verified) {
    return false;
  }

  const secret = decrypt(twoFactor.totp_secret);
  const isValid = authenticator.verify({ token: code, secret });

  // Log attempt
  await logSecurityEvent(userId, isValid ? '2fa_success' : '2fa_failed', {
    method: 'totp',
  });

  return isValid;
}

/**
 * Disable TOTP for user
 */
export async function disableTOTP(userId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('user_two_factor')
    .update({
      totp_secret: null,
      totp_verified: false,
      totp_enabled_at: null,
    })
    .eq('user_id', userId);

  // Check if any 2FA method remains
  await updateTwoFactorStatus(userId);

  await logSecurityEvent(userId, '2fa_disabled', { method: 'totp' });
}

/**
 * Check if user has TOTP enabled
 */
export async function hasTOTPEnabled(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('user_two_factor')
    .select('totp_verified')
    .eq('user_id', userId)
    .single();

  return data?.totp_verified === true;
}

/**
 * Update overall 2FA enabled status based on active methods
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
