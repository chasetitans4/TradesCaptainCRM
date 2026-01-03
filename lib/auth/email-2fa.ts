// =====================================================
// EMAIL TWO-FACTOR AUTHENTICATION
// 2FA via email verification codes
// =====================================================

import { createClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import { generateNumericCode } from '@/lib/crypto';
import { logSecurityEvent } from './audit';
import { ensureBackupCodes } from './backup-codes';

const CODE_LENGTH = 6;
const CODE_EXPIRY_MINUTES = 15;

/**
 * Generate and send email 2FA code
 */
export async function sendEmail2FACode(
  userId: string,
  email: string
): Promise<void> {
  const code = generateNumericCode(CODE_LENGTH);
  const codeHash = await bcrypt.hash(code, 10);

  const supabase = await createClient();

  // Store hashed code
  await supabase.from('two_factor_attempts').insert({
    user_id: userId,
    method: 'email',
    code_hash: codeHash,
    expires_at: new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000).toISOString(),
  });

  // Send email (import your email helper)
  try {
    const { sendEmail } = await import('@/lib/email');
    await sendEmail({
      to: email,
      subject: 'Your TradesCaptain Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; }
            .code-box { background: #f5f5f5; border-radius: 8px; padding: 30px; text-align: center; margin: 20px 0; }
            .code { font-size: 36px; letter-spacing: 8px; font-family: monospace; font-weight: bold; color: #2563eb; }
            .footer { color: #666; font-size: 14px; margin-top: 30px; }
            .warning { color: #dc2626; font-size: 13px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Verification Code</h2>
            </div>
            <p>Hi there,</p>
            <p>You requested a verification code to sign in to your TradesCaptain account. Enter the code below:</p>
            <div class="code-box">
              <div class="code">${code}</div>
            </div>
            <p>This code will expire in <strong>${CODE_EXPIRY_MINUTES} minutes</strong>.</p>
            <div class="warning">
              <p>⚠️ Never share this code with anyone. TradesCaptain will never ask for your verification code.</p>
            </div>
            <div class="footer">
              <p>If you didn't request this code, you can safely ignore this email. Someone may have entered your email address by mistake.</p>
              <p>— The TradesCaptain Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Your TradesCaptain verification code is: ${code}\n\nThis code expires in ${CODE_EXPIRY_MINUTES} minutes.\n\nIf you didn't request this code, please ignore this email.`,
    });
  } catch (error) {
    // Email sending failed - code was still stored in database
    // In production, this should trigger an alert to ops team
    console.error('Failed to send email 2FA code:', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Verify email 2FA code
 */
export async function verifyEmail2FACode(
  userId: string,
  code: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data: attempts } = await supabase
    .from('two_factor_attempts')
    .select('*')
    .eq('user_id', userId)
    .eq('method', 'email')
    .is('success', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(5);

  if (!attempts?.length) {
    return false;
  }

  for (const attempt of attempts) {
    const isValid = await bcrypt.compare(code, attempt.code_hash);

    if (isValid) {
      await supabase
        .from('two_factor_attempts')
        .update({ success: true })
        .eq('id', attempt.id);

      await logSecurityEvent(userId, '2fa_success', { method: 'email' });
      return true;
    }
  }

  await logSecurityEvent(userId, '2fa_failed', { method: 'email' });
  return false;
}

/**
 * Start email 2FA setup
 */
export async function setupEmail2FA(userId: string, email: string): Promise<void> {
  await sendEmail2FACode(userId, email);

  const supabase = await createClient();
  await supabase
    .from('user_two_factor')
    .upsert(
      {
        user_id: userId,
        email_enabled: false,
        email_verified: false,
      },
      {
        onConflict: 'user_id',
      }
    );
}

/**
 * Verify email 2FA setup
 */
export async function verifyEmail2FASetup(
  userId: string,
  code: string
): Promise<boolean> {
  const isValid = await verifyEmail2FACode(userId, code);

  if (isValid) {
    const supabase = await createClient();
    await supabase
      .from('user_two_factor')
      .update({
        email_verified: true,
        email_enabled: true,
        email_enabled_at: new Date().toISOString(),
        is_enabled: true,
      })
      .eq('user_id', userId);

    await ensureBackupCodes(userId);
    await logSecurityEvent(userId, '2fa_enabled', { method: 'email' });
  }

  return isValid;
}

/**
 * Disable email 2FA
 */
export async function disableEmail2FA(userId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('user_two_factor')
    .update({
      email_enabled: false,
      email_verified: false,
      email_enabled_at: null,
    })
    .eq('user_id', userId);

  // Update overall 2FA status
  await updateTwoFactorStatus(userId);

  await logSecurityEvent(userId, '2fa_disabled', { method: 'email' });
}

/**
 * Check if user has email 2FA enabled
 */
export async function hasEmail2FAEnabled(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('user_two_factor')
    .select('email_enabled, email_verified')
    .eq('user_id', userId)
    .single();

  return data?.email_enabled === true && data?.email_verified === true;
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
